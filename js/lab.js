/* =========================================================
   lab.js — 냥박사의 알레르기 연구소 (S00 ~ S38A)
   공통 틀: LabScene(그림+자리) · Story · Lobby · Place · Observe · Info · Done · Finish · Guide · Cards · Cope · Quiz
   데이터: data/lab-items.js (window.LAB)
   저장: promiseCard.labFound {home,school,ground} · promiseCard.labComplete (LocalStorage)
         카드·대처·기억 체크 진행은 앱 메모리(LabState)에만
   ========================================================= */
'use strict';

const LAB_DIR = 'assets/lab/';
const LabState = { cardsSeen: [], copeSeen: { light: false, severe: false }, quizDone: false, doneShown: {} };
const LAB_REDUCED = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const PLACE_OF = { home: 'S06', school: 'S15', ground: 'S24' };

/* ---------- 저장 ---------- */
const LabFound = {
  get() { const f = Store.get('labFound', null) || {}; return { home: f.home || [], school: f.school || [], ground: f.ground || [] }; },
  add(place, item) { const f = LabFound.get(); if (!f[place].includes(item)) f[place].push(item); Store.set('labFound', f); },
  reset() { Store.set('labFound', { home: [], school: [], ground: [] }); LabState.cardsSeen = []; LabState.copeSeen = { light: false, severe: false }; LabState.quizDone = false; LabState.doneShown = {}; },
  count(place) { return LabFound.get()[place].length; },
  total() { const f = LabFound.get(); return f.home.length + f.school.length + f.ground.length; },
  firstMissing() { return ['home', 'school', 'ground'].find(p => LabFound.count(p) < 4); }
};

/* ---------- 글자: [ ] 파랑 · {{ }} 분홍 ---------- */
const labFmt = t => String(t).replace(/\{\{(.+?)\}\}/g, '<b class="lp">$1</b>').replace(/\[([^\]]+)\]/g, '<b class="lb">$1</b>');
const R = r => `left:${r[0]}%;top:${r[1]}%;width:${r[2]}%;height:${r[3]}%`;

/* 타이핑: 태그는 통째로, 글자는 하나씩 */
function labType(el, html, speed = 45) {
  const parts = html.match(/<[^>]+>|[^<]/g) || [];
  const total = parts.filter(p => p[0] !== '<').length;
  if (LAB_REDUCED()) { el.innerHTML = html; return () => {}; }
  let shown = 0, timer;
  const paint = () => { let n = 0, out = ''; for (const p of parts) { if (p[0] === '<') out += p; else if (n++ < shown) out += p; } el.innerHTML = out; };
  const step = () => { shown++; paint(); if (shown < total) timer = setTimeout(step, speed); };
  step();
  return () => { clearTimeout(timer); shown = total; paint(); };   // 건너뛰기
}

/* 상자 크기에 맞게 글자 크기 맞추기 (안쪽 글자 덩어리가 상자를 넘지 않을 때까지 줄임) */
function labFit(el, max = 0.42) {
  const fit = () => {
    const h = el.clientHeight, w = el.clientWidth; if (!h) return;
    const inner = el.firstElementChild || el;
    const cur = inner.innerHTML; if (el._full) inner.innerHTML = el._full;   // 타이핑 중이어도 완성된 글자로 크기 재기
    let fs = h * max; el.style.fontSize = fs + 'px';
    for (let i = 0; i < 40 && (inner.offsetHeight > h * 0.96 || inner.scrollWidth > w * 0.98); i++) { fs *= 0.93; el.style.fontSize = fs + 'px'; }
    if (el._full) inner.innerHTML = cur;
  };
  el._fit = fit;
  fit();
  if (window.ResizeObserver && !el._ro) { el._ro = new ResizeObserver(() => el._fit()); el._ro.observe(el); }
  return fit;
}

