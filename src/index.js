import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { Client, GatewayIntentBits } from 'discord.js';
import { createDutyEmbed, createDutyBoardEmbed, DUTY_STATUSES, createLoaDecisionMessage } from './staffDuty.js';
import { STAFF_ROLE_IDS, LOA_APPROVER_ROLE_IDS, createModerationEmbed, hasAnyRole, parseDurationToMs, formatDuration } from './moderation.js';
import { createDutyCommandDefinition } from './commands.js';
import {
  botMoods,
  funFacts,
  pickRandom,
  secretReplies,
  quotes,
  memes,
  askResponses,
  coinFlip,
  getLuckyNumber,
  rollDice,
} from './features.js';

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
const staffDutyStatus = new Map();
const warningStore = new Map();
let dutyBoardMessageId = null;
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
  ],
});
const app = express();
const port = Number(process.env.PORT || 8787);

const dutyCommands = createDutyCommandDefinition();

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));

const authorized = (request, response, next) => {
  if (request.get('x-api-key') !== process.env.BOT_API_KEY) {
    return response.status(401).json({ error: 'Unauthorized' });
  }
  return next();
};

const getGuild = () => client.guilds.cache.get(process.env.DISCORD_GUILD_ID);

const isStaffMember = (member) => {
  if (!member) return false;
  const staffMemberIds = Object.values(staffIds);
  if (staffMemberIds.includes(member.id)) return true;
  return hasAnyRole(member, STAFF_ROLE_IDS) || member.roles.cache.some((role) => /staff|admin|moderator/i.test(role.name));
};

const canApproveLOA = (member) => {
  if (!member) return false;
  return hasAnyRole(member, LOA_APPROVER_ROLE_IDS);
};

const getLogChannel = (guild) => {
  const configuredChannelId = process.env.DISCORD_MOD_LOG_CHANNEL_ID;
  if (!configuredChannelId || !guild) return null;
  return guild.channels.cache.get(configuredChannelId) || null;
};

const getLoaLogChannel = (guild) => {
  const configuredChannelId = process.env.DISCORD_LOA_LOG_CHANNEL_ID;
  if (!configuredChannelId || !guild) return null;
  return guild.channels.cache.get(configuredChannelId) || null;
};

const getSuggestionChannel = (guild) => {
  const configuredChannelId = process.env.DISCORD_SUGGESTION_CHANNEL_ID;
  if (!configuredChannelId || !guild) return null;
  return guild.channels.cache.get(configuredChannelId) || null;
};

const getTwitchChannel = (guild) => {
  const configuredChannelId = process.env.DISCORD_TWITCH_CHANNEL_ID || '866528537992495161';
  if (!guild) return null;
  return guild.channels.cache.get(configuredChannelId) || null;
};

const getTwitchRolePing = () => {
  return process.env.DISCORD_TWITCH_ROLE_ID || '866528537469124697';
};

const getDutyChannel = (context) => {
  const configuredChannelId = process.env.DISCORD_STAFF_CHANNEL_ID;
  if (!configuredChannelId) return context.channel;
  const guild = context.guild || getGuild();
  if (!guild) return context.channel;
  return guild.channels.cache.get(configuredChannelId) || context.channel;
};

const getDutyBoardEmbed = () => {
  const board = {
    onDuty: [],
    offDuty: [],
    loa: [],
  };

  for (const [userId, dutyRecord] of staffDutyStatus.entries()) {
    const label = `<@${userId}>`;
    const status = dutyRecord.status || DUTY_STATUSES.OFF_DUTY;

    if (status === DUTY_STATUSES.ON_DUTY) {
      board.onDuty.push(label);
    } else if (status === DUTY_STATUSES.LOA) {
      board.loa.push(label);
    } else {
      board.offDuty.push(label);
    }
  }

  return createDutyBoardEmbed({
    onDuty: board.onDuty,
    offDuty: board.offDuty,
    loa: board.loa,
    updatedAt: new Date().toISOString(),
  });
};

const isValidLoaDate = (date) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsedDate = new Date(`${date}T00:00:00Z`);
  return !Number.isNaN(parsedDate.getTime()) && parsedDate.toISOString().startsWith(date);
};

const getDutyBoardChannel = () => {
  const guild = getGuild();
  const configuredChannelId = process.env.DISCORD_STAFF_CHANNEL_ID;
  if (!guild || !configuredChannelId) return null;
  return guild.channels.cache.get(configuredChannelId) || null;
};

