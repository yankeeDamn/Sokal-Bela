'use strict';
const auth = require('../../lib/server-auth');
module.exports = async function handler(req, res) {
  auth.setHeaders(res);
  if (req.method !== 'POST' || !auth.checkOrigin(req))
    return res.status(req.method === 'POST' ? 403 : 405).json({ error: 'Request not allowed.' });
  if (Number(req.headers['content-length'] || 0) > 4096)
    return res.status(413).json({ error: 'Request too large.' });
  try {
    switch (String(req.params?.action || req.query?.action || '').toLowerCase()) {
      case 'request-otp': return await auth.requestOtp(req, res);
      case 'verify-otp': return await auth.verifyOtp(req, res);
      case 'session': return await auth.createSession(req, res);
      case 'logout': auth.clearSessions(res); return res.status(200).json({ ok: true });
      default: return res.status(404).json({ error: 'Not found.' });
    }
  } catch (err) {
    console.error('Authentication request failed:', err.message);
    return res.status(503).json({ error: 'Authentication temporarily unavailable. Please try again.' });
  }
};
