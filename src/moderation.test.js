import test from 'node:test';
import assert from 'node:assert/strict';
import { STAFF_ROLE_IDS, parseDurationToMs, formatDuration, hasAnyRole } from './moderation.js';

test('staff role ids include the configured team roles', () => {
  assert.ok(STAFF_ROLE_IDS.has('866528537494421545'));
  assert.ok(STAFF_ROLE_IDS.has('1537649580294934629'));
  assert.ok(STAFF_ROLE_IDS.has('866528537494421542'));
  assert.ok(STAFF_ROLE_IDS.has('866528537494421541'));
});

test('duration parsing converts common time formats', () => {
  assert.equal(parseDurationToMs('10m'), 10 * 60 * 1000);
  assert.equal(parseDurationToMs('2h'), 2 * 60 * 60 * 1000);
  assert.equal(parseDurationToMs('1d'), 24 * 60 * 60 * 1000);
});

test('formatDuration prints readable values', () => {
  assert.equal(formatDuration(2 * 60 * 60 * 1000), '2h');
  assert.equal(formatDuration(90 * 1000), '1m 30s');
});

test('hasAnyRole checks a member against known role ids', () => {
  const roleCache = {
    some: (callback) => [
      { id: '866528537494421543' },
      { id: 'not-staff' },
    ].some((role) => callback(role)),
  };

  const member = {
    roles: { cache: roleCache },
  };

  assert.equal(hasAnyRole(member, STAFF_ROLE_IDS), true);
});