const refreshDutyBoard = async () => {
  const boardChannel = getDutyBoardChannel();
  if (!boardChannel) return;

  const boardEmbed = getDutyBoardEmbed();

  try {
    if (dutyBoardMessageId) {
      const message = await boardChannel.messages.fetch(dutyBoardMessageId);
      await message.edit({ embeds: [boardEmbed] });
      return;
    }

    const sentMessage = await boardChannel.send({ embeds: [boardEmbed] });
    dutyBoardMessageId = sentMessage.id;
  } catch {
    const sentMessage = await boardChannel.send({ embeds: [boardEmbed] });
    dutyBoardMessageId = sentMessage.id;
  }
};

const replyWithDutyEmbed = async (interaction, status, reason, memberDisplayName, date) => {
  const record = {
    status,
    reason,
    date,
    updatedAt: new Date().toISOString(),
  };
  staffDutyStatus.set(interaction.user.id, record);

  const embed = createDutyEmbed({
    name: memberDisplayName || interaction.user.username,
    status,
    reason,
    date,
    updatedAt: record.updatedAt,
  });

  await interaction.reply({ embeds: [embed] });

  const dutyChannel = getDutyChannel(interaction);
  if (dutyChannel && dutyChannel.id !== interaction.channelId) {
    await dutyChannel.send({ embeds: [embed] }).catch(() => {});
  }

  await refreshDutyBoard();
};

const logModerationAction = async (guild, embed) => {
  const modLogChannel = getLogChannel(guild);
  if (!modLogChannel) return;
  await modLogChannel.send({ embeds: [embed] }).catch(() => {});
};

const announceLoaDecision = async (interaction, member, decision, overrideReason, overrideDate) => {
  if (!interaction.guild || !member) {
    await interaction.reply({ content: 'This action can only be used in a server.', ephemeral: true });
    return;
  }

  if (!canApproveLOA(interaction.member)) {
    await interaction.reply({ content: 'Only LOA approvers can approve or reject LOA requests.', ephemeral: true });
    return;
  }

  const currentStatus = staffDutyStatus.get(member.id);
  const existingReason = currentStatus?.reason || 'No reason provided';
  const existingDate = currentStatus?.date || overrideDate || 'Not provided';
  const finalReason = overrideReason?.trim() || existingReason;
  const finalDate = overrideDate?.trim() || existingDate;

  if (!currentStatus || currentStatus.status !== DUTY_STATUSES.LOA) {
    await interaction.reply({ content: `${member} does not currently have an active LOA request.`, ephemeral: true });
    return;
  }

  const decisionText = decision === 'approve' ? 'approved' : 'rejected';
  const message = createLoaDecisionMessage({
    memberName: member.displayName || member.user.username,
    returnDate: finalDate,
    reason: finalReason,
    decision: decisionText,
    reviewedBy: interaction.member.displayName || interaction.user.username,
  });

  const loaLogChannel = getLoaLogChannel(interaction.guild);
  if (loaLogChannel) {
    await loaLogChannel.send({ content: message }).catch(() => {});
  }

  const responseContent = decision === 'approve'
    ? `${member} has been approved for LOA and returned to the staff board.`
    : `${member} LOA has been rejected.`;

  if (decision === 'approve') {
    staffDutyStatus.set(member.id, {
      status: DUTY_STATUSES.OFF_DUTY,
      reason: `LOA approved: ${finalReason}`,
      date: finalDate,
      updatedAt: new Date().toISOString(),
    });
  } else {
    staffDutyStatus.set(member.id, {
      status: DUTY_STATUSES.OFF_DUTY,
      reason: `LOA rejected: ${finalReason}`,
      date: finalDate,
      updatedAt: new Date().toISOString(),
    });
  }

  await interaction.reply({ content: responseContent });
  await refreshDutyBoard();
};

