// middleware/safeSanitize.js
function cleanKeys(obj) {
  if (!obj || typeof obj !== 'object') return;
  for (const key of Object.keys(obj)) {
    const safeKey = key.replace(/^\$/g, '').replace(/\$/g, '').replace(/\./g, '_');
    if (safeKey !== key) {
      obj[safeKey] = obj[key];
      delete obj[key];
    }
    const val = obj[safeKey];
    if (val && typeof val === 'object') cleanKeys(val);
  }
}

export default function safeSanitize(req, res, next) {
  try {
    cleanKeys(req.body);
    cleanKeys(req.query);
    cleanKeys(req.params);
  } catch {}
  next();
}
