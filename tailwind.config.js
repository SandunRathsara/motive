const { colors, radii, fontFamilies } = require('./lib/theme/tokens');
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    colors,
    extend: {
      borderRadius: Object.fromEntries(Object.entries(radii).map(([name, value]) => [name, `${value}px`])),
      fontFamily: fontFamilies,
    },
  },
  plugins: [],
};