const handleFunCommand = async (interaction) => {
  const commandName = interaction.commandName;

  switch (commandName) {
    case 'fact': {
      await interaction.reply({ content: pickRandom(funFacts) });
      return;
    }
    case 'quote': {
      await interaction.reply({ content: pickRandom(quotes) });
      return;
    }
    case 'meme': {
      await interaction.reply({ content: pickRandom(memes) });
      return;
    }
    case 'secret': {
      await interaction.reply({ content: pickRandom(secretReplies) });
      return;
    }
    case 'mood': {
      await interaction.reply({ content: pickRandom(botMoods) });
      return;
    }
    case 'coinflip': {
      await interaction.reply({ content: `Coin flip: ${coinFlip()}` });
      return;
    }
    case 'dice': {
      const sides = interaction.options.getInteger('sides') || 6;
      await interaction.reply({ content: `🎲 You rolled a ${rollDice(sides)} on a ${sides}-sided die.` });
      return;
    }
    case 'lucky': {
      await interaction.reply({ content: `🍀 Your lucky number is: ${getLuckyNumber()}` });
      return;
    }
    case 'ask': {
      const question = interaction.options.getString('question') || 'The void asks a question.';
      await interaction.reply({ content: `❓ ${question}\n${pickRandom(askResponses)}` });
      return;
    }
    case 'info': {
      const user = interaction.options.getUser('user') || interaction.user;
      const member = interaction.options.getMember('user') || interaction.member;
      const userInfo = [
        `User: ${user.tag}`,
        `ID: ${user.id}`,
        `Joined server: ${member?.joinedAt ? new Date(member.joinedAt).toLocaleDateString() : 'Unknown'}`,
      ];
      await interaction.reply({ content: userInfo.join('\n') });
      return;
    }
    case 'server': {
      if (!interaction.guild) {
        await interaction.reply({ content: 'This only works in a guild.', ephemeral: true });
        return;
      }

      const serverInfo = [
        `Server: ${interaction.guild.name}`,
        `Members: ${interaction.guild.memberCount}`,
        `Owner: ${interaction.guild.ownerId ? `<@${interaction.guild.ownerId}>` : 'Unknown'}`,
      ];
      await interaction.reply({ content: serverInfo.join('\n') });
      return;
    }
    case 'poll': {
      const question = interaction.options.getString('question');
      const options = (interaction.options.getString('options') || '')
        .split(',')
        .map((option) => option.trim())
        .filter(Boolean);
      const pollText = options.length ? options.map((option, index) => `${index + 1}. ${option}`).join('\n') : 'No options provided';
      await interaction.reply({ content: `📊 Poll: ${question}\n${pollText}` });
      return;
    }
    case 'suggest': {
      const suggestion = interaction.options.getString('suggestion');
      const channel = getSuggestionChannel(interaction.guild);
      if (!channel) {
        await interaction.reply({ content: 'Suggestion channel is not configured yet.', ephemeral: true });
        return;
      }
      await channel.send({ content: `💡 New suggestion from <@${interaction.user.id}>:\n${suggestion}` });
      await interaction.reply({ content: 'Suggestion sent.' });
      return;
    }
    case 'announce': {
      if (!interaction.guild) {
        await interaction.reply({ content: 'This command requires a guild.', ephemeral: true });
        return;
      }

      const message = interaction.options.getString('message');
      await interaction.reply({ content: `📣 Announcement posted by <@${interaction.user.id}>:\n${message}` });
      return;
    }
    case 'twitch': {
      const title = interaction.options.getString('title');
      const url = interaction.options.getString('url');
      const channel = getTwitchChannel(interaction.guild);
      if (!channel) {
        await interaction.reply({ content: 'Twitch announcement channel is unavailable.', ephemeral: true });
        return;
      }

      const roleMention = `<@&${getTwitchRolePing()}>`;
      const content = `🎮 ${roleMention} ${interaction.user} is live on Twitch!\n${title}\n${url}`;
      await channel.send({ content });
      await interaction.reply({ content: 'Twitch live announcement sent.' });
      return;
    }
    default: {
      await interaction.reply({ content: 'That fun command is not available yet.', ephemeral: true });
    }
  }
};

