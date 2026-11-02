'use strict';
const crypto = require('node:crypto');
const gate = require('../lib/server-auth');
const emailRE = /^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/;
module.exports = async function handler(req, res) {
  gate.setHeaders(res);
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!gate.checkOrigin(req)) return res.status(403).json({ error: 'Forbidden' });
  const body = req.body || {};
  const name = String(body.name || '').trim().slice(0,80);
  const email = String(body.email || '').trim().toLowerCase().slice(0,254);
  const phone = String(body.phone || '').replace(/\D/g,'');
  const message = String(body.message || '').trim().slice(0,2000);
  // Honeypot: return the same success response while dropping automated submissions.
  if (body.website) return res.status(200).json({ ok:true });
  if (name.length < 2 || (email && !emailRE.test(email)) ||
      (phone && !/^[6-9]\d{9}$/.test(phone)) || (!email && !phone) || message.length < 10)
    return res.status(400).json({ error: 'Add your name, valid contact details, and a message of at least 10 characters.' });
  try {
    const db = gate.firestore();
    const ip = String(req.headers['x-vercel-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim();
    const key = crypto.createHash('sha256').update(ip).digest('hex');
    const ref = db.collection('inquiryRate').doc(key);
    const now = Date.now();
    const allowed = await db.runTransaction(async tx => {
      const snap = await tx.get(ref), last = snap.exists ? Number(snap.data().start || 0) : 0;
      const count = now - last > 3600000 ? 0 : Number(snap.data().count || 0);
      if (count >= 5) return false;
      tx.set(ref, { start: count ? last : now, count: count + 1, updatedAt: now });
      return true;
    });
    if (!allowed) return res.status(429).json({ error: 'Too many inquiries. Please call the store.' });
    await db.collection('contactInquiries').add({
      name,email,phone,message,status:'new',createdAt:new Date()
    });
    return res.status(200).json({ ok:true, message:'Your inquiry has been received.' });
  } catch (err) {
    console.error('Inquiry submission failed:',err.message);
    return res.status(503).json({error:'Unable to submit right now. Please contact the store by phone.'});
  }
};