/* ---------- 장면 틀: 흐린 배경 + 그림 + 위에 얹는 자리 ---------- */
function labScene(app, key, { bar = false, cls = '' } = {}) {
  const [file, w, h] = LAB.img[key];
  const src = LAB_DIR + 'scenes/' + file;
  app.classList.add('screen-lab');
  app.innerHTML = `
  <div class="lab ${cls}" style="--ar:${w}/${h}; --arn:${w / h}">
    <img class="lab-bg" src="${src}" alt="" aria-hidden="true">
    <div class="lab-fit"><div class="lab-pic"><img class="lab-img" src="${src}" alt="" draggable="false"></div></div>
    ${bar ? '<div class="lab-bar"></div>' : ''}
  </div>`;
  return { root: $('.lab', app), pic: $('.lab-pic', app), bar: $('.lab-bar', app), src };
}
function labEl(pic, cls, r, html = '', tag = 'div') {
  const e = document.createElement(tag);
  e.className = cls; if (r) e.style.cssText = R(r);
  if (tag === 'button') e.type = 'button';
  e.innerHTML = html; pic.appendChild(e); return e;
}
function labHot(pic, r, label, fn, cls = '') {
  const b = labEl(pic, 'lab-hot ' + cls, r, '', 'button');
  b.setAttribute('aria-label', label); onTap(b, fn); return b;
}
/* 그림의 다른 곳을 잘라 와 덮기 (기획용 배지·옛 화살표 가리기) */
function labPatch(pic, src, p) {
  const e = labEl(pic, 'lab-patch', p.r);
  const im = document.createElement('img'); im.src = src; im.alt = ''; im.setAttribute('aria-hidden', 'true');
  im.style.cssText = `width:${100 / p.r[2] * 100}%;left:${-p.from[0] / p.r[2] * 100}%;top:${-p.from[1] / p.r[3] * 100}%`;
  e.appendChild(im); return e;
}
/* 말풍선 글자 덮기 (흰 바탕 + 새 글자) */
function labBubble(pic, r, line, { type = true } = {}) {
  const inset = [r[0] + r[2] * 0.025, r[1] + r[3] * 0.06, r[2] * 0.95, r[3] * 0.84];
  const c = labEl(pic, 'lab-cover', inset, '<span class="lab-txt"></span>');
  const t = $('.lab-txt', c);
  t.innerHTML = labFmt(line); c._full = labFmt(line); labFit(c, 0.3);
  if (!type) return () => {};
  const skip = labType(t, labFmt(line));
  c.addEventListener('click', skip);
  return skip;
}
function labSign(pic) { return labEl(pic, 'lab-sign', LAB.sign, `<span>🐾 냥박사의 알레르기 연구소 🐾</span>`); }
function labConfetti() {
  if (LAB_REDUCED()) return;
  const box = document.createElement('div'); box.className = 'confetti'; box.style.pointerEvents = 'none';
  const cols = ['#f0196e', '#ffd43b', '#4fa0ff', '#4fcf6a', '#9a6bff'];
  for (let i = 0; i < 40; i++) { const s = document.createElement('i'); s.style.left = Math.random() * 100 + '%'; s.style.background = cols[i % 5]; s.style.animationDelay = Math.random() * .6 + 's'; s.style.transform = `rotate(${Math.random() * 360}deg)`; box.appendChild(s); }
  $('#layer').appendChild(box); setTimeout(() => box.remove(), 3200);
}
const labGo = (to, p = {}, o = {}) => Router.go(to, p, o);

/* ===================== S00 첫 화면 ===================== */
Router.screens.S00 = (app) => {
  const { pic } = labScene(app, 'S00', { cls: 'lab-s00' });
  labHot(pic, LAB.S00.enter, '입장해주세요', () => { playSfx('next'); labGo('S01'); }, 'ring pulse pill');
  LAB.S00.secret.forEach(r => { const s = labEl(pic, 'lab-secret', r, '', 'button'); s.setAttribute('aria-label', '냥박사'); secretTap(s, () => openTeacher('S00')); });
};

/* ===================== S01~S04 이야기 (LabStory) ===================== */
Object.entries(LAB.story).forEach(([key, d]) => {
  Router.screens[key] = (app) => {
    const { pic } = labScene(app, key);
    labHot(pic, d.next, d.label || '다음', () => { playSfx('next'); labGo(d.go); }, 'ring pulse ' + (d.label ? 'pill' : 'round'));
  };
});

