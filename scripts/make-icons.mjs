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

const C = {
  bgA: hex('#ffc24d'), bgB: hex('#ff8a1f'), bgC: hex('#ee5a12'),
  // 색채 근거: docs/color-system.md §3 — 앰버(낙관)→주황(에너지), 웜화이트 티켓, 레드오렌지 하트, 연노랑 반짝이
  card: hex('#fffbf4'), cardShade: hex('#fff0d9'), perf: hex('#ffc98a'),
  heartA: hex('#ff8a1f'), heartB: hex('#e2400e'), stub: hex('#f5a524'), spark: hex('#ffe9a8'),
};
const ANGLE = -9 * Math.PI / 180;
const BW = 0.285, BH = 0.195, BR = 0.055, NOTCH = 0.045, PERF_X = 0.115;

function sample(x, y) {
  // 배경: 대각 그라데이션 + 좌상단 하이라이트
  const t = clamp((x * 0.55 + y * 0.75) / 1.3);
  let col = t < 0.6 ? mix(C.bgA, C.bgB, t / 0.6) : mix(C.bgB, C.bgC, (t - 0.6) / 0.4);
  const glow = Math.max(0, 1 - Math.hypot(x - 0.18, y - 0.12) / 0.6);
  col = mix(col, [255, 255, 255], glow * glow * 0.22);

  // 카드 좌표계 (중심, 회전)
  const [cx, cy] = rot(x - 0.5, y - 0.53, -ANGLE);
  const dCard = () => {
    let d = sdRoundBox(cx, cy, BW, BH, BR);
    // 티켓 양옆 반원 홈 (절취선 위치)
    d = Math.max(d, NOTCH - Math.hypot(cx - PERF_X, cy - BH));
    d = Math.max(d, NOTCH - Math.hypot(cx - PERF_X, cy + BH));
    return d;
  };

  // 그림자
  const [sx, sy] = rot(x - 0.5, y - 0.575, -ANGLE);
  const dShadow = sdRoundBox(sx, sy, BW, BH, BR);
  col = mix(col, hex('#7a3008'), (1 - smooth(-0.02, 0.07, dShadow)) * 0.28);

  if (dCard() <= 0) {
    // 카드 본체 + 아래쪽 은은한 음영
    col = mix(C.card, C.cardShade, smooth(-BH, BH, cy));
    // 오른쪽 스텁
    if (cx > PERF_X + 0.012) col = mix(col, hex('#fff8ec'), 0.9);
    // 절취선 (점선)
    if (Math.abs(cx - PERF_X) < 0.006 && Math.abs(cy) < BH - NOTCH - 0.01 && ((cy + 1) * 40) % 2 < 1.05) col = C.perf;
    // 하트
    const hx = cx + 0.085, hy = cy + 0.005;
    if (inHeart(hx, hy, 0.105)) col = mix(C.heartA, C.heartB, smooth(-0.1, 0.12, hy + hx * 0.4));
    // 하트 하이라이트
    if (Math.hypot(hx + 0.045, hy + 0.045) < 0.018) col = mix(col, [255, 255, 255], 0.55);
    // 스텁 안의 작은 별
    if (inSparkle(cx, cy, PERF_X + 0.085, 0, 0.05)) col = C.stub;
  }

  // 반짝이 (카드 밖)
  if (inSparkle(x, y, 0.76, 0.215, 0.075)) col = C.spark;
  if (inSparkle(x, y, 0.235, 0.80, 0.045)) col = mix(C.spark, [255, 255, 255], 0.3);
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
