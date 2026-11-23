'use strict';
// Pure date helpers for Morning Pass billing. All dates are 'YYYY-MM-DD' in IST.
function istToday(now = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(now).map(x => [x.type, x.value]));
  return p.year + '-' + p.month + '-' + p.day;
}
const toUtc = iso => new Date(iso + 'T00:00:00Z');
const toIso = d => d.toISOString().slice(0, 10);
function addDays(iso, n) { const d = toUtc(iso); d.setUTCDate(d.getUTCDate() + n); return toIso(d); }
function weekday(iso) { return toUtc(iso).getUTCDay(); } // 0 = Sunday

// Is a delivery due on `iso` for this subscription's frequency (ignores pause/paid state)?
function dueOn(frequency, startDate, iso) {
  if (iso < startDate) return false;
  if (frequency === 'daily') return true;
  if (frequency === 'mon_sat') return weekday(iso) !== 0;
  if (frequency === 'weekly') return weekday(iso) === weekday(startDate);
  return false;
}
function countDeliveries(frequency, startDate, from, to) {
  let n = 0;
  for (let d = from; d <= to; d = addDays(d, 1)) if (dueOn(frequency, startDate, d)) n++;
  return n;
}
// The next prepay window: 30 days beginning after any existing paid period.
function nextWindow(sub, today) {
  let from = today > sub.start_date ? today : sub.start_date;
  if (sub.paid_until && addDays(sub.paid_until, 1) > from) from = addDays(sub.paid_until, 1);
  return { from, to: addDays(from, 29) };
}
const cents = n => Math.round(Number(n) * 100);
module.exports = { istToday, addDays, weekday, dueOn, countDeliveries, nextWindow, cents };