/* ===================== S05 활동 선택 (LabLobby) ===================== */
Router.screens.S05 = (app) => {
  const { pic } = labScene(app, 'S05');
  const a = labHot(pic, LAB.S05.lab, '알레르기 완벽 파악 시작하기', () => { playSfx('next'); replay(a, 'pop'); LabFound.reset(); labGo('S06'); }, 'card');
  const b = labHot(pic, LAB.S05.shield, '나만의 알레르기 방패 시작하기', () => { playSfx('next'); replay(b, 'pop'); labGo('S39'); }, 'card');
};

/* ===================== 장소 메인 (LabPlace: S06 · S15 · S24) ===================== */
Object.entries(LAB.places).forEach(([place, d]) => {
  Router.screens[d.scene] = (app, p) => {
    const { pic, src } = labScene(app, d.scene);
    (d.patches || []).forEach(x => labPatch(pic, src, x));
    const found = LabFound.get()[place];
    const n = found.length;
    /* 찾은 개수 */
    labEl(pic, 'lab-count' + (d.counterRow ? ' row' : ''), d.counter, `<span>찾은 개수</span><b>${n} / 4</b>`);
    /* 트레이: 못 찾은 칸은 회색, 찾은 칸은 ✓ */
    Object.entries(d.tray).forEach(([item, t]) => {
      const done = found.includes(item);
      const e = labEl(pic, 'lab-slot' + (done ? ' done' : ''), null, done ? '<i>✓</i>' : '');
      e.style.cssText = `left:${t[0]}%;top:${t[1]}%;width:${t[2]}%`;
      if (p.just === item) { replay(e, 'pop'); }
    });
    /* 바코드 */
    const btns = d.points.map((pt, i) => {
      const done = found.includes(pt.item);
      const b = labHot(pic, pt.r, done ? '이미 찾은 단서 다시 보기' : '바코드 스캔', () => { playSfx('scan'); labGo(pt.go); }, 'bc' + (done ? ' done' : ' pulse'));
      b.style.animationDelay = (i * 0.15) + 's';
      if (done) b.innerHTML = '<i>✓</i>';
      return b;
    });
    /* 힌트 */
    labHot(pic, d.hint, '힌트', () => {
      const i = d.points.findIndex(pt => !found.includes(pt.item));
      if (i < 0) return;
      playSfx('tab'); btns.forEach(b => b.classList.remove('glow')); replay(btns[i], 'glow');
      setTimeout(() => btns[i].classList.remove('glow'), 3000);
    });
    /* 4개 모두 → 완료 팝업 */
    if (n >= 4) {
      const go = () => { if (Router.current && Router.current.s === d.scene) labDone(d.done); };
      setTimeout(go, p.just ? 700 : 250);
      const again = labEl(pic, 'lab-again', null, `<button class="btn pink big" type="button">${d.done === 'S33' ? '연구 결과 보기 ›' : '다음 장소로 ›'}</button>`);
      onTap($('button', again), () => { playSfx('tap'); labDone(d.done); });
    }
  };
});

/* ===================== 관찰 화면 (LabObserve) ===================== */
Object.entries(LAB.observe).forEach(([key, d]) => {
  Router.screens[key] = (app) => {
    const { pic, src } = labScene(app, key);
    (d.patches || []).forEach(x => labPatch(pic, src, x));
    playSfx('scan');
    replay(pic, 'pop');
    labBubble(pic, d.bubble, d.line);
    let busy = false;
    const go = (el) => {
      if (busy) return; busy = true;
      playSfx('tap'); replay(el, 'shake'); el.classList.add('flash');
      setTimeout(() => labGo(d.next), LAB_REDUCED() ? 0 : 480);
    };
    d.hits.forEach(r => { const h = labHot(pic, r, '눌러 보기', () => go(h), 'obj pulse'); });
    if (d.barcode) { const b = labHot(pic, d.barcode, '바코드', () => go(b), 'bc pulse'); }
  };
});

