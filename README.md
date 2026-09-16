# VEXON Discord Bot

Separate Discord bot and API service for the VEXON website. It keeps the Discord bot token off Vercel and exposes only selected staff profile data and server statistics.

## Setup

1. Create a Discord application and bot in the [Discord Developer Portal](https://discord.com/developers/applications).
2. Invite the bot to the VEXON server with the `bot` scope and permission to view the server and members.
3. Enable the Server Members Intent in the bot settings if Discord requires it.
4. Copy `.env.example` to `.env` and fill in the values.
5. Install and run:

```powershell
npm install
npm start
```

## API

- `GET /health`
- `GET /api/staff` with `x-api-key: BOT_API_KEY`
- `GET /api/stats` with `x-api-key: BOT_API_KEY`

Deploy this as a long-running Node service on Railway, Render, Fly.io, or a VPS. Vercel serverless functions are not suitable for the persistent Discord gateway connection.
