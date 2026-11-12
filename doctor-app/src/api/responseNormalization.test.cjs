const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeApiList, normalizeDentalChart } = require('./responseNormalization.cjs');

test('normalizes direct array responses and empty account responses', () => {
  assert.deepEqual(normalizeApiList([{ id: 'a' }]), [{ id: 'a' }]);
  assert.deepEqual(normalizeApiList([]), []);
  assert.deepEqual(normalizeApiList(null), []);
  assert.deepEqual(normalizeApiList(undefined), []);
});

test('normalizes common API list envelopes without treating objects as rows', () => {
  assert.deepEqual(normalizeApiList({ items: [{ id: 'a' }] }, ['items']), [{ id: 'a' }]);
  assert.deepEqual(normalizeApiList({ data: [{ id: 'b' }] }, ['items', 'data']), [{ id: 'b' }]);
  assert.deepEqual(normalizeApiList({ appointments: [{ id: 'c' }] }, ['appointments']), [{ id: 'c' }]);
  assert.deepEqual(normalizeApiList({ patients: [{ id: 'd' }] }, ['patients']), [{ id: 'd' }]);
  assert.deepEqual(normalizeApiList({ items: null, total: 0 }, ['items']), []);
});

test('normalizes dental chart envelopes and never invents healthy findings for empty records', () => {
  assert.deepEqual(normalizeDentalChart([]), {});
  assert.deepEqual(normalizeDentalChart({ entries: [] }), {});
  assert.deepEqual(normalizeDentalChart({ items: [{ tooth_fdi: '46', status: 'attention' }] }), { '46': 'attention' });
  assert.deepEqual(normalizeDentalChart({ chart: [{ tooth_fdi: '21', status: 'treated' }] }), { '21': 'treated' });
  assert.deepEqual(normalizeDentalChart({ records: [{ tooth_fdi: '', status: 'healthy' }, { tooth_fdi: '11', status: '' }] }), {});
});