/* ===================== 증상과 예방법 (LabInfo) ===================== */
Object.entries(LAB.info).forEach(([key, d]) => {
  Router.screens[key] = (app) => {
    const { pic, bar } = labScene(app, key, { bar: true });
    if (d.swap) { const s = labEl(pic, 'lab-swap', d.swap.r); s.innerHTML = `<img src="${LAB_DIR + d.swap.img}" alt="두드러기로 팔을 긁는 아이">`; }
    const box = [d.box[0], d.box[1] - 4, d.box[2], d.box[3] + 4];
    const tips = labEl(pic, 'lab-tips', box, `<b class="lab-badge">예방법!</b><ul>${d.tips.map(t => `<li>${labFmt(t)}</li>`).join('')}</ul>`);
    const ul = $('ul', tips);
    const fitList = () => { const n = d.tips.length, longest = Math.max(...d.tips.map(t => t.length)); ul.style.fontSize = Math.min(ul.clientHeight / (n * 1.55), ul.clientWidth / (longest + 2.2)) + 'px'; };
    fitList(); if (window.ResizeObserver) new ResizeObserver(fitList).observe(ul);
    const lis = $$('li', tips);
    bar.innerHTML = `<button class="btn green big lab-ok" type="button" hidden>알겠어요! ✓</button>`;
    const ok = $('.lab-ok', bar);
    const timers = [];
    const showAll = () => { timers.forEach(clearTimeout); lis.forEach(li => li.classList.add('on')); ok.hidden = false; ok.classList.add('pulse'); };
    if (LAB_REDUCED()) showAll();
    else {
      lis.forEach((li, i) => timers.push(setTimeout(() => { li.classList.add('on'); playSfx('tap'); }, 600 + i * 550)));
      timers.push(setTimeout(showAll, 600 + lis.length * 550 + 200));
    }
    pic.addEventListener('click', showAll);
    onTap(ok, () => {
      playSfx('check'); LabFound.add(d.place, d.item);
      labGo(PLACE_OF[d.place], { just: d.item }, { replace: true });
    });
  };
});

/* ===================== 장소 완료 팝업 (LabDone: S14A · S23A · S33) ===================== */
function labDone(key) {
  const d = LAB.done[key], [file, w, h] = LAB.img[key];
  const m = Modal.open(`<div class="lab-pop" style="--ar:${w}/${h}"><img src="${LAB_DIR}scenes/${file}" alt="장소별 연구 완료! 알레르기 유발물질 4가지를 모두 찾았어!"></div>`,
    { cls: 'lab-done', sfx: null, onBack: () => {} });
  playSfx('fanfare'); labConfetti();
  const pic = $('.lab-pop', m);
  if (d.ribbon) labEl(pic, 'lab-ribbon', d.ribbon.r, `<span>${d.ribbon.text}</span>`);
  const b = labEl(pic, 'lab-hot ring pulse pill' + (d.label ? ' lab-pinkbtn' : ''), d.btn, d.label ? `<span>${d.label}</span>` : '', 'button');
  b.setAttribute('aria-label', d.label || '다음 장소로');
  onTap(b, () => {
    playSfx('tap');
    if (d.next === 'S36-1' && LabFound.total() < 12) { Modal.close(); return labGo(PLACE_OF[LabFound.firstMissing()]); }
    Modal.close(); labGo(d.next);
  });
}

/* ===================== S36-1 연구 완료 축하 (LabFinish) ===================== */
function labNeed12() { if (LabFound.total() >= 12) return false; labGo(PLACE_OF[LabFound.firstMissing()], {}, { replace: true }); return true; }
Router.screens['S36-1'] = (app) => {
  if (labNeed12()) return;
  Store.set('labComplete', true);
  const { pic, src } = labScene(app, 'S36-1');
  labPatch(pic, src, LAB.badge); labSign(pic);
  playSfx('fanfare'); labConfetti(); replay(pic, 'pop');
  labHot(pic, LAB['S36-1'].next, '다음', () => { playSfx('next'); labGo('S36-2'); }, 'ring pulse pill');
};

