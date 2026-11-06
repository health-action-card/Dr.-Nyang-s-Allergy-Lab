/* =========================================================
   card.js — 약속 카드(S44)와 챌린지 메달(S48-2)를 canvas로 그리기
   미리보기와 저장 이미지는 같은 함수로 그려서 똑같이 나와요.
   ========================================================= */
'use strict';

const FONT = '"Apple SD Gothic Neo","Noto Sans KR","Noto Sans CJK KR","Malgun Gothic",system-ui,sans-serif';
const CARD_W = 1672, CARD_H = 941;

const DESIGNS = {
  certificate: { name: '지킴이 자격증', title: '알레르기 예방 지킴이 자격증', bg: 'assets/cards/bg_certificate.jpg', titleBox: [500, 40, 680, 100], titleSize: 46, titleColor: '#3b6b1f',
    rules: [580, 240, 965, 505], nameBox: [1362, 806, 226, 82], charBox: [90, 215, 420, 400], meta: [85, 628, 425], slogan: [560, 808, 600, 62] },
  lab: { name: '알레르기 연구소', title: '알레르기 예방 연구원증', bg: 'assets/cards/bg_lab.jpg', titleBox: [500, 38, 680, 110], titleSize: 48, titleColor: '#0b6b5a',
    rules: [565, 240, 1020, 545], nameBox: [1358, 795, 268, 92], charBox: [70, 200, 420, 390], meta: [65, 598, 440], slogan: [640, 820, 600, 62] },
  playground: { name: '학교 운동장', title: '알레르기 예방 약속 카드', bg: 'assets/cards/bg_playground.jpg', titleBox: [545, 30, 580, 110], titleSize: 46, titleColor: '#8a4b00',
    rules: [535, 245, 1070, 465], nameBox: [1340, 786, 292, 110], charBox: [60, 300, 410, 350], meta: [45, 652, 450], slogan: [560, 812, 600, 62] }
};
const BUDDIES = {
  pinky_01: '인사하는 고양이', pinky_02: '하트를 만드는 고양이', pinky_03: '방패를 든 고양이',
  pinky_04: '엄지를 올리는 고양이', pinky_05: '만세하는 고양이'
};
const buddySrc = k => `assets/characters/${k}.png`;

/* 수칙 글씨 단계: 개수에 따라 시작하고, 넘치면 여백 → 줄 간격 → 글씨 순서로 줄임 */
const STEPS = [
  { fs: 40, lh: 1.42, gap: 26 }, { fs: 34, lh: 1.40, gap: 18 }, { fs: 34, lh: 1.40, gap: 10 },
  { fs: 34, lh: 1.28, gap: 8 }, { fs: 31, lh: 1.28, gap: 8 }, { fs: 28, lh: 1.26, gap: 6 } // 마지막 = 최소 글씨
];
const startStep = n => (n <= 3 ? 0 : n <= 5 ? 1 : 2);

function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); }

/* 한글은 단어(띄어쓰기) 단위로 줄바꿈, 한 단어가 너무 길면 글자 단위 */
function wrapLines(ctx, text, maxW) {
  const words = String(text).split(/\s+/); const lines = []; let line = '';
  const push = w => {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width <= maxW) { line = test; return; }
    if (line) lines.push(line);
    if (ctx.measureText(w).width <= maxW) { line = w; return; }
    let part = '';
    for (const ch of w) { if (ctx.measureText(part + ch).width > maxW) { lines.push(part); part = ch; } else part += ch; }
    line = part;
  };
  words.forEach(push); if (line) lines.push(line);
  return lines;
}

function drawPaw(ctx, x, y, s, color) {
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.ellipse(x + s * .5, y + s * .66, s * .25, s * .21, 0, 0, Math.PI * 2); ctx.fill();
  [[.2, .37], [.4, .2], [.6, .2], [.8, .37]].forEach(([a, b]) => { ctx.beginPath(); ctx.arc(x + s * a, y + s * b, s * .11, 0, Math.PI * 2); ctx.fill(); });
}