const handleModerationCommand = async (interaction) => {
  if (!interaction.guild) {
    await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
    return;
  }

  if (!isStaffMember(interaction.member)) {
    await interaction.reply({ content: 'You do not have permission to use moderation commands.', ephemeral: true });
    return;
  }

  const target = interaction.options.getMember('member');
  const reason = interaction.options.getString('reason') || 'No reason provided';

  if (!target) {
    await interaction.reply({ content: 'That member could not be found.', ephemeral: true });
    return;
  }

  if (target.id === interaction.user.id) {
    await interaction.reply({ content: 'You cannot moderate yourself.', ephemeral: true });
    return;
  }

  if (target.roles.highest && interaction.member.roles.highest && target.roles.highest.position >= interaction.member.roles.highest.position) {
    await interaction.reply({ content: 'You cannot moderate someone with an equal or higher role than you.', ephemeral: true });
    return;
  }

  const commandName = interaction.commandName;

  if (commandName === 'warn') {
    const key = `${interaction.guild.id}:${target.id}`;
    const warnings = warningStore.get(key) || [];
    const nextWarnings = [...warnings, { moderatorId: interaction.user.id, reason, at: new Date().toISOString() }];
    warningStore.set(key, nextWarnings);

    const embed = createModerationEmbed({
      title: 'Warning Issued',
      user: target.user,
      moderator: interaction.user,
      reason,
      extraFields: [{ name: 'Warning Count', value: String(nextWarnings.length), inline: true }],
    });

    await interaction.reply({ embeds: [embed] });
    await logModerationAction(interaction.guild, embed);
    return;
  }

  if (commandName === 'mute') {
    const durationText = interaction.options.getString('duration') || '10m';
    const ms = parseDurationToMs(durationText);

    try {
      await target.timeout(ms, reason);
      const embed = createModerationEmbed({
        title: 'Member Timed Out',
        user: target.user,
        moderator: interaction.user,
        reason,
        duration: formatDuration(ms),
      });

      await interaction.reply({ embeds: [embed] });
      await logModerationAction(interaction.guild, embed);
    } catch (error) {
      await interaction.reply({ content: 'I could not timeout that member.', ephemeral: true });
    }
    return;
  }

  if (commandName === 'unmute') {
    try {
      await target.timeout(null, reason);
      const embed = createModerationEmbed({
        title: 'Timeout Removed',
        user: target.user,
        moderator: interaction.user,
        reason,
      });

      await interaction.reply({ embeds: [embed] });
      await logModerationAction(interaction.guild, embed);
    } catch (error) {
      await interaction.reply({ content: 'I could not remove the timeout from that member.', ephemeral: true });
    }
    return;
  }

  if (commandName === 'kick') {
    try {
      await target.kick(reason);
      const embed = createModerationEmbed({
        title: 'Member Kicked',
        user: target.user,
        moderator: interaction.user,
        reason,
      });

      await interaction.reply({ embeds: [embed] });
      await logModerationAction(interaction.guild, embed);
    } catch (error) {
      await interaction.reply({ content: 'I could not kick that member.', ephemeral: true });
    }
    return;
  }

  if (commandName === 'ban') {
    try {
      await target.ban({ reason });
      const embed = createModerationEmbed({
        title: 'Member Banned',
        user: target.user,
        moderator: interaction.user,
        reason,
      });

      await interaction.reply({ embeds: [embed] });
      await logModerationAction(interaction.guild, embed);
    } catch (error) {
      await interaction.reply({ content: 'I could not ban that member.', ephemeral: true });
    }
    return;
  }

  if (commandName === 'clear') {
    const amount = interaction.options.getInteger('amount') || 10;
    if (!interaction.channel || !interaction.channel.bulkDelete) {
      await interaction.reply({ content: 'This channel does not support bulk message removal.', ephemeral: true });
      return;
    }

    try {
      const deletedMessages = await interaction.channel.bulkDelete(amount, true);
      const embed = createModerationEmbed({
        title: 'Messages Cleared',
        user: interaction.user,
        moderator: interaction.user,
        reason: `${deletedMessages.size} messages cleared`,
      });

      await interaction.reply({ embeds: [embed] });
      await logModerationAction(interaction.guild, embed);
    } catch (error) {
      await interaction.reply({ content: 'I could not clear messages in this channel.', ephemeral: true });
    }
  }
};