/* ===================== S36-2 증상카드 학습안내 (LabGuide) ===================== */
Router.screens['S36-2'] = (app) => {
  if (labNeed12()) return;
  const { pic, src } = labScene(app, 'S36-2');
  labPatch(pic, src, LAB.badge); labSign(pic);
  const f = LAB['S36-2'].fix; const c = labEl(pic, 'lab-cover flat', f.r, `<span class="lab-txt">${f.text}</span>`); labFit(c, 0.78);
  labHot(pic, LAB['S36-2'].next, '알겠어요', () => { playSfx('next'); labGo('S36-3'); }, 'ring pulse pill');
};

/* ===================== S36-3 ~ S36-6 증상 카드 (LabCards, 한 화면) ===================== */
Router.screens['S36-3'] = (app) => {
  if (labNeed12()) return;
  const C = LAB.cards;
  const { pic, src } = labScene(app, 'S36-3');
  labPatch(pic, src, LAB.badge); labSign(pic);
  const bub = labEl(pic, 'lab-cover lab-cbub', [C.bubble[0] + 1.2, C.bubble[1] + 1.6, C.bubble[2] - 2.4, C.bubble[3] - 3.2], '<span class="lab-txt"></span>');
  const txt = $('.lab-txt', bub);
  let sel = null, lockTimer;
  const lineFor = n => n >= 7 ? C.lines[7] : n >= 2 ? C.lines[2] : C.lines[n];
  const say = (t, type) => { txt.innerHTML = labFmt(t); bub._full = labFmt(t); labFit(bub, 0.34); if (type) labType(txt, labFmt(t)); };
  const cards = C.list.map(c => {
    const b = labEl(pic, 'lab-card', [c.x, C.top, C.w, C.h], `<span class="lab-clabel">${c.label}</span>`, 'button');
    b.setAttribute('aria-label', '증상 카드');
    onTap(b, () => pick(c.id));
    return b;
  });
  const mkBtn = (r, cls, label, go, type) => {
    const b = labEl(pic, 'lab-cbtn ' + cls, r, '', 'button');
    b.innerHTML = `<span class="lk">🔒</span><span>${label}</span><i class="seen">✓</i>`;
    onTap(b, () => {
      if (LabState.cardsSeen.length < 7) { replay(b, 'shake'); clearTimeout(lockTimer); say(C.lines.lock); lockTimer = setTimeout(() => say(lineFor(LabState.cardsSeen.length)), 2000); return; }
      playSfx('tap'); labGo(go);
    });
    b.dataset.type = type; return b;
  };
  const bl = mkBtn(C.btnLight, 'yellow', '가벼운 증상 대처 방법 ›', 'S37', 'light');
  const bs = mkBtn(C.btnSevere, 'pink', '위급한 증상 대처 방법 ›', 'S38', 'severe');
  const paint = (fresh) => {
    const seen = LabState.cardsSeen, all = seen.length >= 7;
    cards.forEach((b, i) => { const id = C.list[i].id; b.classList.toggle('seen', seen.includes(id)); b.classList.toggle('sel', sel === id); });
    [bl, bs].forEach(b => { b.classList.toggle('locked', !all); b.classList.toggle('did', LabState.copeSeen[b.dataset.type]); b.setAttribute('aria-disabled', String(!all)); });
    if (fresh && all) { [bl, bs].forEach((b, i) => setTimeout(() => replay(b, 'pop'), 300 + i * 150)); }
  };
  function pick(id) {
    const first = !LabState.cardsSeen.includes(id);
    sel = id; playSfx('tap');
    if (first) LabState.cardsSeen.push(id);
    const n = LabState.cardsSeen.length;
    const b = cards[C.list.findIndex(c => c.id === id)];
    if (first) replay($('.lab-clabel', b), 'rise');
    if (first && n === 7) { setTimeout(() => { sel = null; playSfx('check'); say(C.lines[7]); replay(bub, 'star-pop'); paint(true); }, 350); }
    else say(lineFor(n));
    paint(false);
  }
  say(lineFor(LabState.cardsSeen.length), true); paint(false);
  if (!LabState.cardsSeen.length) cards.forEach((b, i) => { b.style.animationDelay = i * 0.08 + 's'; replay(b, 'pop'); });
};

