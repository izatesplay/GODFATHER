import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createPng(width, height, getPixel) {
  // RGBA format (4 bytes per pixel + 1 filter byte per scanline)
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter type: None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, y, width, height);
      const pixelOffset = rowOffset + 1 + x * 4;
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData);

  function crc32(buf) {
    let crc = -1;
    for (let i = 0; i < buf.length; i++) {
      crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
    }
    return (crc ^ -1) >>> 0;
  }

  const table = new Int32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }

  function makeChunk(type, data) {
    const len = data.length;
    const buf = Buffer.alloc(12 + len);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4, 4, 'ascii');
    data.copy(buf, 8);
    const crc = crc32(buf.subarray(4, 8 + len));
    buf.writeUInt32BE(crc, 8 + len);
    return buf;
  }

  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8 bits per channel
  ihdrData[9] = 6; // Color type 6: RGBA
  ihdrData[10] = 0; // Compression
  ihdrData[11] = 0; // Filter
  ihdrData[12] = 0; // Interlace
  const ihdr = makeChunk('IHDR', ihdrData);

  const idat = makeChunk('IDAT', compressed);
  const iend = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdr, idat, iend]);
}

function tgPixel(x, y, w, h) {
  const cx = w / 2;
  const cy = h / 2;
  const r = w * 0.45;
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist <= r) {
    // Circle background: Telegram gradient from #2AABEE to #229ED9
    const gradFactor = (y / h);
    const red = Math.round(42 * (1 - gradFactor) + 34 * gradFactor);
    const green = Math.round(171 * (1 - gradFactor) + 158 * gradFactor);
    const blue = Math.round(238 * (1 - gradFactor) + 217 * gradFactor);

    // Approximate paper plane triangle
    // Plane center around (cx + 4, cy)
    const px = (x - cx) / (w * 0.35);
    const py = (y - cy) / (h * 0.35);

    // Simple paper plane silhouette
    const inPlaneWing1 = px >= -0.7 && px <= 0.8 && py >= -0.6 && py <= 0.6 && (py - px * 0.5 < 0.4 && py + px * 0.4 > -0.5);
    const inPlaneSpine = px >= -0.2 && px <= 0.3 && py >= -0.5 && py <= 0.5;

    if (inPlaneWing1 || inPlaneSpine) {
      return [255, 255, 255, 255];
    }
    return [red, green, blue, 255];
  } else {
    return [0, 0, 0, 0]; // Transparent
  }
}

function maskablePixel(x, y, w, h) {
  // Solid background for maskable
  const cx = w / 2;
  const cy = h / 2;
  const r = w * 0.38;
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Background deep slate / telegram dark
  const bg = [15, 23, 42, 255]; // #0f172a
  if (dist <= r) {
    const px = (x - cx) / (w * 0.3);
    const py = (y - cy) / (h * 0.3);
    const inPlane = px >= -0.7 && px <= 0.8 && py >= -0.6 && py <= 0.6 && (py - px * 0.5 < 0.4 && py + px * 0.4 > -0.5);
    if (inPlane) return [255, 255, 255, 255];
    return [34, 158, 217, 255];
  }
  return bg;
}

const pub = path.resolve('public');
fs.writeFileSync(path.join(pub, 'icon-192.png'), createPng(192, 192, tgPixel));
fs.writeFileSync(path.join(pub, 'icon-512.png'), createPng(512, 512, tgPixel));
fs.writeFileSync(path.join(pub, 'icon-192-maskable.png'), createPng(192, 192, maskablePixel));
fs.writeFileSync(path.join(pub, 'icon-512-maskable.png'), createPng(512, 512, maskablePixel));
fs.writeFileSync(path.join(pub, 'apple-touch-icon.png'), createPng(180, 180, tgPixel));
console.log('Successfully generated all PWA icons!');
