# Sokal Bela: Business Setup Guide

## 1. What you sell
| Service | Who it's for | How the order happens |
|---|---|---|
| Daily vegetables | Homes nearby | Website cart → WhatsApp/call → home delivery or shop pickup |
| Bulk orders | Weddings, birthdays, annaprasan, programs | Bulk form → we call with a quote → confirm date |
| Catering | Events needing cooked food | Catering form → we call with per-plate quote → menu and date fixed |

## 2. Order flow (no online payment)
1. Customer orders on the website, WhatsApp, Facebook message, or phone.
2. The website opens a ready-made WhatsApp message to +91 7551858583.
3. You confirm price, delivery time and address by call/WhatsApp.
4. Customer pays cash or UPI on delivery or at the shop.
5. Mark the order Delivered in the Admin panel.

For bulk and catering, take a small advance in cash/UPI directly (your choice) to lock the date.

## 3. Policies to decide and publish
- Delivery: free within 5 km, minimum ₹200 (already on the site). Set a fee beyond 5 km.
- Bulk lead time: suggest 3 to 7 days. Catering: suggest 7 to 15 days for weddings.
- Bulk and catering prices: quote per request. Vegetable market rates change daily.
- Cancellation: free up to 48 hours before an event, advance non-refundable after that.

## 4. Daily routine
- Early morning: buy from the mandi, update prices/stock in Admin.
- 7 AM to 9 PM: shop open, check WhatsApp and Admin orders.
- Afternoon: pack and dispatch deliveries.
- Evening: log bulk/catering enquiries and next-day needs.
- Weekly: check stock wastage, top-selling items, repeat customers.

## 5. Team roles (small business version)
Owner (pricing, quotes, suppliers) · Shop helper (packing, counter) · Delivery person (delivery, cash/UPI collection) · Cook/partner for catering (menu, kitchen, servers hired per event).

## 6. Setup checklist
- [ ] WhatsApp Business app on the shop number: greeting message, catalogue, business hours, quick replies
- [ ] Facebook Page created; put its link in the site (search `facebook.com` in index.html)
- [ ] Firebase project connected (`firebase-config.js`) and admin login set
- [ ] Real product list, photos and prices added in Admin
- [ ] UPI QR code printed at the shop counter
- [ ] FSSAI registration/licence for food and catering (check current rules for your turnover)
- [ ] Local trade licence / Gram Panchayat or municipality requirements
- [ ] Deploy: `firebase deploy --only hosting,firestore` or any static host
- [ ] Share the site link on WhatsApp status, Facebook and shop banner

## 7. Suggested WhatsApp quick replies
- Greeting: "Namaskar! Welcome to Sokal Bela. Tell us what you need, or order at our website."
- Confirmation: "Your order is confirmed. Delivery by [time]. Pay cash/UPI on delivery."
- Bulk/catering: "Thank you! Please share date, guest count and venue. We'll send a quote today."