/* ===================== S37 · S38 대처 방법 (LabCope) ===================== */
['S37', 'S38'].forEach(key => {
  Router.screens[key] = (app) => {
    if (labNeed12()) return;
    if (LabState.cardsSeen.length < 7) return labGo('S36-3', {}, { replace: true });
    const d = LAB.cope[key], K = LAB.cope;
    const { pic } = labScene(app, key, { cls: 'lab-cope' });
    LabState.copeSeen[d.type] = true;
    replay(pic, 'pop');
    /* 단계가 하나씩 강조 */
    const steps = K.steps[d.type].map(r => labEl(pic, 'lab-step', r));
    let shown = false;
    const back = labEl(pic, 'lab-cbtn white', K.back, '<span>‹ 증상 카드로</span>', 'button');
    const right = labEl(pic, 'lab-cbtn', K.right, '', 'button');
    const both = () => LabState.copeSeen.light && LabState.copeSeen.severe;
    const paintRight = () => {
      if (!both()) { right.className = 'lab-cbtn on ' + d.otherStyle; right.innerHTML = `<span>${d.otherLabel}</span>`; }
      else if (!LabState.quizDone) { right.className = 'lab-cbtn on blue glowloop'; right.innerHTML = '<span>기억 체크하기 ›</span>'; }
      else { right.className = 'lab-cbtn on blue glowloop'; right.innerHTML = '<span>방패 만들러 가기 ›</span>'; }
    };
    const reveal = () => { if (shown) return; shown = true; [back, right].forEach(b => b.classList.add('on')); paintRight(); if (both()) { playSfx('check'); replay(right, 'pop'); } };
    if (LAB_REDUCED()) reveal();
    else { steps.forEach((s, i) => setTimeout(() => { replay(s, 'glow'); playSfx('tap'); }, 500 + i * 700)); setTimeout(reveal, 500 + steps.length * 700); }
    pic.addEventListener('click', e => { if (!e.target.closest('.lab-cbtn')) reveal(); });
    onTap(back, () => { playSfx('tap'); labGo('S36-3'); });
    onTap(right, () => {
      playSfx('tap');
      if (!both()) return labGo(d.other);
      if (!LabState.quizDone) return labGo('S38A');
      Store.set('labComplete', true); labGo('S39');
    });
  };
});

