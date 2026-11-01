// Frozen prototype.html :root values. Danger is for errors/destructive actions only.
const colors = {
  bg: '#080b09',
  surface: '#101510',
  'surface-2': '#171d17',
  'surface-3': '#202820',
  line: '#2a332a',
  'line-soft': '#1d251e',
  text: '#f2f5ee',
  muted: '#a3ada1',
  subtle: '#778276',
  accent: '#c9ef78',
  'accent-ink': '#17200d',
  info: '#a8c7fa', // --blue
  caution: '#efc477', // --amber
  danger: '#f2a59c',
};
const radii = { lg: 24, md: 17, sm: 12 };
const fontFamilies = { display: ['Avenir Next Condensed'] };
// Complete allowlist for normal-sized text; not every color combination is safe.
const textBackgroundPairs = [
  ...['bg', 'surface', 'surface-2', 'surface-3'].flatMap((background) =>
    ['text', 'muted', 'accent', 'info', 'caution', 'danger'].map((text) => ({ text, background })),
  ),
  { text: 'subtle', background: 'bg' },
  { text: 'subtle', background: 'surface' },
  { text: 'accent-ink', background: 'accent' },
];
module.exports = { colors, radii, fontFamilies, textBackgroundPairs };
