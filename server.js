import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";
import fs from "fs";
import { Client, GatewayIntentBits } from "discord.js";

const cfgPath = "./config.json";
if (!fs.existsSync(cfgPath)) {
  console.error("config.json nicht gefunden. Bitte erstelle config.json basierend auf config.json.template");
  process.exit(1);
}
const config = JSON.parse(fs.readFileSync(cfgPath));

const app = express();
app.use(bodyParser.json());

const minecraftUrl = `http://${config.minecraft.host}:${config.minecraft.port}/sub`;
const pluginSecret = config.minecraft.secret;

// Discord client (optional)
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });
if (config.discord && config.discord.token) {
  client.login(config.discord.token).catch(e => {
    console.error("Discord login error:", e.message);
  });
  client.on("ready", () => {
    console.log("Discord Bot ready:", client.user.tag);
  });
}

// Load or init stats
const statsFile = "./stats.json";
let stats = {
  totalSubs: 0,
  lastSub: "—",
  lastDonationName: "—",
  lastDonationAmount: 0,
  topDonorName: "—",
  topDonorAmount: 0,
  totalDonations: 0
};
if (fs.existsSync(statsFile)) {
  try { stats = JSON.parse(fs.readFileSync(statsFile)); } catch(e){ console.warn("Unable to load stats.json, using defaults."); }
}

function saveStats() {
  fs.writeFileSync(statsFile, JSON.stringify(stats, null, 2));
}

async function sendToMinecraft(payload) {
  try {
    await fetch(minecraftUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-PLUGIN-SECRET": pluginSecret
      },
      body: JSON.stringify(payload)
    });
  } catch (e) {
    console.warn("Fehler beim Senden an Minecraft:", e.message);
  }
}

async function sendToDiscord(message) {
  if (!config.discord || !config.discord.channelId) return;
  try {
    const channel = await client.channels.fetch(config.discord.channelId);
    if (channel && channel.isTextBased && channel.isTextBased()) {
      channel.send(message).catch(e => console.warn("Discord send failed:", e.message));
    }
  } catch (e) {
    console.warn("Discord message failed:", e.message);
  }
}

app.post("/webhook", async (req, res) => {
  const secret = req.headers["x-webhook-secret"] || req.body.secret;
  if (!secret || secret !== config.webhook_secret) {
    return res.status(403).send("Forbidden");
  }

  const type = (req.body.type || "subscription").toString();

  if (type === "subscription") {
    const name = req.body.name || "Unknown";
    const total = Number(req.body.totalSubs) || (stats.totalSubs + 1);
    stats.totalSubs = total;
    stats.lastSub = name;
    saveStats();

    // send to minecraft plugin
    await sendToMinecraft({ type: "subscription", name: name, totalSubs: stats.totalSubs });

    // send to discord
    await sendToDiscord(`📢 **${name}** hat gerade abonniert! (Total: ${stats.totalSubs})`);

    console.log("Subscription handled:", name, stats.totalSubs);
    return res.sendStatus(200);
  } else if (type === "donation" || type === "tip" || type === "donate") {
    const name = req.body.name || "Unknown";
    const amount = Number(req.body.amount) || 0;
    const currency = req.body.currency || "EUR";
    const message = req.body.message || "";

    stats.totalDonations = Number((stats.totalDonations || 0) + amount);
    stats.lastDonationName = name;
    stats.lastDonationAmount = amount;

    if (!stats.topDonorAmount || amount > stats.topDonorAmount) {
      stats.topDonorAmount = amount;
      stats.topDonorName = name;
    }

    saveStats();

    // send to minecraft plugin
    await sendToMinecraft({ type: "donation", name: name, amount: amount, currency: currency, message: message });

    // send to discord
    await sendToDiscord(`💰 **${name}** hat ${amount} ${currency} gespendet! "${message}"`);

    console.log("Donation handled:", name, amount, currency);
    return res.sendStatus(200);
  } else {
    console.log("Unknown event type:", type);
    return res.status(400).send("Unknown event type");
  }
});

// Simple debug endpoint to view stats
app.get("/stats", (req, res) => {
  res.json(stats);
});

const port = config.server_port || 3000;
app.listen(port, () => console.log("Webhook Server läuft auf Port", port));