/* ===================== S38A 기억 체크 (LabQuiz) ===================== */
Router.screens.S38A = (app) => {
  if (labNeed12()) return;
  if (!(LabState.copeSeen.light && LabState.copeSeen.severe)) return labGo('S36-3', {}, { replace: true });
  const Q = LAB.quiz;
  const { pic, bar } = labScene(app, 'S38A', { bar: true, cls: 'lab-quiz' });
  playSfx('open'); replay(pic, 'pop');
  /* 원래 그림의 카드 자리를 빈 칸으로 덮고, 조각을 섞어서 올림 */
  const xs = Q.pieces.map(p => p.x);
  for (let i = xs.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [xs[i], xs[j]] = [xs[j], xs[i]]; }
  Q.pieces.forEach(p => labEl(pic, 'lab-tray', [p.x, Q.ptop, Q.pw, Q.ph]));
  const slots = {};
  Object.entries(Q.slots).forEach(([id, x]) => { slots[id] = labEl(pic, 'lab-qslot', [x, Q.stop, Q.sw, Q.sh]); slots[id].dataset.id = id; });
  const home = {}; let placed = 0, selected = null;
  const pieces = Q.pieces.map((p, i) => {
    const r = [xs[i], Q.ptop, Q.pw, Q.ph]; home[p.id] = r;
    const e = labEl(pic, 'lab-piece', r, `<img src="${LAB_DIR}pieces/${p.id}.jpg" alt="${p.label}" draggable="false">`, 'button');
    e.dataset.id = p.id; e.setAttribute('aria-label', p.label);
    e.style.animationDelay = i * 0.08 + 's'; replay(e, 'pop');
    return e;
  });
  const title = labEl(pic, 'lab-cover flat lab-qtitle', Q.title, '<span class="lab-txt">그림을 알맞은 자리에 끼워 보세요!</span>');
  labFit(title, 0.62);
  bar.innerHTML = `<button class="btn blue big lab-ok" type="button" hidden>방패 만들러 가기 ›</button>`;
  const ok = $('.lab-ok', bar);

  const toPct = (cx, cy) => { const b = pic.getBoundingClientRect(); return [(cx - b.left) / b.width * 100, (cy - b.top) / b.height * 100]; };
  const slotAt = (x, y) => Object.values(slots).find(s => {
    if (s.classList.contains('full')) return false;
    const l = parseFloat(s.style.left), t = parseFloat(s.style.top), w = parseFloat(s.style.width), h = parseFloat(s.style.height);
    return x >= l - 2 && x <= l + w + 2 && y >= t - 3 && y <= t + h + 3;
  });
  const place = (e, s) => {
    const r = [parseFloat(s.style.left), parseFloat(s.style.top), parseFloat(s.style.width), parseFloat(s.style.height)];
    e.style.cssText = R(r); e.classList.add('placed'); e.classList.remove('sel'); e.disabled = true;
    s.classList.add('full', 'ok'); playSfx('check'); replay(e, 'pop'); placed++;
    if (placed === 6) finish();
  };
  const wrong = (e, s) => { if (s) replay(s, 'shake'); playSfx('uncheck'); e.style.cssText = R(home[e.dataset.id]); e.classList.remove('sel'); };
  const tryDrop = (e, s) => { if (!s) return wrong(e, null); if (s.dataset.id === e.dataset.id) place(e, s); else wrong(e, s); };

  /* 끌어 놓기 + 누르고-누르기 */
  pieces.forEach(e => {
    let start = null, moved = false;
    e.addEventListener('pointerdown', ev => {
      if (e.disabled) return;
      ev.preventDefault(); e.setPointerCapture(ev.pointerId);
      start = { x: ev.clientX, y: ev.clientY, l: parseFloat(e.style.left), t: parseFloat(e.style.top) }; moved = false;
      e.classList.add('drag');
    });
    e.addEventListener('pointermove', ev => {
      if (!start) return;
      const b = pic.getBoundingClientRect();
      const dx = (ev.clientX - start.x) / b.width * 100, dy = (ev.clientY - start.y) / b.height * 100;
      if (Math.abs(dx) + Math.abs(dy) > 1) moved = true;
      e.style.left = start.l + dx + '%'; e.style.top = start.t + dy + '%';
    });
    const end = ev => {
      if (!start) return;
      e.classList.remove('drag'); start = null;
      if (moved) { const [x, y] = toPct(ev.clientX, ev.clientY); tryDrop(e, slotAt(x, y)); }
      else {
        e.style.cssText = R(home[e.dataset.id]);
        if (selected === e) { selected = null; e.classList.remove('sel'); }
        else { pieces.forEach(p => p.classList.remove('sel')); selected = e; e.classList.add('sel'); playSfx('tab'); }
      }
    };
    e.addEventListener('pointerup', end); e.addEventListener('pointercancel', end);
  });
  Object.values(slots).forEach(s => s.addEventListener('click', () => {
    if (!selected || s.classList.contains('full')) return;
    const e = selected; selected = null; tryDrop(e, s);
  }));

  function finish() {
    LabState.quizDone = true; Store.set('labComplete', true);
    setTimeout(() => {
      playSfx('fanfare'); labConfetti();
      $('.lab-txt', title).textContent = Q.doneText; replay(title, 'star-pop');
      Object.values(slots).forEach(s => replay(s, 'glow'));
      ok.hidden = false; ok.classList.add('pulse'); replay(ok, 'pop');
    }, 350);
  }
  onTap(ok, () => { playSfx('next'); labGo('S39'); });
};
