// 외부 의존성 없이 앱 아이콘 PNG 생성: node scripts/make-icons.mjs
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0;
});
const crc = buf => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
  return Buffer.concat([len, td, c]);
}

// 0..1 좌표계에서 픽셀 색 결정 (불투명 배경: iOS는 투명 영역을 검게 칠함)
function pixel(x, y) {
  // 배경: 코랄 → 핑크 대각선 그라데이션
  const t = (x + y) / 2;
  let r = 255, g = 106 - 40 * t, b = 54 + 60 * t;
  const inRR = (x0, y0, x1, y1, rad) => {
    if (x < x0 || x > x1 || y < y0 || y > y1) return false;
    const cx = Math.min(Math.max(x, x0 + rad), x1 - rad), cy = Math.min(Math.max(y, y0 + rad), y1 - rad);
    return (x - cx) ** 2 + (y - cy) ** 2 <= rad * rad;
  };
  // 달력 본체(흰색)
  if (inRR(0.22, 0.27, 0.78, 0.80, 0.08)) {
    [r, g, b] = [255, 255, 255];
    // 상단 띠
    if (y < 0.40) [r, g, b] = [255, 228, 218];
    // 하트
    const hx = (x - 0.5) / 0.15, hy = (0.60 - y) / 0.15 + 0.25;
    if ((hx * hx + hy * hy - 1) ** 3 - hx * hx * hy ** 3 <= 0) [r, g, b] = [255, 80, 70];
  }
  // 고리 두 개
  if (inRR(0.34, 0.20, 0.40, 0.34, 0.03) || inRR(0.60, 0.20, 0.66, 0.34, 0.03)) [r, g, b] = [60, 30, 30];
  return [r, g, b].map(v => Math.round(Math.max(0, Math.min(255, v))));
}

function png(size) {
  const ss = 3; // 슈퍼샘플링 안티앨리어싱
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      let acc = [0, 0, 0];
      for (let sy = 0; sy < ss; sy++) for (let sx = 0; sx < ss; sx++) {
        const p = pixel((x + (sx + 0.5) / ss) / size, (y + (sy + 0.5) / ss) / size);
        acc = acc.map((v, i) => v + p[i]);
      }
      const o = y * (size * 3 + 1) + 1 + x * 3;
      acc.forEach((v, i) => { raw[o + i] = Math.round(v / (ss * ss)); });
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

mkdirSync('icons', { recursive: true });
writeFileSync('icons/apple-touch-icon.png', png(180));
writeFileSync('icons/icon-192.png', png(192));
writeFileSync('icons/icon-512.png', png(512));
console.log('icons written');
