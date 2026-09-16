import 'dotenv/config';
import { Client, GatewayIntentBits } from 'discord.js';
import { createDutyCommandDefinition } from '../src/commands.js';

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

const guildId = process.env.DISCORD_GUILD_ID;
const token = process.env.DISCORD_BOT_TOKEN;

if (!guildId || !token) {
  throw new Error('DISCORD_GUILD_ID and DISCORD_BOT_TOKEN must be set before registering commands.');
}

const commands = createDutyCommandDefinition();

client.once('ready', async () => {
  try {
    await client.application.commands.set(commands, guildId);
    console.log('Slash commands registered successfully.');
  } catch (error) {
    console.error('Failed to register slash commands:', error);
  } finally {
    process.exit(0);
  }
});

client.login(token);