/* 수칙 영역 배치 계산 → { fit, step, items } */
function layoutRules(ctx, rules, box) {
  const [, , w, h] = box;
  for (let k = startStep(rules.length); k < STEPS.length; k++) {
    const s = STEPS[k]; ctx.font = `800 ${s.fs}px ${FONT}`;
    const textW = w - s.fs * 1.4 - 16;
    const items = rules.map(r => {
      const mineW = r.mine ? ctx.measureText('나만의 ').width * .7 + 14 : 0;
      const lines = wrapLines(ctx, r.text, textW - mineW);
      return { r, lines, h: lines.length * s.fs * s.lh + s.gap * 2, mineW };
    });
    const total = items.reduce((a, b) => a + b.h, 0);
    if (total <= h) return { fit: true, step: k, s, items, total };
    if (k === STEPS.length - 1) return { fit: false, step: k, s, items, total };
  }
}

/* 약속 카드 그리기 */
async function drawPromiseCard(canvas, { design = 'certificate', buddy = 'pinky_01', name = '', cardNo = '', rules = [], sigImg = null, preview = false }) {
  const D = DESIGNS[design] || DESIGNS.certificate;
  canvas.width = CARD_W; canvas.height = CARD_H;
  const ctx = canvas.getContext('2d');
  if (document.fonts && document.fonts.ready) await document.fonts.ready;
  const [bg, ch] = await Promise.all([loadImg(D.bg), loadImg(buddySrc(buddy))]);
  ctx.clearRect(0, 0, CARD_W, CARD_H);
  ctx.drawImage(bg, 0, 0, CARD_W, CARD_H);

  /* 제목 */
  const [tx, ty, tw, th] = D.titleBox;
  ctx.fillStyle = D.titleColor; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `900 ${D.titleSize}px ${FONT}`; ctx.fillText(D.title, tx + tw / 2, ty + th / 2, tw - 20);

  /* 캐릭터 (아래쪽 가운데) */
  const [cx, cy, cw, chh] = D.charBox;
  const sc = Math.min(cw / ch.width, chh / ch.height);
  const dw = ch.width * sc, dh = ch.height * sc;
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.12)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 6;
  ctx.drawImage(ch, cx + (cw - dw) / 2, cy + chh - dh, dw, dh); ctx.restore();

  /* 고유번호 · 서명 */
  const [mx, my, mw] = D.meta;
  const row = (y, h) => { ctx.fillStyle = 'rgba(255,255,255,.93)'; ctx.strokeStyle = 'rgba(240,25,110,.25)'; ctx.lineWidth = 2; rr(ctx, mx, y, mw, h, 16); ctx.fill(); ctx.stroke(); };
  const lab = (t, y) => { ctx.font = `800 17px ${FONT}`; const w = ctx.measureText(t).width + 20; ctx.fillStyle = '#ffe3ee'; rr(ctx, mx + 12, y - 14, w, 28, 14); ctx.fill(); ctx.fillStyle = '#c80f57'; ctx.textAlign = 'left'; ctx.fillText(t, mx + 22, y + 1); return w; };
  row(my, 46); const lw = lab('고유번호', my + 23);
  ctx.font = `800 22px ${FONT}`; ctx.fillStyle = '#2a1f1a'; ctx.textAlign = 'left'; ctx.fillText(cardNo || 'AL-○○○○○○-○○○○', mx + 24 + lw, my + 24);
  const sy = my + 56; row(sy, 76); const lw2 = lab('직접 서명', sy + 38);
  const px = mx + 24 + lw2, pw = mw - (px - mx) - 14;
  if (sigImg) { const s2 = Math.min(pw / sigImg.width, 60 / sigImg.height); ctx.drawImage(sigImg, px, sy + 8 + (60 - sigImg.height * s2) / 2, sigImg.width * s2, sigImg.height * s2); }
  else if (preview) {
    ctx.setLineDash([7, 5]); ctx.strokeStyle = '#e6c9d6'; ctx.lineWidth = 2; rr(ctx, px, sy + 9, pw, 58, 10); ctx.stroke(); ctx.setLineDash([]);
    ctx.font = `700 17px ${FONT}`; ctx.fillStyle = '#c4b3bb'; ctx.textAlign = 'center'; ctx.fillText('직접 서명 (선택)', px + pw / 2, sy + 38);
  }

  /* 수칙 */
  const box = D.rules; const L = layoutRules(ctx, rules, box);
  let y = box[1] + (box[3] - L.total) / 2;
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  L.items.forEach((it, i) => {
    const s = L.s, x = box[0] + 4; let ly = y + s.gap;
    drawPaw(ctx, x, ly + s.fs * .15, s.fs * .82, '#f0196e');
    const textX = x + s.fs * 1.4;
    it.lines.forEach((line, j) => {
      let lx = textX;
      if (j === 0 && it.r.mine) {
        ctx.font = `800 ${s.fs * .62}px ${FONT}`; const mw2 = ctx.measureText('나만의').width + 14;
        ctx.fillStyle = '#fff1c9'; rr(ctx, lx, ly + s.fs * .15, mw2, s.fs * .9, 8); ctx.fill();
        ctx.fillStyle = '#9a6a00'; ctx.fillText('나만의', lx + 7, ly + s.fs * .82); lx += mw2 + 8;
      }
      ctx.font = `800 ${s.fs}px ${FONT}`; ctx.fillStyle = '#2a1f1a';
      ctx.fillText(line, lx, ly + s.fs * .95); ly += s.fs * s.lh;
    });
    y += it.h;
    if (i < L.items.length - 1) { ctx.strokeStyle = 'rgba(240,25,110,.22)'; ctx.setLineDash([8, 6]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(box[0], y); ctx.lineTo(box[0] + box[2], y); ctx.stroke(); ctx.setLineDash([]); }
  });

  /* 이름 */
  const [nx, ny, nw, nh] = D.nameBox;
  ctx.font = `900 34px ${FONT}`; const nmW = ctx.measureText(name).width;
  ctx.font = `800 20px ${FONT}`; const tagW = ctx.measureText('이름').width + 24;
  const startX = nx + (nw - (tagW + 10 + nmW)) / 2, midY = ny + nh / 2;
  ctx.fillStyle = '#f0196e'; rr(ctx, startX, midY - 16, tagW, 32, 16); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText('이름', startX + 12, midY + 1);
  ctx.font = `900 34px ${FONT}`; ctx.fillStyle = '#2a1f1a'; ctx.fillText(name, startX + tagW + 10, midY + 1);

  /* 슬로건 */
  const [gx, gy, gw, gh] = D.slogan;
  ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.strokeStyle = 'rgba(240,25,110,.25)'; ctx.lineWidth = 2; rr(ctx, gx, gy, gw, gh, gh / 2); ctx.fill(); ctx.stroke();
  ctx.font = `900 30px ${FONT}`; ctx.fillStyle = '#7a2bb0'; ctx.textAlign = 'center';
  ctx.fillText('♡ 건강한 오늘, 알레르기 없는 내일! ♡', gx + gw / 2, gy + gh / 2 + 1, gw - 24);
  ctx.textBaseline = 'alphabetic';
  return { fit: L.fit, step: L.step };
}

