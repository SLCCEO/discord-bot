import { EmbedBuilder } from 'discord.js';

export const DUTY_STATUSES = Object.freeze({
  ON_DUTY: 'On Duty',
  OFF_DUTY: 'Off Duty',
  LOA: 'LOA',
});

export function normalizeDutyStatus(status) {
  const value = String(status || '').trim();
  if (!value) return DUTY_STATUSES.OFF_DUTY;

  const normalized = value.toLowerCase();
  if (normalized === 'onduty' || normalized === 'on-duty' || normalized === 'on duty') return DUTY_STATUSES.ON_DUTY;
  if (normalized === 'offduty' || normalized === 'off-duty' || normalized === 'off duty') return DUTY_STATUSES.OFF_DUTY;
  if (normalized === 'loa' || normalized === 'leaveofabsence' || normalized === 'leave-of-absence') return DUTY_STATUSES.LOA;

  return DUTY_STATUSES.OFF_DUTY;
}

export function getDutyColor(status) {
  switch (normalizeDutyStatus(status)) {
    case DUTY_STATUSES.ON_DUTY:
      return 0x22c55e;
    case DUTY_STATUSES.LOA:
      return 0xf59e0b;
    case DUTY_STATUSES.OFF_DUTY:
    default:
      return 0x64748b;
  }
}

export function createDutyEmbed({ name, status, reason = 'No reason provided', date, updatedAt = new Date().toISOString() }) {
  const cleanStatus = normalizeDutyStatus(status);
  const embed = new EmbedBuilder()
    .setTitle('Staff Duty Update')
    .setColor(getDutyColor(cleanStatus))
    .addFields(
      { name: 'Staff Member', value: String(name || 'Unknown Staff'), inline: true },
      { name: 'Status', value: cleanStatus, inline: true },
      { name: 'Reason', value: String(reason || 'No reason provided'), inline: false },
    );

  if (cleanStatus === DUTY_STATUSES.LOA && date) {
    embed.addFields({ name: 'Return Date', value: String(date), inline: true });
  }

  embed
    .setTimestamp(new Date(updatedAt))
    .setFooter({ text: 'Duty status updated' });

  return embed;
}

export function createDutyBoardEmbed({ onDuty = [], offDuty = [], loa = [], updatedAt = new Date().toISOString() }) {
  const makeList = (entries) => {
    if (!entries || entries.length === 0) return 'None';
    return entries.map((entry) => `• ${entry}`).join('\n');
  };

  const embed = new EmbedBuilder()
    .setTitle('Staff Duty Board')
    .setColor(0x2563eb)
    .addFields(
      { name: 'On Duty', value: makeList(onDuty), inline: true },
      { name: 'LOA', value: makeList(loa), inline: true },
      { name: 'Off Duty', value: makeList(offDuty), inline: true },
    )
    .setTimestamp(new Date(updatedAt))
    .setFooter({ text: 'Live staff availability' });

  return embed;
}

export function createLoaRequestMessage({ memberName, returnDate, reason }) {
  return [
    `LOA request from ${memberName || 'Unknown member'}`,
    `Return date: ${returnDate || 'Not provided'}`,
    `Reason: ${reason || 'No reason provided'}`,
    'React with ✅ to approve or ❌ to reject this request.',
  ].join('\n');
}

export function createLoaDecisionMessage({ memberName, returnDate, reason, decision, reviewedBy }) {
  const cleanDecision = String(decision || 'approved').trim().toLowerCase();
  const approved = cleanDecision === 'approved' || cleanDecision === 'accept' || cleanDecision === 'true';

  const statusText = approved ? 'approved' : 'rejected';
  return [
    `LOA ${statusText} for ${memberName || 'Unknown member'}`,
    `Return date: ${returnDate || 'Not provided'}`,
    `Reason: ${reason || 'No reason provided'}`,
    `Reviewed by: ${reviewedBy || 'Unknown approver'}`,
  ].join('\n');
}
