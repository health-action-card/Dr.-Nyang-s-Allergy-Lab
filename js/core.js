/* =========================================================
   core.js — 저장, 날짜, 챌린지 계산, 화면 이동, 팝업, 공통 도구
   ========================================================= */
'use strict';

/* ---------- 작은 도구 ---------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const PLACES = ['home', 'school', 'outside'];
const MIN_RULES = 3, MAX_RULES = 7, NAME_MAX = 5, CUSTOM_MAX = 30;

/* 받침 판별 → 조사 */
function hasBatchim(word) {
  const c = String(word || '').trim().slice(-1).charCodeAt(0);
  if (!(c >= 0xAC00 && c <= 0xD7A3)) return false;
  return (c - 0xAC00) % 28 !== 0;
}
const josaUi = n => (hasBatchim(n) ? '이의' : '의');   // 건강이의 / 민수의
const josaNeun = n => (hasBatchim(n) ? '이는' : '는');  // 김치원이는 / 민수는

const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

/* ---------- 저장 (이 기기의 LocalStorage에만) ---------- */
const PREVIEW = new URLSearchParams(location.search).has('preview'); // 선생님 설정 미리 보기(iframe)
const KEY = PREVIEW ? 'preview.promiseCard.' : 'promiseCard.';
const CFG_KEY = PREVIEW ? 'preview.appConfig' : 'appConfig';
const Store = {
  get(k, d = null) { try { const v = localStorage.getItem(KEY + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(KEY + k, JSON.stringify(v)); } catch (e) { toast('저장 공간에 저장하지 못했어요.'); } },
  clearAll() { try { Object.keys(localStorage).filter(k => k.startsWith(KEY)).forEach(k => localStorage.removeItem(k)); } catch (e) {} },
  hasRecord() { return !!(Store.get('cardNo') || Store.get('challenge')); },
  snapshot() {
    const o = {};
    try { Object.keys(localStorage).filter(k => k.startsWith(KEY) || k === 'appConfig').forEach(k => { o[k] = localStorage.getItem(k); }); } catch (e) {}
    return o;
  },
  restore(o) { try { Object.entries(o).forEach(([k, v]) => localStorage.setItem(k, v)); } catch (e) {} }
};
const Config = {
  get() { try { return Object.assign({ mode: 'class', board: '' }, JSON.parse(localStorage.getItem(CFG_KEY) || '{}')); } catch (e) { return { mode: 'class', board: '' }; } },
  set(c) { try { localStorage.setItem(CFG_KEY, JSON.stringify(c)); } catch (e) {} }
};
const Draft = {
  get() { try { return Object.assign({ mode: 'class', board: '' }, JSON.parse(localStorage.getItem('teacherPanel.draft') || '{}')); } catch (e) { return { mode: 'class', board: '' }; } },
  set(c) { try { localStorage.setItem('teacherPanel.draft', JSON.stringify(c)); } catch (e) {} }
};

/* ---------- 날짜 (한국 시간 기준) ---------- */
const DateK = {
  override: null, // 테스트용: 주소에 ?today=2026-11-05
  today() {
    if (DateK.override) return DateK.override;
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  },
  parse(s) { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); },
  str(dt) { return dt.toISOString().slice(0, 10); },
  add(s, n) { const d = DateK.parse(s); d.setUTCDate(d.getUTCDate() + n); return DateK.str(d); },
  dow(s) { return DateK.parse(s).getUTCDay(); },
  isSchoolDay(s) { const w = DateK.dow(s); return w !== 0 && w !== 6 && !(window.HOLIDAYS || []).includes(s); },
  md(s) { const [, m, d] = s.split('-').map(Number); return `${m}/${d}`; },
  wd(s) { return '일월화수목금토'[DateK.dow(s)]; },
  label(s) { return `${DateK.md(s)} ${DateK.wd(s)}요일`; },
  short(s) { return `${DateK.md(s)}(${DateK.wd(s)})`; },
  nextSchoolDays(from, n = 5) { const out = []; let d = from; while (out.length < n) { d = DateK.add(d, 1); if (DateK.isSchoolDay(d)) out.push(d); } return out; }
};

/* ---------- 고른 수칙 (집 → 학교 → 밖, 각 장소 안에서는 고른 순서) ---------- */
function selectedRules() {
  const rules = Store.get('rules', { home: [], school: [], outside: [] });
  const custom = Store.get('custom', { home: [], school: [], outside: [] });
  const out = [];
  PLACES.forEach(p => {
    const data = window.RULES_DATA[p];
    (rules[p] || []).forEach(id => { const r = data.rules.find(x => x.id === id); if (r) out.push({ id: r.id, text: r.text, place: p, mine: false, type: r.type || 'daily' }); });
    (custom[p] || []).filter(c => c.checked).forEach(c => out.push({ id: c.id, text: c.text, place: p, mine: true, type: 'daily' }));
  });
  return out;
}
const needCount = n => Math.ceil(n * 0.8);

