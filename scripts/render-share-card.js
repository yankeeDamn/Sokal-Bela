// Render the 1200 x 630 social preview with the same business contact shown on the storefront.
const fs = require('node:fs');
const path = require('node:path');
const { Resvg } = require('@resvg/resvg-js');
const contact = require('../config/contact.mjs').default;

module.exports = function renderShareCard(imageDir) {
  const vegetables = [
    ['tomato', 648, 60, -4], ['brinjal', 912, 92, 3],
    ['carrot', 672, 320, 2], ['cauliflower', 902, 350, -3]
  ];
  const tiles = vegetables.map(([name, x, y, angle]) => {
    const picture = fs.readFileSync(path.join(imageDir, name + '.svg')).toString('base64');
    return `<g transform="translate(${x} ${y}) rotate(${angle} 114 114)" clip-path="url(#tile)">
      <image width="228" height="228" href="data:image/svg+xml;base64,${picture}"/>
    </g>`;
  }).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <defs>
      <linearGradient id="bg" x2="1" y2="1"><stop stop-color="#1e5a28"/><stop offset="1" stop-color="#398f46"/></linearGradient>
      <clipPath id="tile"><rect width="228" height="228" rx="32"/></clipPath>
    </defs>
    <rect width="1200" height="630" fill="url(#bg)"/>
    <rect x="64" y="84" width="318" height="44" rx="22" fill="#f4a624"/>
    <g font-family="DejaVu Sans" font-weight="bold" fill="white">
      <text x="84" y="114" font-size="23">Rampurhat · Birbhum</text>
      <text x="64" y="231" font-size="90">Sokal Bela</text>
      <text x="64" y="302" font-size="42">Fresh local vegetables,</text>
      <text x="64" y="351" font-size="42">delivered fast</text>
      <text x="64" y="420" font-size="25">Order on WhatsApp · ${contact.displayPhone}</text>
    </g>${tiles}</svg>`;
  const fontFile = require.resolve('dejavu-fonts-ttf/ttf/DejaVuSans-Bold.ttf');
  const png = new Resvg(svg, { font: { loadSystemFonts: false, fontFiles: [fontFile] } }).render().asPng();
  fs.writeFileSync(path.join(imageDir, 'og-cover.png'), png);
};
