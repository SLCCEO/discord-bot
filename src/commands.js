import { SlashCommandBuilder } from 'discord.js';

export function createDutyCommandDefinition() {
  return [
    new SlashCommandBuilder()
      .setName('duty')
      .setDescription('Manage staff duty updates')
      .addSubcommand((subcommand) =>
        subcommand
          .setName('on')
          .setDescription('Mark yourself as on duty')
          .addStringOption((option) =>
            option.setName('reason').setDescription('Reason for being on duty').setRequired(false),
          ),
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName('off')
          .setDescription('Mark yourself as off duty')
          .addStringOption((option) =>
            option.setName('reason').setDescription('Reason for going off duty').setRequired(false),
          ),
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName('loa')
          .setDescription('Submit a leave of absence')
          .addStringOption((option) =>
            option.setName('date').setDescription('Expected return date (YYYY-MM-DD)').setRequired(true),
          )
          .addStringOption((option) =>
            option.setName('reason').setDescription('Reason for your LOA').setRequired(true),
          ),
      )
      .addSubcommand((subcommand) => subcommand.setName('clear').setDescription('Remove your LOA status and return to off duty'))
      .addSubcommand((subcommand) => subcommand.setName('status').setDescription('Check your current duty status'))
      .addSubcommand((subcommand) => subcommand.setName('list').setDescription('List staff duty status'))
      .toJSON(),

    new SlashCommandBuilder()
      .setName('warn')
      .setDescription('Warn a member')
      .addUserOption((option) => option.setName('member').setDescription('Member to warn').setRequired(true))
      .addStringOption((option) => option.setName('reason').setDescription('Reason for the warning').setRequired(false))
      .toJSON(),

    new SlashCommandBuilder()
      .setName('mute')
      .setDescription('Timeout a member for a duration')
      .addUserOption((option) => option.setName('member').setDescription('Member to mute').setRequired(true))
      .addStringOption((option) => option.setName('duration').setDescription('Example: 10m, 2h, 1d').setRequired(true))
      .addStringOption((option) => option.setName('reason').setDescription('Reason for the timeout').setRequired(false))
      .toJSON(),

    new SlashCommandBuilder()
      .setName('unmute')
      .setDescription('Remove a timeout from a member')
      .addUserOption((option) => option.setName('member').setDescription('Member to unmute').setRequired(true))
      .addStringOption((option) => option.setName('reason').setDescription('Reason for the removal').setRequired(false))
      .toJSON(),

    new SlashCommandBuilder()
      .setName('kick')
      .setDescription('Kick a member from the server')
      .addUserOption((option) => option.setName('member').setDescription('Member to kick').setRequired(true))
      .addStringOption((option) => option.setName('reason').setDescription('Reason for the kick').setRequired(false))
      .toJSON(),

    new SlashCommandBuilder()
      .setName('ban')
      .setDescription('Ban a member from the server')
      .addUserOption((option) => option.setName('member').setDescription('Member to ban').setRequired(true))
      .addStringOption((option) => option.setName('reason').setDescription('Reason for the ban').setRequired(false))
      .toJSON(),

    new SlashCommandBuilder()
      .setName('clear')
      .setDescription('Delete recent messages from a channel')
      .addIntegerOption((option) => option.setName('amount').setDescription('Number of messages to delete').setRequired(true).setMinValue(1).setMaxValue(100))
      .toJSON(),

    new SlashCommandBuilder()
      .setName('info')
      .setDescription('Get general information about a user or the server')
      .addUserOption((option) => option.setName('user').setDescription('User to inspect').setRequired(false))
      .toJSON(),

    new SlashCommandBuilder()
      .setName('server')
      .setDescription('Show server information')
      .toJSON(),

    new SlashCommandBuilder()
      .setName('poll')
      .setDescription('Create a quick poll')
      .addStringOption((option) => option.setName('question').setDescription('Poll question').setRequired(true))
      .addStringOption((option) => option.setName('options').setDescription('Options separated by commas').setRequired(true))
      .toJSON(),

    new SlashCommandBuilder()
      .setName('coinflip')
      .setDescription('Flip a coin')
      .toJSON(),

    new SlashCommandBuilder()
      .setName('dice')
      .setDescription('Roll a six-sided die')
      .addIntegerOption((option) => option.setName('sides').setDescription('Number of sides for the dice').setRequired(false).setMinValue(4).setMaxValue(20))
      .toJSON(),

    new SlashCommandBuilder()
      .setName('lucky')
      .setDescription('Generate a lucky number')
      .toJSON(),

    new SlashCommandBuilder()
      .setName('ask')
      .setDescription('Ask the bot a yes or no question')
      .addStringOption((option) => option.setName('question').setDescription('Your question').setRequired(true))
      .toJSON(),

    new SlashCommandBuilder()
      .setName('fact')
      .setDescription('Get a random fact')
      .toJSON(),

    new SlashCommandBuilder()
      .setName('quote')
      .setDescription('Get a random quote')
      .toJSON(),

    new SlashCommandBuilder()
      .setName('meme')
      .setDescription('Get a random bot meme line')
      .toJSON(),

    new SlashCommandBuilder()
      .setName('secret')
      .setDescription('Reveal a tiny secret')
      .toJSON(),

    new SlashCommandBuilder()
      .setName('mood')
      .setDescription('Check the bot mood')
      .toJSON(),

    new SlashCommandBuilder()
      .setName('suggest')
      .setDescription('Submit a suggestion for the server')
      .addStringOption((option) => option.setName('suggestion').setDescription('Your suggestion').setRequired(true))
      .toJSON(),

    new SlashCommandBuilder()
      .setName('announce')
      .setDescription('Send a server announcement')
      .addStringOption((option) => option.setName('message').setDescription('Announcement text').setRequired(true))
      .toJSON(),

    new SlashCommandBuilder()
      .setName('twitch')
      .setDescription('Share a Twitch live announcement')
      .addStringOption((option) => option.setName('title').setDescription('Stream title').setRequired(true))
      .addStringOption((option) => option.setName('url').setDescription('Twitch URL').setRequired(true))
      .toJSON(),
  ];
}