/* ---------- 챌린지 계산 ---------- */
const Challenge = {
  get() { return Store.get('challenge', null); },
  create() {
    const c = { days: DateK.nextSchoolDays(DateK.today(), 5), log: {}, stars: [] };
    Store.set('challenge', c); return c;
  },
  dayComplete(c, d, rules = selectedRules()) { const l = c.log[d] || {}; return rules.length > 0 && rules.every(r => ['O','X'].includes(l[r.id])); },
  oCount(c, d) { return Object.values(c.log[d] || {}).filter(v => v === 'O').length; },
  status(c = Challenge.get()) {
    if (!c) return 'none';
    const t = DateK.today(), first = c.days[0], last = c.days[c.days.length - 1];
    if (t > last) return 'ended';
    if (t === last && Challenge.dayComplete(c, last)) return 'ended';
    if (t < first) return 'before';
    if (c.days.includes(t)) return 'active';
    return 'rest';
  },
  /* 날짜 칸 상태: star / nostar / miss / today / future */
  dayState(c, d) {
    const t = DateK.today(), rules = selectedRules();
    if (Challenge.dayComplete(c, d, rules)) return Challenge.oCount(c, d) >= needCount(rules.length) ? 'star' : 'nostar';
    if (d < t) return 'miss';
    if (d === t) return 'today';
    return 'future';
  },
  recompute(c, d) {
    const rules = selectedRules();
    c.stars = c.stars.filter(x => x !== d);
    if (Challenge.dayComplete(c, d, rules) && Challenge.oCount(c, d) >= needCount(rules.length)) c.stars.push(d);
    c.stars.sort(); Store.set('challenge', c); return c;
  },
  nextCheckDay(c) { const t = DateK.today(); return c.days.find(d => d > t) || null; }
};

/* ---------- 화면 이동 + 뒤로 가기 ---------- */
const Router = {
  screens: {},
  current: null,
  go(name, params = {}, opt = {}) {
    const state = { s: name, p: params };
    if (opt.replace) history.replaceState(state, '', location.pathname + location.search);
    else history.pushState(state, '', location.pathname + location.search);
    Router.render(state);
  },
  guard: null, // 화면을 떠나기 전에 확인할 함수 (true를 돌려주면 뒤로 가기를 막음)
  render(state) {
    Modal.close(true);
    Router.guard = null;
    Router.current = state;
    const fn = Router.screens[state.s] || Router.screens.S00;
    const app = $('#app');
    app.className = 'screen screen-' + state.s;
    app.innerHTML = '';
    window.scrollTo(0, 0);
    Stage.fit();
    fn(app, state.p || {});
    SoundBtn.update(state.s);
    Orient.check();
  }
};
window.addEventListener('popstate', e => {
  if (Modal.isOpen()) {             // 팝업이 열려 있으면 뒤로 가기 = 취소
    Modal.back();
    history.pushState(Router.current, '', location.pathname + location.search);
    return;
  }
  if (Router.guard && Router.guard(e.state)) {   // 저장 안 한 변경 등: 화면이 직접 처리
    history.pushState(Router.current, '', location.pathname + location.search);
    return;
  }
  if (e.state && e.state.s) Router.render(e.state);
});

/* ---------- 소리 켜기/끄기 버튼 (학생 화면 오른쪽 위, S00·선생님 설정 제외) ---------- */
const SoundBtn = {
  el: null,
  update(screen) {
    if (!SoundBtn.el) {
      const b = document.createElement('button');
      b.id = 'soundBtn'; b.type = 'button';
      b.addEventListener('click', () => { setSound(!Sfx.on); SoundBtn.paint(); if (Sfx.on) playSfx('tap'); });
      $('#stage').appendChild(b); SoundBtn.el = b;
    }
    const hide = PREVIEW || screen === 'S00' || screen === 'T49' || screen === 'T50';
    SoundBtn.el.hidden = hide; SoundBtn.paint();
  },
  paint() { if (!SoundBtn.el) return; SoundBtn.el.textContent = Sfx.on ? '🔊' : '🔇'; SoundBtn.el.setAttribute('aria-label', Sfx.on ? '효과음 끄기' : '효과음 켜기'); }
};

/* 움직임 한 번 다시 재생 (nod, hop, pop, shake) */
function replay(el, cls) { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }

/* ---------- 팝업 ---------- */
const Modal = {
  el: null, onBack: null,
  open(html, { onBack = null, cls = '', sfx = 'open' } = {}) {
    Modal.close(true);
    if (sfx) playSfx(sfx);
    const wrap = document.createElement('div');
    wrap.className = 'modal-dim ' + cls;
    wrap.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${html}</div>`;
    $('#layer').appendChild(wrap);
    document.body.classList.add('no-scroll');
    Modal.el = wrap; Modal.onBack = onBack;
    const first = wrap.querySelector('[data-autofocus]'); if (first) setTimeout(() => first.focus(), 30);
    return wrap;
  },
  isOpen() { return !!Modal.el; },
  back() { const fn = Modal.onBack; Modal.close(); if (fn) fn(); },
  close(silent) { if (Modal.el) { Modal.el.remove(); Modal.el = null; Modal.onBack = null; document.body.classList.remove('no-scroll'); } }
};

/* ---------- 알림(토스트) ---------- */
let toastTimer;
function toast(msg, ms = 1800) {
  let t = $('#toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; $('#layer').appendChild(t); }
  t.innerHTML = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), ms);
}

/* ---------- 연타 방지 버튼 ---------- */
function onTap(el, fn) {
  if (!el) return;
  let busy = false;
  el.addEventListener('click', async e => {
    if (busy || el.disabled) return;
    busy = true;
    try { await fn(e); } finally { setTimeout(() => (busy = false), 350); }
  });
}

/* ---------- 숨은 5번 터치 (선생님 설정) ---------- */
function secretTap(el, onUnlock) {
  if (!el) return;
  let times = [];
  el.addEventListener('click', () => {
    const now = Date.now();
    if (times.length && now - times[times.length - 1] > 1000) times = [];
    times.push(now); times = times.filter(t => now - t <= 3000);
    if (times.length >= 5) { times = []; onUnlock(); }
  });
}

/* ---------- 태블릿: 1600×900 화면을 기기에 맞춰 확대·축소 ---------- */
const Stage = {
  W: 1600, H: 900,
  fit() {
    const w = window.innerWidth, h = window.innerHeight;
    const tablet = w >= 700 && (w >= h || w >= 900);
    document.body.classList.toggle('tablet', tablet);
    document.body.classList.toggle('phone', !tablet);
    const st = document.getElementById('stage');
    if (!st) return;
    if (tablet) { const s = Math.min(w / Stage.W, h / Stage.H); st.style.setProperty('--s', s); }
    else st.style.removeProperty('--s');
  }
};
window.addEventListener('resize', () => Stage.fit());

/* ---------- 화면 방향 안내 ---------- */
const Orient = {
  check() {
    const o = $('#orient');
    if (!o) return;
    const teacher = Router.current && /^T/.test(Router.current.s);
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    const short = Math.min(screen.width, screen.height);
    const tablet = short >= 600;
    const portrait = window.innerHeight > window.innerWidth;
    const lab = Router.current && /^S(0\d|1\d|2\d|3[0-8])/.test(Router.current.s);   // 연구소(S00~S38A)는 장면 그림이라 휴대폰도 가로
    let msg = '';
    if (coarse && !teacher) {
      if (tablet && portrait) msg = '태블릿을 <b>가로로</b> 돌려 주세요';
      if (!tablet && lab && portrait) msg = '연구소는 휴대폰을 <b>가로로</b> 돌려서 봐요';
      if (!tablet && !lab && !portrait) msg = '휴대폰을 <b>세로로</b> 돌려 주세요';
    }
    o.querySelector('p').innerHTML = msg;
    o.classList.toggle('show', !!msg);
  }
};
window.addEventListener('resize', () => Orient.check());
window.addEventListener('orientationchange', () => setTimeout(Orient.check, 200));

/* ---------- 이미지 저장 (S44 카드, S48-2 메달 이미지 공통) ---------- */
async function saveCanvasPNG(canvas, filename) {
  const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
  if (!blob) throw new Error('이미지를 만들지 못했어요.');
  const file = new File([blob], filename, { type: 'image/png' });
  if (isIOS() && navigator.canShare && navigator.canShare({ files: [file] })) {
    await navigator.share({ files: [file], title: filename }); // 취소하면 AbortError
    return true;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return true;
}

/* ---------- 이미지 미리 불러오기 ---------- */
const imgCache = {};
function loadImg(src) {
  if (imgCache[src]) return imgCache[src];
  imgCache[src] = new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  return imgCache[src];
}

/* ---------- 클립보드 ---------- */
async function copyText(text, fallbackEl) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch (e) {
    if (fallbackEl) { const r = document.createRange(); r.selectNodeContents(fallbackEl); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }
    toast('길게 눌러 복사해 주세요'); return false;
  }
}

/* ---------- 홈 화면 앱 설치 이벤트 (안드로이드 Chrome) ---------- */
let deferredInstall = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstall = e; });
