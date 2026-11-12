// 큰 파일을 메모리에 통째로 올리지 않고 읽는 스트리밍 파서 (외부 의존성 없음).
//   streamJsonArray(url, onItem)  최상위가 JSON 배열인 파일 → 원소(객체) 하나씩 onItem(obj)
//   streamCsv(url, onRow, {sep})   따옴표·줄바꿈 포함 CSV → 행 하나씩 onRow(objByHeader)
// 둘 다 Node 내장 fetch의 body 스트림을 청크 단위로 처리한다. 원소 하나(수십 KB)만 문자열로 잡고 있다.
import { UA, sleep } from './util.mjs';

async function openStream(url, { timeout = 300000, headers = {}, tries = 2 } = {}) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), timeout);
    try {
      const res = await fetch(url, { signal: ctl.signal, redirect: 'follow', headers: { 'User-Agent': UA, ...headers } });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
      return { res, done: () => clearTimeout(t) };
    } catch (e) { clearTimeout(t); lastErr = e; if (i < tries - 1) await sleep(2000); }
  }
  throw lastErr;
}

async function* textChunks(res) {
  const dec = new TextDecoder('utf-8');
  for await (const chunk of res.body) yield dec.decode(chunk, { stream: true });
  const tail = dec.decode();
  if (tail) yield tail;
}

/**
 * 최상위 배열 [ {...}, {...} ] 의 원소를 하나씩 파싱한다.
 * 문자열 안의 괄호·이스케이프를 구분하는 작은 상태 기계. onItem이 false를 반환하면 중단.
 * @returns {Promise<{items:number, bytes:number}>}
 */
export async function streamJsonArray(url, onItem, opts = {}) {
  // itemDepth: 원소 객체의 중첩 깊이. 최상위 배열 [ {...} ] = 2 (기본), { "value": [ {...} ] } 처럼 한 겹 감싼 파일 = 3
  const ITEM = opts.itemDepth || 2;
  const { res, done } = await openStream(url, opts);
  let buf = '', depth = 0, inStr = false, esc = false, start = -1, items = 0, bytes = 0, stop = false;
  try {
    for await (const chunk of textChunks(res)) {
      bytes += chunk.length;
      const base = buf.length;
      buf += chunk;
      for (let i = base; i < buf.length; i++) {
        const ch = buf.charCodeAt(i);
        if (inStr) {
          if (esc) esc = false;
          else if (ch === 92) esc = true;        // \
          else if (ch === 34) inStr = false;     // "
          continue;
        }
        if (ch === 34) { inStr = true; continue; }
        if (ch === 123 || ch === 91) {           // { [
          depth++;
          if (depth === ITEM) start = i;
        } else if (ch === 125 || ch === 93) {    // } ]
          if (depth === ITEM && start >= 0) {
            const text = buf.slice(start, i + 1);
            items++;
            let obj; try { obj = JSON.parse(text); } catch { obj = null; }
            if (obj && onItem(obj) === false) { stop = true; break; }
            buf = buf.slice(i + 1); i = -1; start = -1;
          }
          depth--;
        }
      }
      if (stop) break;
      if (start < 0 && depth < ITEM) buf = ''; // 원소 사이 공백·쉼표는 버린다
    }
  } finally {
    done();
    if (stop) try { await res.body.cancel(); } catch { /* 무시 */ }
  }
  return { items, bytes };
}

/**
 * CSV 스트리밍 파서 (RFC 4180: "" 이스케이프, 따옴표 안 줄바꿈 허용). 첫 행은 헤더.
 * onRow(obj, rawArray) 가 false를 반환하면 중단.
 */
export async function streamCsv(url, onRow, { sep = ',', ...opts } = {}) {
  const { res, done } = await openStream(url, opts);
  const S = sep.charCodeAt(0);
  let field = '', row = [], inQ = false, header = null, rows = 0, stop = false, pendingQuote = false, bom = true;
  const endRow = () => {
    row.push(field); field = '';
    if (!header) { header = row.map(h => h.trim()); row = []; return; }
    if (row.length === 1 && row[0] === '') { row = []; return; }
    const o = {}; for (let k = 0; k < header.length; k++) o[header[k]] = row[k] ?? '';
    rows++;
    if (onRow(o, row) === false) stop = true;
    row = [];
  };
  try {
    for await (let chunk of textChunks(res)) {
      if (bom) { chunk = chunk.replace(/^﻿/, ''); bom = false; }
      let s = 0; // 현재 필드 조각 시작
      for (let i = 0; i < chunk.length; i++) {
        const ch = chunk.charCodeAt(i);
        if (pendingQuote) { // 직전 청크 끝이 따옴표였던 경우
          pendingQuote = false;
          if (ch === 34) { field += '"'; s = i + 1; continue; }
          inQ = false;
        }
        if (inQ) {
          if (ch === 34) {
            field += chunk.slice(s, i);
            if (i + 1 >= chunk.length) { pendingQuote = true; s = i + 1; continue; }
            if (chunk.charCodeAt(i + 1) === 34) { field += '"'; i++; s = i + 1; continue; }
            inQ = false; s = i + 1;
          }
          continue;
        }
        if (ch === 34) { field += chunk.slice(s, i); inQ = true; s = i + 1; continue; }
        if (ch === S) { field += chunk.slice(s, i); row.push(field); field = ''; s = i + 1; continue; }
        if (ch === 10 || ch === 13) {
          field += chunk.slice(s, i);
          if (ch === 13 && chunk.charCodeAt(i + 1) === 10) i++;
          if (!(ch === 10 && field === '' && row.length === 0 && i > 0 && chunk.charCodeAt(i - 1) === 13)) endRow();
          s = i + 1;
          if (stop) break;
        }
      }
      if (stop) break;
      field += chunk.slice(s);
    }
    if (!stop && (field || row.length)) endRow();
  } finally {
    done();
    if (stop) try { await res.body.cancel(); } catch { /* 무시 */ }
  }
  return { rows };
}