/* 챌린지 메달 이미지 (S48-2) — 이름은 넣지 않아요. color: pink | green | blue */
const MEDAL_COLORS = {
  pink:  { a: '#ff5fa2', b: '#e0135f', c: '#ffd0e4', label: '분홍' },
  green: { a: '#4fcf6a', b: '#1f9a45', c: '#c9f2d3', label: '초록' },
  blue:  { a: '#4fa0ff', b: '#1f5fe6', c: '#cfe3ff', label: '파랑' }
};
async function drawMedal(canvas, { color = 'pink', stars = 0, cardNo = '' }) {
  /* 메달 그림: assets/medals/medal_{color}.png (고양이 메달, 투명 배경, 위·아래 리본은 비어 있음)
     코드가 얹는 것: 위 리본 "5일 챌린지 완료!", 아래 리본 별 5칸(획득 수만큼 노랑), 메달 아래 별 획득·고유번호 */
  const W = 900, H = 1110; canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (document.fonts && document.fonts.ready) await document.fonts.ready;
  const M = MEDAL_COLORS[color] ? color : 'pink', img = await loadImg(`assets/medals/medal_${M}.png`);
  const k = Math.min((W - 40) / img.width, 960 / img.height), mw = img.width * k, mh = img.height * k;
  const ox = (W - mw) / 2, oy = 10, X = f => ox + mw * f, Y = f => oy + mh * f;
  ctx.clearRect(0, 0, W, H); ctx.drawImage(img, ox, oy, mw, mh);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  // 위 보라 리본
  ctx.font = `900 ${Math.round(mw * 0.05)}px ${FONT}`;
  ctx.lineWidth = mw * 0.012; ctx.strokeStyle = '#6a1fa8'; ctx.strokeText('5일 챌린지 완료!', X(0.5), Y(0.198), mw * 0.42);
  ctx.fillStyle = '#fff'; ctx.fillText('5일 챌린지 완료!', X(0.5), Y(0.198), mw * 0.42);
  // 아래 리본: 별 5칸
  const r = mw * 0.046, gap = mw * 0.1;
  for (let i = 0; i < 5; i++) {
    ctx.save(); ctx.translate(X(0.5) + (i - 2) * gap, Y(0.84)); ctx.beginPath();
    for (let j = 0; j < 10; j++) { const q = j % 2 ? r * 0.48 : r, an = -Math.PI / 2 + j * Math.PI / 5; ctx.lineTo(Math.cos(an) * q, Math.sin(an) * q); }
    ctx.closePath(); ctx.lineWidth = r * 0.22;
    ctx.fillStyle = i < stars ? '#ffd21f' : '#eef0f5'; ctx.strokeStyle = i < stars ? '#d98a00' : '#9aa3b5';
    ctx.fill(); ctx.stroke(); ctx.restore();
  }
  // 메달 아래 흰 알약: 별 획득 · 고유번호
  const py = oy + mh + 20, ph = H - py - 14, pc = MEDAL_COLORS[M].b;
  ctx.fillStyle = '#fff'; ctx.strokeStyle = pc; ctx.lineWidth = 6; rr(ctx, 60, py, W - 120, ph, ph / 2); ctx.fill(); ctx.stroke();
  ctx.font = `900 40px ${FONT}`; ctx.fillStyle = pc; ctx.fillText(`★ 별 획득 ${stars} / 5일`, W / 2, py + ph * 0.33);
  ctx.font = `800 28px ${FONT}`; ctx.fillStyle = '#2d2350'; ctx.fillText(`나의 카드 고유번호 : ${cardNo || 'AL-○○○○○○-○○○○'}`, W / 2, py + ph * 0.72, W - 160);
  ctx.textBaseline = 'alphabetic';
}

