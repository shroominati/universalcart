#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
// Generates minimal PNG icons for the UniversalCart extension.
// Uses only Node.js built-in modules (zlib for deflate).

const { deflateSync } = require("zlib");
const { writeFileSync, mkdirSync } = require("fs");
const { join } = require("path");

function createPNG(size, r, g, b) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0); // width
  ihdrData.writeUInt32BE(size, 4); // height
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 2; // color type (RGB)
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdr = makeChunk("IHDR", ihdrData);

  // IDAT chunk — pixel data
  // Each row: filter byte (0) + RGB pixels
  const rowSize = 1 + size * 3;
  const rawData = Buffer.alloc(rowSize * size);

  // Draw a rounded-ish gradient square with indigo-purple colors
  for (let y = 0; y < size; y++) {
    const offset = y * rowSize;
    rawData[offset] = 0; // no filter
    for (let x = 0; x < size; x++) {
      const px = offset + 1 + x * 3;

      // Gradient: top-left indigo → bottom-right purple
      const t = (x + y) / (2 * size);
      const cr = Math.round(r * (1 - t * 0.3));
      const cg = Math.round(g * (1 - t * 0.4));
      const cb = Math.round(b * (1 + t * 0.1));

      // Simple rounded corner mask
      const margin = Math.max(1, Math.round(size * 0.15));
      const inCorner = isInCorner(x, y, size, margin);
      if (inCorner) {
        rawData[px] = 9; // near black bg
        rawData[px + 1] = 9;
        rawData[px + 2] = 11;
      } else {
        rawData[px] = Math.min(255, cr);
        rawData[px + 1] = Math.min(255, cg);
        rawData[px + 2] = Math.min(255, Math.max(0, cb));
      }
    }
  }

  // Draw a simple shield shape in white at center
  if (size >= 16) {
    drawShield(rawData, size, rowSize);
  }

  const compressed = deflateSync(rawData);
  const idat = makeChunk("IDAT", compressed);

  // IEND chunk
  const iend = makeChunk("IEND", Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

function isInCorner(x, y, size, margin) {
  const corners = [
    [0, 0],
    [size - 1, 0],
    [0, size - 1],
    [size - 1, size - 1],
  ];
  for (const [cx, cy] of corners) {
    const dx = Math.abs(x - cx);
    const dy = Math.abs(y - cy);
    if (dx < margin && dy < margin) {
      const dist = Math.sqrt(
        (dx - margin) ** 2 + (dy - margin) ** 2
      );
      if (dist > margin * 0.6) return true;
    }
  }
  return false;
}

function drawShield(data, size, rowSize) {
  const cx = Math.floor(size / 2);
  const cy = Math.floor(size / 2);
  const scale = size / 24;

  // Shield outline points (simplified)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = (x - cx) / scale;
      const ny = (y - cy) / scale;

      // Simple shield shape
      const inShield =
        Math.abs(nx) < 5.5 - Math.max(0, ny - 2) * 0.8 &&
        ny > -5.5 &&
        ny < 6.5;
      const onEdge =
        inShield &&
        (Math.abs(Math.abs(nx) - (5 - Math.max(0, ny - 2) * 0.8)) < 0.8 ||
          Math.abs(ny - (-5)) < 0.8 ||
          (ny > 4 && Math.abs(nx) < 1.5));

      if (onEdge) {
        const px = y * rowSize + 1 + x * 3;
        data[px] = 255;
        data[px + 1] = 255;
        data[px + 2] = 255;
      }
    }
  }
}

function makeChunk(type, data) {
  const typeBytes = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);

  const crcInput = Buffer.concat([typeBytes, data]);
  const crc = crc32(crcInput);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc >>> 0);

  return Buffer.concat([length, typeBytes, data, crcBuf]);
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// Generate icons
const iconsDir = join(__dirname, "..", "icons");
mkdirSync(iconsDir, { recursive: true });

const sizes = [16, 48, 128];
for (const size of sizes) {
  const png = createPNG(size, 99, 102, 241); // indigo base
  const path = join(iconsDir, `icon${size}.png`);
  writeFileSync(path, png);
  console.log(`Generated ${path} (${png.length} bytes)`);
}
