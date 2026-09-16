import test from 'node:test';
import assert from 'node:assert/strict';
import { createDutyEmbed, createDutyBoardEmbed, DUTY_STATUSES, createLoaDecisionMessage } from './staffDuty.js';

test('creates a duty embed with the expected status color and fields', () => {
  const embed = createDutyEmbed({
    name: 'Vexon',
    status: DUTY_STATUSES.ON_DUTY,
    reason: 'Ready to assist',
    updatedAt: '2026-09-15T12:00:00Z',
  });

  assert.equal(embed.data.title, 'Staff Duty Update');
  assert.equal(embed.data.fields[0].name, 'Staff Member');
  assert.equal(embed.data.fields[0].value, 'Vexon');
  assert.equal(embed.data.fields[1].name, 'Status');
  assert.equal(embed.data.fields[1].value, 'On Duty');
  assert.equal(embed.data.fields[2].name, 'Reason');
  assert.equal(embed.data.fields[2].value, 'Ready to assist');
  assert.equal(embed.data.color, 0x22c55e);
});

test('creates a single duty board embed grouped by status', () => {
  const embed = createDutyBoardEmbed({
    onDuty: ['<@123>', '<@456>'],
    offDuty: ['<@789>'],
    loa: ['<@abc>'],
    updatedAt: '2026-09-15T12:00:00Z',
  });

  assert.equal(embed.data.title, 'Staff Duty Board');
  assert.equal(embed.data.fields[0].name, 'On Duty');
  assert.equal(embed.data.fields[0].value, '• <@123>\n• <@456>');
  assert.equal(embed.data.fields[1].name, 'LOA');
  assert.equal(embed.data.fields[1].value, '• <@abc>');
  assert.equal(embed.data.fields[2].name, 'Off Duty');
  assert.equal(embed.data.fields[2].value, '• <@789>');
});

test('creates a clear LOA decision message for approval or rejection', () => {
  const approved = createLoaDecisionMessage({
    memberName: 'Vexon',
    returnDate: '2026-10-01',
    reason: 'Family emergency',
    decision: 'approved',
    reviewedBy: 'AdminUser',
  });

  assert.match(approved, /LOA approved/i);
  assert.match(approved, /Vexon/);
  assert.match(approved, /2026-10-01/);
  assert.match(approved, /Family emergency/);
  assert.match(approved, /AdminUser/);
});
