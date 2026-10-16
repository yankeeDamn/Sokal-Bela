// Checks that every product name gets the right picture, including the shapes of data
// that really exist in the database (nameEn / nameBn, and stale image paths).
// Run with: npm test
const vm = require('vm');
const fs = require('fs');
const path = require('path');

const ctx = { window: {} };
ctx.window.window = ctx.window;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'veg-images.js'), 'utf8'), ctx);
const V = ctx.window.VEG_IMAGES;

const cases = [
  [{ nameEn: 'Cauliflower', nameBn: 'ফুলকপি', imageUrl: '/public/images/carrot.svg' }, 'cauliflower.svg'],
  [{ nameEn: 'Potato', nameBn: 'আলু', imageUrl: '/public/images/carrot.svg' }, 'potato.svg'],
  [{ nameEn: 'Cabbage', imageUrl: '/public/images/carrot.svg' }, 'cabbage.svg'],
  [{ nameEn: 'Leafy Greens', nameBn: 'শাক', imageUrl: '/public/images/carrot.svg' }, 'leafy-greens.svg'],
  [{ nameEn: 'Tomato', imageUrl: 'https://i.ibb.co/x/tomato.jpg' }, 'tomato.svg'],
  [{ name: 'Brinjal' }, 'brinjal.svg'], [{ name: 'Potatoes' }, 'potato.svg'], [{ name: 'Green Chillies' }, 'chili.svg'],
  [{ name: '', hindiName: 'फूलगोभी' }, 'cauliflower.svg'], [{ name: '', bengaliName: 'বেগুন' }, 'brinjal.svg'],
  [{ name: 'Spinach' }, 'spinach.svg'], [{ name: 'Palak Shak', bengaliName: 'পালং শাক' }, 'spinach.svg'],
  [{ name: 'Bitter Gourd' }, 'bitter-gourd.svg'], [{ name: 'Bottle Gourd' }, 'bottle-gourd.svg'],
  [{ name: 'Capsicum', hindiName: 'शिमला मिर्च' }, 'capsicum.svg'],
  [{ name: 'Valuable Item' }, 'veg-fallback.svg'],
  [{ name: 'Mango', imageUrl: '/public/images/carrot.svg' }, 'veg-fallback.svg'],   // stale bundled path is ignored
  [{ name: 'Mango', imageUrl: 'https://example.com/mango.jpg' }, 'https://example.com/mango.jpg'] // real photo for unknown item
];

let bad = 0;
for (const [product, want] of cases) {
  const got = V.getVegImage(product);
  if (!got.endsWith(want)) { bad++; console.error('FAIL', JSON.stringify(product), '->', got, '(wanted', want + ')'); }
}
if (bad) process.exit(1);
console.log(`OK - ${cases.length} name-to-picture checks passed.`);
