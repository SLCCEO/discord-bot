import { EmbedBuilder } from 'discord.js';

export const STAFF_ROLE_IDS = new Set([
  '866528537494421545',
  '1537649580294934629',
  '1537649684380909649',
  '1489403798865580133',
  '866528537494421543',
  '866528537494421542',
  '866528537494421541',
]);

export function hasAnyRole(member, roleIds = STAFF_ROLE_IDS) {
  if (!member || !member.roles || !member.roles.cache) {
    return false;
  }

  const roleCache = member.roles.cache;
  if (typeof roleCache.some === 'function') {
    return roleCache.some((role) => roleIds.has(role.id));
  }

  if (roleCache instanceof Map) {
    return [...roleCache.values()].some((role) => roleIds.has(role.id));
  }

  return false;
}

export function parseDurationToMs(rawValue) {
  const value = String(rawValue ?? '').trim().toLowerCase();
  if (!value) return 60 * 1000;

  const match = value.match(/^(\d+)(ms|s|m|h|d|w)$/);
  if (!match) return 60 * 1000;

  const amount = Number(match[1]);
  const unit = match[2];

  const multipliers = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000,
  };

  return amount * (multipliers[unit] || 60 * 1000);
}

export function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);

  return parts.join(' ');
}

export function createModerationEmbed({ title, user, moderator, reason, duration, extraFields = [] }) {
  const memberName = user?.tag || user?.username || 'Unknown User';
  const moderatorName = moderator?.tag || moderator?.username || 'Unknown Moderator';

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setColor(0xf59e0b)
    .addFields(
      { name: 'Member', value: memberName, inline: true },
      { name: 'Moderator', value: moderatorName, inline: true },
      { name: 'Reason', value: String(reason || 'No reason provided'), inline: false },
    );

  if (duration) {
    embed.addFields({ name: 'Duration', value: String(duration), inline: false });
  }

  extraFields.forEach((field) => embed.addFields(field));

  return embed.setTimestamp(new Date());
}
