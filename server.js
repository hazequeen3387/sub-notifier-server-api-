import express from 'express';
import bodyParser from 'body-parser';
import { Client, GatewayIntentBits } from 'discord.js';

const app = express();
app.use(bodyParser.json());

// Werte ausschließlich aus Umgebungsvariablen
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
const MINECRAFT_HOST = process.env.MINECRAFT_HOST || '127.0.0.1';
const MINECRAFT_PORT = process.env.MINECRAFT_PORT || 8081;
const MINECRAFT_SECRET = process.env.MINECRAFT_SECRET;
const SERVER_PORT = process.env.SERVER_PORT || 3000;

// Check, ob alle wichtigen Variablen gesetzt sind
if (!DISCORD_BOT_TOKEN || !DISCORD_CHANNEL_ID || !WEBHOOK_SECRET) {
  console.error('⚠️ Bitte Umgebungsvariablen setzen: DISCORD_BOT_TOKEN, DISCORD_CHANNEL_ID, WEBHOOK_SECRET');
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

client.once('ready', () => {
  console.log(`Discord-Bot ist online als ${client.user.tag}`);
});

client.login(DISCORD_BOT_TOKEN).catch(console.error);

app.post('/webhook', (req, res) => {
  const data = req.body;

  if (!data.secret || data.secret !== WEBHOOK_SECRET) {
    return res.status(403).send('Forbidden: falsches Secret');
  }

  if (data.type === 'subscription') {
    const channel = client.channels.cache.get(DISCORD_CHANNEL_ID);
    if (channel) {
      channel.send(`[PLUGINNAME] Neuer Abo von: ${data.name}`);
    } else {
      console.warn('Channel nicht gefunden:', DISCORD_CHANNEL_ID);
    }
  }

  if (data.type === 'donation') {
    const channel = client.channels.cache.get(DISCORD_CHANNEL_ID);
    if (channel) {
      channel.send(`[PLUGINNAME] Neue Spende von: ${data.name} - Betrag: ${data.amount}`);
    }
  }

  res.status(200).send('Webhook empfangen');
});

app.listen(SERVER_PORT, () => {
  console.log(`Server läuft auf Port ${SERVER_PORT}`);
});
