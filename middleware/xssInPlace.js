// middleware/xssInPlace.js
// In-place sanitize strings in req.body/req.query/req.params (no reassignment).
// This is a *lightweight* guard: it strips script tags, javascript: URLs,
// null bytes, and escapes angle brackets.

function sanitizeString(s) {
  if (typeof s !== 'string') return s;
  let out = s.replace(/\0/g, ''); // strip null byte
  // remove <script>...</script>
  out = out.replace(/<\s*script[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi, '');
  // neutralize javascript: URLs
  out = out.replace(/javascript\s*:/gi, '');
  // escape angle brackets so raw HTML can't render in browsers
  out = out.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return out;
}

function deepSanitize(obj) {
  if (!obj || typeof obj !== 'object') return;
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (typeof val === 'string') {
      obj[key] = sanitizeString(val);
    } else if (Array.isArray(val)) {
      for (let i = 0; i < val.length; i++) {
        if (typeof val[i] === 'string') val[i] = sanitizeString(val[i]);
        else if (val[i] && typeof val[i] === 'object') deepSanitize(val[i]);
      }
    } else if (val && typeof val === 'object') {
      deepSanitize(val);
    }
  }
}

export default function xssInPlace(req, _res, next) {
  try {
    deepSanitize(req.body);
    deepSanitize(req.query);
    deepSanitize(req.params);
  } catch {}
  next();
}