/* (예전) 완료 이미지 — 지금은 쓰지 않음. 메달은 drawMedal 사용 */
async function drawCompleteImage(canvas, { days, states, stars, cardNo }) {
  const W = 1600, H = 1000; canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (document.fonts && document.fonts.ready) await document.fonts.ready;
  const cat = await loadImg(buddySrc('pinky_05'));
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#d9eefc'); g.addColorStop(.6, '#fff3f8'); g.addColorStop(1, '#ffe9f1');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#f7b5cf'; ctx.lineWidth = 6; rr(ctx, 30, 30, W - 60, H - 60, 40); ctx.fill(); ctx.stroke();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const tg = ctx.createLinearGradient(0, 70, 0, 170); tg.addColorStop(0, '#ff3c8a'); tg.addColorStop(1, '#c80f57');
  ctx.fillStyle = tg; rr(ctx, W / 2 - 330, 70, 660, 100, 50); ctx.fill();
  ctx.font = `900 56px ${FONT}`; ctx.fillStyle = '#fff'; ctx.fillText('5일 챌린지 완료!', W / 2, 122);
  ctx.font = `800 30px ${FONT}`; ctx.fillStyle = '#5b2a86'; ctx.fillText('5일 동안 나의 예방 수칙을 실천했어요!', W / 2, 210);
  const cs = Math.min(300 / cat.width, 360 / cat.height); ctx.drawImage(cat, 70, 260, cat.width * cs, cat.height * cs);
  const cw = 170, gap = 18, sx = 400;
  days.forEach((d, i) => {
    const x = sx + i * (cw + gap), y = 270, st = states[i];
    ctx.fillStyle = st === 'star' ? '#f2fbea' : '#fff'; ctx.strokeStyle = st === 'star' ? '#bfe6a6' : '#f1e3ea'; ctx.lineWidth = 4;
    rr(ctx, x, y, cw, 200, 24); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#5a5055'; ctx.font = `800 28px ${FONT}`; ctx.fillText(DateK.md(d), x + cw / 2, y + 40);
    ctx.font = `700 24px ${FONT}`; ctx.fillText(DateK.wd(d) + '요일', x + cw / 2, y + 76);
    ctx.font = `64px ${FONT}`;
    if (st === 'star') ctx.fillText('⭐', x + cw / 2, y + 145);
    else if (st === 'nostar') { ctx.globalAlpha = .35; ctx.fillText('⭐', x + cw / 2, y + 145); ctx.globalAlpha = 1; }
    else { ctx.font = `900 50px ${FONT}`; ctx.fillStyle = '#b8adb2'; ctx.fillText('–', x + cw / 2, y + 145); }
  });
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#ffd6e6'; ctx.lineWidth = 4; rr(ctx, 400, 510, 430, 150, 24); ctx.fill(); ctx.stroke();
  ctx.font = `800 28px ${FONT}`; ctx.fillStyle = '#c80f57'; ctx.fillText('⭐ 별 받은 날', 615, 550);
  ctx.font = `900 70px ${FONT}`; ctx.fillStyle = '#f0196e'; ctx.fillText(`${stars}`, 580, 612);
  ctx.font = `800 34px ${FONT}`; ctx.fillStyle = '#8a7f84'; ctx.fillText('/ 5일', 670, 618);
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#ffd6e6'; rr(ctx, 860, 510, 430, 150, 24); ctx.fill(); ctx.stroke();
  ctx.font = `800 26px ${FONT}`; ctx.fillStyle = '#c80f57'; ctx.fillText('나의 카드 고유번호', 1075, 550);
  ctx.font = `900 40px ${FONT}`; ctx.fillStyle = '#2a1f1a'; ctx.fillText(cardNo || '', 1075, 612);
  ctx.save(); ctx.translate(W / 2, 760); ctx.rotate(-0.02);
  const yg = ctx.createLinearGradient(0, -60, 0, 60); yg.addColorStop(0, '#fff27a'); yg.addColorStop(1, '#ffd21f');
  ctx.fillStyle = yg; ctx.strokeStyle = '#f0a800'; ctx.lineWidth = 6; rr(ctx, -470, -60, 940, 120, 26); ctx.fill(); ctx.stroke();
  ctx.font = `900 58px ${FONT}`; ctx.fillStyle = '#f0196e'; ctx.fillText('축하합니다! 5일 챌린지 완료!', 0, 4); ctx.restore();
  ctx.font = `900 34px ${FONT}`; ctx.fillStyle = '#5b2a86';
  ctx.fillText(stars === 5 ? '별 5개! 완벽해요!' : stars >= 3 ? `별 ${stars}개! 잘했어요!` : `별 ${stars}개 · 다음에 다시 도전해요!`, W / 2, 870);
  ctx.font = `700 22px ${FONT}`; ctx.fillStyle = '#8a7f84'; ctx.fillText('건강한 오늘, 알레르기 없는 내일!', W / 2, 925);
}
