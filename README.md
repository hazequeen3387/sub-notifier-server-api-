# Node.js Webhook Server (Sub Notifier)

## Quickstart
1. `npm install`
2. Edit `config.json` (set webhook_secret, minecraft.host, minecraft.port, minecraft.secret, discord token, channelId)
3. `node server.js`

## Endpoints
- `POST /webhook` — erwartet JSON mit header `x-webhook-secret` (oder body.secret)
  - subscription payload example: `{"type":"subscription","name":"User","totalSubs":123}`
  - donation payload example: `{"type":"donation","name":"User","amount":5,"currency":"EUR","message":"Nice stream"}`
- `GET /stats` — gibt aktuelle gespeicherte stats als JSON zurück
