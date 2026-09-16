import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { Client, GatewayIntentBits } from 'discord.js';

const required = ['DISCORD_BOT_TOKEN', 'DISCORD_GUILD_ID', 'BOT_API_KEY'];
const missing = required.filter((name) => !process.env[name]);
if (missing.length) {
  throw new Error(`Missing environment variables: ${missing.join(', ')}`);
}

const parseStaffIds = () => {
  try {
    return JSON.parse(process.env.DISCORD_STAFF_IDS || '{}');
  } catch {
    throw new Error('DISCORD_STAFF_IDS must be valid JSON');
  }
};

const staffIds = parseStaffIds();
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildPresences],
});
const app = express();
const port = Number(process.env.PORT || 8787);

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));

const authorized = (request, response, next) => {
  if (request.get('x-api-key') !== process.env.BOT_API_KEY) {
    return response.status(401).json({ error: 'Unauthorized' });
  }
  return next();
};

const getGuild = () => client.guilds.cache.get(process.env.DISCORD_GUILD_ID);

app.get('/health', (_request, response) => {
  response.json({ online: client.isReady(), bot: client.user?.tag || null });
});

app.get('/api/staff', authorized, async (_request, response) => {
  const guild = getGuild();
  if (!guild) return response.status(503).json({ error: 'Discord guild is not available' });

  const members = await Promise.all(Object.entries(staffIds).map(async ([name, userId]) => {
    try {
      const member = await guild.members.fetch(userId);
      return {
        name,
        userId,
        username: member.user.username,
        displayName: member.displayName,
        avatarUrl: member.displayAvatarURL({ size: 256, extension: 'png' }),
        roles: member.roles.cache.filter((role) => role.id !== guild.id).map((role) => role.name),
        status: member.presence?.status || 'offline',
      };
    } catch {
      return { name, userId, unavailable: true };
    }
  }));

  return response.json({ staff: members });
});

app.get('/api/stats', authorized, (_request, response) => {
  const guild = getGuild();
  if (!guild) return response.status(503).json({ error: 'Discord guild is not available' });
  const onlineMembers = guild.presences.cache.filter((presence) => presence.status !== 'offline').size;
  return response.json({ members: guild.memberCount, onlineMembers });
});

client.once('ready', () => {
  console.log(`Discord bot ready as ${client.user.tag}`);
  console.log(`API listening on port ${port}`);
});

app.listen(port);
client.login(process.env.DISCORD_BOT_TOKEN);
