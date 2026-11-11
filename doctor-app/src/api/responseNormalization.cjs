function normalizeApiList(value, keys = []) {
  if (Array.isArray(value)) return value;
  for (const key of keys) {
    if (Array.isArray(value?.[key])) return value[key];
  }
  return [];
}

function normalizeDentalChart(value) {
  return normalizeApiList(value, ['entries', 'items', 'chart', 'records']).reduce((result, entry) => {
    const tooth = String(entry?.tooth_fdi || '').trim();
    const status = String(entry?.status || '').trim();
    if (tooth && status) result[tooth] = status;
    return result;
  }, {});
}

module.exports = { normalizeApiList, normalizeDentalChart };
