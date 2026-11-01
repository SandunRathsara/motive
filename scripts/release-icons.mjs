// Dependency-free, reproducible 1024px RGB PNGs: node scripts/release-icons.mjs.
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { Buffer } from 'node:buffer';

function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type), data]);
  let crc = 0xffffffff;
  for (const byte of body) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
  return Buffer.concat([length, body, checksum]);
}

mkdirSync(new URL('../assets/', import.meta.url), { recursive: true });
for (const [variant, background, foreground] of [
  ['owner', [8, 11, 9], [201, 239, 120]],
  ['verification', [239, 196, 119], [8, 11, 9]],
]) {
  const size = 1024;
  const pixels = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // A bold M; verification also has a clearly visible underline.
      const mark = x >= 240 && x < 784 && y >= 260 && y < 740 &&
        (x < 340 || x >= 684 || Math.abs(y - (310 + (272 - Math.abs(x - 512)) * 0.9)) < 65);
      const underline = variant === 'verification' && x >= 240 && x < 784 && y >= 800 && y < 850;
      const color = mark || underline ? foreground : background;
      const offset = y * (size * 3 + 1) + 1 + x * 3;
      for (let channel = 0; channel < 3; channel++) pixels[offset + channel] = color[channel];
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 2;
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header), chunk('IDAT', deflateSync(pixels)), chunk('IEND', Buffer.alloc(0)),
  ]);
  writeFileSync(new URL(`../assets/icon-${variant}.png`, import.meta.url), png);
}