const handleDutyCommand = async (interaction) => {
  if (!interaction.guild) {
    await interaction.reply({ content: 'This command can only be used inside a server.', ephemeral: true });
    return;
  }

  if (!isStaffMember(interaction.member)) {
    await interaction.reply({ content: 'Only staff members can update duty status.', ephemeral: true });
    return;
  }

  const subcommand = interaction.options.getSubcommand();
  const reason = interaction.options.getString('reason')?.trim() || 'No reason provided';

  switch (subcommand) {
    case 'on': {
      await replyWithDutyEmbed(interaction, DUTY_STATUSES.ON_DUTY, reason, interaction.member.displayName || interaction.user.username);
      return;
    }
    case 'off': {
      await replyWithDutyEmbed(interaction, DUTY_STATUSES.OFF_DUTY, reason, interaction.member.displayName || interaction.user.username);
      return;
    }
    case 'loa': {
      const loaReason = interaction.options.getString('reason')?.trim() || 'No reason provided';
      const loaDate = interaction.options.getString('date')?.trim();
      if (!isValidLoaDate(loaDate)) {
        await interaction.reply({ content: 'Use a valid return date in YYYY-MM-DD format.', ephemeral: true });
        return;
      }
      const isApprover = canApproveLOA(interaction.member);

      if (isApprover) {
        await replyWithDutyEmbed(interaction, DUTY_STATUSES.LOA, loaReason, interaction.member.displayName || interaction.user.username, loaDate);
        return;
      }

      const loaEmbed = createDutyEmbed({
        name: interaction.member.displayName || interaction.user.username,
        status: DUTY_STATUSES.LOA,
        reason: loaReason,
        date: loaDate,
        updatedAt: new Date().toISOString(),
      });

      const loaLogChannel = getLoaLogChannel(interaction.guild);
      if (loaLogChannel) {
        await loaLogChannel.send({ embeds: [loaEmbed] }).catch(() => {});
      }

      for (const approverRoleId of LOA_APPROVER_ROLE_IDS) {
        const role = interaction.guild.roles.cache.get(approverRoleId);
        if (!role) continue;

        const members = await interaction.guild.roles.cache.get(approverRoleId)?.members?.values?.();
        if (!members) continue;

        for (const member of members) {
          try {
            await member.send({
              content: `LOA Request: ${interaction.member.displayName || interaction.user.username} has submitted an LOA.\nReturn date: ${loaDate}\nReason: ${loaReason}`,
            });
          } catch {
            // ignore DM failures
          }
        }
      }

      await interaction.reply({
        content: 'Your LOA request has been sent to the executive team for approval.',
      });
      return;
    }
    case 'clear': {
      const currentStatus = staffDutyStatus.get(interaction.user.id);
      if (!currentStatus || currentStatus.status !== DUTY_STATUSES.LOA) {
        await interaction.reply({ content: 'You do not currently have an LOA status.', ephemeral: true });
        return;
      }

      await replyWithDutyEmbed(interaction, DUTY_STATUSES.OFF_DUTY, 'LOA ended', interaction.member.displayName || interaction.user.username);
      return;
    }
    case 'status': {
      const currentStatus = staffDutyStatus.get(interaction.user.id) || { status: DUTY_STATUSES.OFF_DUTY, reason: 'No reason provided' };
      const embed = createDutyEmbed({
        name: interaction.member.displayName || interaction.user.username,
        status: currentStatus.status,
        reason: currentStatus.reason,
        date: currentStatus.date,
        updatedAt: currentStatus.updatedAt || new Date().toISOString(),
      });
      await interaction.reply({ embeds: [embed] });
      return;
    }
    case 'list': {
      const boardEmbed = getDutyBoardEmbed();
      await interaction.reply({ embeds: [boardEmbed] });
      return;
    }
    default: {
      await interaction.reply({ content: 'Invalid duty action.', ephemeral: true });
    }
  }
};

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
        status: staffDutyStatus.get(userId)?.status || DUTY_STATUSES.OFF_DUTY,
        dutyReason: staffDutyStatus.get(userId)?.reason || null,
        presence: member.presence?.status || 'offline',
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

client.once('ready', async () => {
  try {
    const guildId = process.env.DISCORD_GUILD_ID;
    if (guildId) {
      await client.application.commands.set(dutyCommands, guildId);
      console.log('Discord slash commands registered');
    }
  } catch (error) {
    console.error('Failed to register slash commands:', error);
  }

  await refreshDutyBoard();
  console.log(`Discord bot ready as ${client.user.tag}`);
  console.log(`API listening on port ${port}`);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'duty') {
    await handleDutyCommand(interaction);
    return;
  }

  if (interaction.commandName === 'loa-approve') {
    const member = interaction.options.getMember('member');
    const date = interaction.options.getString('date');
    const reason = interaction.options.getString('reason');
    await announceLoaDecision(interaction, member, 'approve', reason, date);
    return;
  }

  if (interaction.commandName === 'loa-reject') {
    const member = interaction.options.getMember('member');
    const reason = interaction.options.getString('reason');
    await announceLoaDecision(interaction, member, 'reject', reason);
    return;
  }

  if (['warn', 'mute', 'unmute', 'kick', 'ban', 'clear'].includes(interaction.commandName)) {
    await handleModerationCommand(interaction);
    return;
  }

  if (['info', 'server', 'poll', 'coinflip', 'dice', 'lucky', 'ask', 'fact', 'quote', 'meme', 'secret', 'mood', 'suggest', 'announce', 'twitch'].includes(interaction.commandName)) {
    await handleFunCommand(interaction);
  }
});

app.listen(port);
client.login(process.env.DISCORD_BOT_TOKEN);
