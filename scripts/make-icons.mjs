// 외부 의존성 없이 앱 아이콘 PNG 생성: node scripts/make-icons.mjs
// 디자인: 노을빛 그라데이션 위에 살짝 기울어진 '티켓'(하트 + 절취선) + 반짝이
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

/* ---------- PNG 인코더 ---------- */
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

/* ---------- 도형 (signed distance, 0..1 좌표) ---------- */
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t); };
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
function sdRoundBox(px, py, bx, by, r) {
  const qx = Math.abs(px) - bx + r, qy = Math.abs(py) - by + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}
const rot = (x, y, a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
const inHeart = (x, y, s) => { const hx = x / s, hy = -y / s + 0.3; return (hx * hx + hy * hy - 1) ** 3 - hx * hx * hy ** 3 <= 0; };
const inSparkle = (x, y, cx, cy, s) => Math.sqrt(Math.abs(x - cx)) + Math.sqrt(Math.abs(y - cy)) <= Math.sqrt(s);

// 플랫 디자인: 그라데이션·글로우 없음, 모든 면은 단색 (docs/color-system.md §3)
const C = {
  bg: hex('#f26a1b'),          // 브랜드 주황 (에너지)
  shadow: hex('#c9500f'),      // 단색 하드 섀도 (블러 없음)
  card: hex('#fffbf4'),        // 웜화이트 티켓
  stubBg: hex('#fff1dc'),      // 스텁: 크림-앰버 단색
  perf: hex('#f5a524'),        // 절취선
  heart: hex('#e2400e'),       // 레드오렌지 하트 (관심 저장)
  stub: hex('#f5a524'),        // 스텁 별 (앰버, 낙관)
  spark: hex('#ffe9a8'),       // 연노랑 반짝이
};
const ANGLE = -9 * Math.PI / 180;
const BW = 0.285, BH = 0.195, BR = 0.055, NOTCH = 0.045, PERF_X = 0.115;

function sample(x, y) {
  let col = C.bg;

  // 카드 좌표계 (중심, 회전)
  const [cx, cy] = rot(x - 0.5, y - 0.53, -ANGLE);
  const dCard = () => {
    let d = sdRoundBox(cx, cy, BW, BH, BR);
    // 티켓 양옆 반원 홈 (절취선 위치)
    d = Math.max(d, NOTCH - Math.hypot(cx - PERF_X, cy - BH));
    d = Math.max(d, NOTCH - Math.hypot(cx - PERF_X, cy + BH));
    return d;
  };

  // 단색 하드 섀도: 같은 티켓 모양을 아래로 살짝 밀어 한 톤 진한 주황으로
  const [sx, sy] = rot(x - 0.5, y - 0.56, -ANGLE);
  let dShadow = sdRoundBox(sx - 0.0, sy, BW, BH, BR);
  dShadow = Math.max(dShadow, NOTCH - Math.hypot(sx - PERF_X, sy - BH));
  dShadow = Math.max(dShadow, NOTCH - Math.hypot(sx - PERF_X, sy + BH));
  if (dShadow <= 0) col = C.shadow;

  if (dCard() <= 0) {
    col = cx > PERF_X ? C.stubBg : C.card;
    // 절취선 (점선)
    if (Math.abs(cx - PERF_X) < 0.007 && Math.abs(cy) < BH - NOTCH - 0.012 && ((cy + 1) * 38) % 2 < 1.05) col = C.perf;
    // 하트
    if (inHeart(cx + 0.085, cy + 0.005, 0.105)) col = C.heart;
    // 스텁 안의 작은 별
    if (inSparkle(cx, cy, PERF_X + 0.085, 0, 0.05)) col = C.stub;
  }

  // 반짝이 (카드 밖)
  if (inSparkle(x, y, 0.76, 0.215, 0.075)) col = C.spark;
  if (inSparkle(x, y, 0.235, 0.80, 0.045)) col = C.spark;
  if (Math.hypot(x - 0.66, y - 0.13) < 0.012) col = C.spark;
  return col;
}

function png(size) {
  const ss = 4; // 4x4 슈퍼샘플링 안티앨리어싱
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const acc = [0, 0, 0];
      for (let sy = 0; sy < ss; sy++) for (let sx = 0; sx < ss; sx++) {
        const p = sample((x + (sx + 0.5) / ss) / size, (y + (sy + 0.5) / ss) / size);
        acc[0] += p[0]; acc[1] += p[1]; acc[2] += p[2];
      }
      const o = y * (size * 3 + 1) + 1 + x * 3;
      for (let i = 0; i < 3; i++) raw[o + i] = Math.round(clamp(acc[i] / (ss * ss), 0, 255));
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8bit RGB (불투명: iOS는 투명 영역을 검게 칠함)
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

mkdirSync('icons', { recursive: true });
for (const [name, size] of [['apple-touch-icon.png', 180], ['icon-192.png', 192], ['icon-512.png', 512], ['favicon-32.png', 32]]) {
  writeFileSync(`icons/${name}`, png(size));
}
console.log('icons written');
