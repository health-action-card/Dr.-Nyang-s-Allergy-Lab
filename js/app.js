/* =========================================================
   app.js — 화면 (S39~S48 · 선생님 설정 S49) 과 앱 시작 — 연구소 S00~S38A는 lab.js
   화면 이름: S39, S40, RULES(S41), S44, S46(+S45·체크 팝업), S47, S48(+S48-2 메달·S48-3 삭제), T49(S49 선생님 설정)
   ========================================================= */
'use strict';

const CAT = k => `assets/characters/${k}.png`;
const pawSVG = (c = '#ffd6e6') => `<svg class="paw" viewBox="0 0 24 24" aria-hidden="true"><g fill="${c}"><ellipse cx="12" cy="16" rx="6" ry="5"/><circle cx="5" cy="9" r="2.6"/><circle cx="9.5" cy="5" r="2.6"/><circle cx="14.5" cy="5" r="2.6"/><circle cx="19" cy="9" r="2.6"/></g></svg>`;
const openTeacher = from => Router.go('T49', { returnTo: from });

/* ===================== S39 시작 화면 ===================== */
Router.screens.S39 = (app) => {
  app.innerHTML = `
  <div class="sc room s39">
    <h1 class="title-banner s39-tb" id="banner">${pawSVG('#fff')} 알레르기 방패 만들기 ${pawSVG('#fff')}</h1>
    <p class="bubble big s39-bub">알레르기로부터 나를 지켜 줄<br>나만의 방패를 만들어 보자!</p>
    <img class="s39-cat bob" src="${CAT('pinky_03')}" alt="방패를 든 냥박사 연구원">
    <button class="btn pink xl pulse s39-start" id="start">나만의 약속 카드 만들기 ›</button>
  </div>`;
  if (Config.get().mode === 'event') secretTap($('#banner'), () => openTeacher('S39'));
  onTap($('#start'), () => {
    playSfx('next');
    if (!Store.hasRecord()) return Router.go('S40');
    const back = () => Router.go(Challenge.status() === 'ended' ? 'S47' : 'S46');
    const m = Modal.open(`
      <div class="pop-head orange">⚠ 새 약속 카드를 만들까요?</div>
      <p class="pop-body">새로 만들면 지금까지의 <b class="red">약속 카드와 챌린지 기록이 지워져요.</b></p>
      <p class="pop-small">이미 저장한 카드·메달 이미지(PNG)는 지워지지 않아요.</p>
      <div class="pop-btns"><button class="btn blue" data-autofocus id="mBack">내 챌린지로 돌아가기</button><button class="btn red" id="mNew">새로 만들기</button></div>`,
      { onBack: back });
    onTap($('#mBack', m), () => { playSfx('tap'); Modal.close(); back(); });
    onTap($('#mNew', m), () => { playSfx('delete'); Store.clearAll(); Modal.close(); history.replaceState(null, ''); Router.go('S40', {}, { replace: true }); });
  });
};

/* ===================== S40 이름 입력 ===================== */
Router.screens.S40 = (app) => {
  app.innerHTML = `
  <div class="sc room s40">
    <h1 class="title-banner s40-tb">${pawSVG('#fff')} 알레르기 예방 약속 카드 ${pawSVG('#fff')}</h1>
    <p class="sub-pill s40-sub">나만의 예방 약속을 고르고, 매일 지켜 봐요.</p>
    <img class="s40-cat bob" src="${CAT('pinky_03')}" alt="">
      <section class="clipcard">
        <div class="clip"></div>
        <p class="q">1. 이름을 입력해 봐!</p>
        <label class="name-field">
          <input id="name" type="text" maxlength="12" placeholder="이름 (5글자까지)" autocomplete="off" enterkeyhint="done" aria-label="이름">
          <span class="count" id="count">0/5</span><span aria-hidden="true">✏️</span>
        </label>
        <p class="preview empty" id="pv">👉 <span><span class="nm" id="pvName">○○</span><span id="pvJosa">의</span> 알레르기 예방 약속카드</span></p>
        <button class="btn pink big" id="make" disabled>내 카드 만들기</button>
      </section>
  </div>`;
  const input = $('#name'), make = $('#make');
  let composing = false;
  const clean = v => v.replace(/[^가-힣ㄱ-ㅎㅏ-ㅣa-zA-Z]/g, '');
  const enforce = () => { let v = clean(input.value); if ([...v].length > NAME_MAX) v = [...v].slice(0, NAME_MAX).join(''); if (v !== input.value) input.value = v; };
  const render = () => {
    const n = input.value.trim(), len = [...n].length;
    $('#count').textContent = `${Math.min(len, NAME_MAX)}/${NAME_MAX}`;
    $('#pv').classList.toggle('empty', !len);
    $('#pvName').textContent = len ? n : '○○';
    $('#pvJosa').textContent = len ? josaUi(n) : '의';
    make.disabled = !len;
  };
  input.addEventListener('compositionstart', () => (composing = true));
  input.addEventListener('compositionend', () => { composing = false; enforce(); render(); });
  input.addEventListener('input', () => { if (!composing) enforce(); render(); });
  input.addEventListener('blur', () => { enforce(); render(); });
  input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing && !make.disabled) make.click(); });
  input.addEventListener('focus', () => setTimeout(() => input.scrollIntoView({ block: 'center', behavior: 'smooth' }), 300));
  onTap(make, () => { enforce(); const n = input.value.trim(); if (!n) return; Store.set('name', n); playSfx('next'); Router.go('RULES', { tab: 0 }); });
  input.value = Store.get('name', ''); render();
};

/* ===================== S41 약속 고르기 (한 화면 · 탭 3개: S41-1 집 / S41-2 학교 / S41-3 밖) ===================== */
Router.screens.RULES = (app, p) => {
  let tab = Math.max(0, Math.min(2, p.tab | 0));
  const empty = () => ({ home: [], school: [], outside: [] });
  const load = () => ({ rules: Store.get('rules', empty()), custom: Store.get('custom', empty()) });
  const clone = o => JSON.parse(JSON.stringify(o));
  let saved = load(), draft = clone(saved);
  const cntPlace = pl => (draft.rules[pl] || []).length + (draft.custom[pl] || []).filter(c => c.checked).length;
  const total = () => PLACES.reduce((a, pl) => a + cntPlace(pl), 0);
  const savedTotal = () => PLACES.reduce((a, pl) => a + (saved.rules[pl] || []).length + (saved.custom[pl] || []).filter(c => c.checked).length, 0);
  const dirty = () => JSON.stringify(draft) !== JSON.stringify(saved);

  app.innerHTML = `
  <div class="sc outdoor rules-screen">
    <header class="rules-head">
      <h1 class="title-banner sm">${pawSVG('#fff')} 세 장소에서 지킬 수 있는 <em>너만의 약속</em>을 골라 보자! ${pawSVG('#fff')}</h1>
    </header>
    <div class="rules-sticky">
      <div class="countbox" id="countbox"></div>
      <div class="tabs" id="tabs" role="tablist"></div>
    </div>
    <img class="rules-cat bob" id="rcat" src="${CAT('pinky_03')}" alt="">
    <div class="rules-body">
      <section class="rules-panel">
        <div id="list"></div>
        <div class="custom">
          <span class="custom-lab">✏️ 나만의 약속 직접 쓰기</span>
          <p class="custom-tip">💡 매일 실천할 수 있는 내용을 적어 보아요</p>
          <div class="custom-row">
            <input id="cin" maxlength="${CUSTOM_MAX}" enterkeyhint="done" aria-label="나만의 약속">
            <button class="btn pink" id="cadd" disabled>+ 추가</button>
          </div>
        </div>
        <p class="health-note"><b>i</b>알레르기 종류나 병 이름 같은 건강 정보는 적지 않아요. 나만의 약속은 내 카드에만 나오고, 어디에도 보내지 않아요.</p>
      </section>
    </div>
    <nav class="bottom-bar rules-bar two">
      <button class="btn pink" id="save">✓ 약속 고르기 완료 <small>(저장)</small></button>
      <button class="btn orange" id="next">카드 꾸미기로 이동 ›</button>
    </nav>
  </div>`;

  let lastTotal = total();
  const render = () => {
    const place = PLACES[tab], data = window.RULES_DATA[place], n = total(), ok = n >= MIN_RULES;
    const cb = $('#countbox');
    cb.className = 'countbox ' + (ok ? 'ok' : '');
    cb.innerHTML = `<div class="cb-main"><span class="cb-lab">전체 고른 약속</span><span class="cb-num">${n}<small> / ${MAX_RULES}</small></span>
      <span class="dots">${Array.from({ length: MAX_RULES }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>${i === 2 ? '<em></em>' : ''}`).join('')}</span></div>
      <p class="cb-note">세 장소를 합쳐 3~7개 골라요</p>`;
    if (n !== lastTotal) { replay(cb, 'pop'); if (lastTotal === 2 && n === 3) playSfx('star'); }
    lastTotal = n;
    $('#tabs').innerHTML = PLACES.map((pl, i) => { const d = window.RULES_DATA[pl], k = cntPlace(pl);
      return `<button class="tab ${i === tab ? 'cur' : ''}" role="tab" aria-selected="${i === tab}" data-t="${i}">${d.icon} ${d.name}${k ? `<span class="badge">${k}</span>` : ''}</button>`; }).join('');
    $('#list').innerHTML = data.rules.map(r => `<button class="rule ${draft.rules[place].includes(r.id) ? 'on' : ''}" data-id="${r.id}"><span class="box"></span><span class="txt">${esc(r.text)}</span></button>`).join('')
      + draft.custom[place].map((c, j) => `<div class="rule ${c.checked ? 'on' : ''}" data-c="${j}" role="button" tabindex="0"><span class="box"></span><span class="txt"><span class="mine">나만의</span>${esc(c.text)}</span><button class="del" data-d="${j}" aria-label="삭제">✕</button></div>`).join('');
    $('#cin').placeholder = data.placeholder;
    const v = $('#cin').value.trim();
    $('#cadd').disabled = !v || n >= MAX_RULES;
  };
  const full = () => { playSfx('full'); replay($('#countbox'), 'shake'); toast('집·학교·밖 합쳐서 7개까지 고를 수 있어요.'); };
  const cheer = () => replay($('#rcat'), 'hop');

  $('#tabs').addEventListener('click', e => {
    const b = e.target.closest('[data-t]'); if (!b || +b.dataset.t === tab) return;
    tab = +b.dataset.t; $('#cin').value = ''; playSfx('tab'); replay($('#rcat'), 'nod'); render();
  });
  $('#list').addEventListener('click', e => {
    const place = PLACES[tab];
    const d = e.target.closest('[data-d]'); if (d) { e.stopPropagation(); draft.custom[place].splice(+d.dataset.d, 1); playSfx('uncheck'); return render(); }
    const row = e.target.closest('.rule'); if (!row) return;
    if (row.dataset.id) {
      const ids = draft.rules[place], id = row.dataset.id, k = ids.indexOf(id);
      if (k >= 0) { ids.splice(k, 1); playSfx('uncheck'); }
      else { if (total() >= MAX_RULES) return full(); ids.push(id); playSfx('check'); cheer(); }
    } else {
      const c = draft.custom[place][+row.dataset.c];
      if (!c.checked && total() >= MAX_RULES) return full();
      c.checked = !c.checked; playSfx(c.checked ? 'check' : 'uncheck'); if (c.checked) cheer();
    }
    render();
  });
  const add = () => {
    const place = PLACES[tab], v = $('#cin').value.trim(); if (!v) return;
    if (total() >= MAX_RULES) return full();
    const all = PLACES.flatMap(pl => [...draft.custom[pl].map(c => c.text), ...window.RULES_DATA[pl].rules.map(r => r.text)]);
    if (all.includes(v)) return toast('이미 있는 약속이에요.');
    draft.custom[place].push({ id: 'c' + Date.now().toString(36), text: v, checked: true }); $('#cin').value = '';
    playSfx('check'); cheer(); render();
  };
  $('#cin').addEventListener('input', render);
  $('#cin').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing) add(); });
  $('#cin').addEventListener('focus', () => document.body.classList.add('kbd'));
  $('#cin').addEventListener('blur', () => setTimeout(() => document.body.classList.remove('kbd'), 150));
  onTap($('#cadd'), () => (total() >= MAX_RULES ? full() : add()));

  const save = silent => {
    Store.set('rules', clone(draft.rules)); Store.set('custom', clone(draft.custom));
    saved = load(); if (!silent) { playSfx('save'); toast('저장했어요!', 1500); } render();
  };
  onTap($('#save'), () => save());

  const leave = to => {
    if (!dirty()) return to();
    const m = Modal.open(`
      <div class="pop-head orange">고른 약속이 아직 저장되지 않았어요.</div>
      <p class="pop-body">저장하지 않고 이동하면 마지막으로 저장한 상태로 돌아가요.</p>
      <div class="pop-btns"><button class="btn white" id="mSkip">저장하지 않고 이동</button><button class="btn pink" data-autofocus id="mSave">저장하고 이동</button></div>`);
    onTap($('#mSave', m), () => { Modal.close(); save(true); playSfx('save'); to(); });
    onTap($('#mSkip', m), () => { Modal.close(); draft = clone(saved); playSfx('tap'); to(); });
  };
  const toCard = () => {
    if (savedTotal() < MIN_RULES) { playSfx('full'); replay($('#countbox'), 'shake'); return toast('집·학교·밖 합쳐서 3개 이상 골라 주세요.'); }
    playSfx('next'); Router.go('S44');
  };
  onTap($('#next'), () => leave(toCard));
  Router.guard = () => { if (!dirty()) return false; leave(() => Router.go('S40', {}, { replace: true })); return true; };
  render();
};

/* ===================== S44 카드 디자인 및 제작 ===================== */
let signatureImg = null; // 서명은 저장하지 않고 이 화면 메모리에만
Router.screens.S44 = (app) => {
  const st = { design: Store.get('design', 'certificate'), buddy: Store.get('buddy', 'pinky_01'), step: 1 };
  const rules = selectedRules(), name = Store.get('name', '');
  app.innerHTML = `
  <div class="sc outdoor s44">
    <header class="s44-top">
      <img class="s44-mascot" src="${CAT('pinky_03')}" alt="">
      <div class="s44-titles">
        <h1 class="title-banner">${pawSVG('#fff')} 나만의 알레르기 예방 <em>약속 카드</em> 만들기! ${pawSVG('#fff')}</h1>
        <ol class="steps" id="steps"><li>카드 디자인 선택</li><li>나의 수호 친구 고르기</li><li>미리보기 확인</li><li>완성하기</li></ol>
      </div>
      <p class="bubble sm s44-bubble">원하는 디자인과 캐릭터를 선택하고,<br>나만의 약속 카드를 완성해 보세요!</p>
    </header>
    <div class="s44-grid">
      <section class="s44-box s44-designs"><h3 class="box-tag">🗂 카드 디자인 선택</h3><div id="designs"></div></section>
      <section class="s44-box s44-center">
        <div class="preview-wrap" id="pvwrap"><canvas id="pv"></canvas><button class="zoom" id="zoom">🔍 크게 보기</button></div>
        <button class="btn white sign-btn" id="sign">✍️ 서명하기 (선택)</button>
      </section>
      <section class="s44-right">
        <div class="s44-box"><h3 class="box-tag">🐾 나의 수호 친구 선택</h3><div class="buddies" id="buddies"></div></div>
        <div class="s44-box summary" id="summary"></div>
      </section>
    </div>
    <nav class="bottom-bar three s44-bar">
      <button class="btn white big" id="redo">↻ 다시 꾸미기</button>
      <button class="btn pink big" id="save">⬇ 내 <em>약속 카드</em> 저장하기</button>
      <button class="btn white big" id="home">⌂ 처음으로</button>
    </nav>
  </div>`;
  const canvas = $('#pv');
  const draw = () => drawPromiseCard(canvas, { ...st, name, cardNo: Store.get('cardNo', ''), rules, sigImg: signatureImg, preview: true });
  const render = () => {
    $$('#steps li').forEach((li, i) => (li.className = i + 1 === st.step ? 'cur' : i + 1 < st.step ? 'done' : ''));
    $('#designs').innerHTML = Object.entries(DESIGNS).map(([k, d]) => `<button class="design ${st.design === k ? 'on' : ''}" data-k="${k}"><span class="radio"></span><span class="thumb" style="background-image:url(${d.bg})"><b>${d.name}<br>디자인</b></span></button>`).join('');
    $('#buddies').innerHTML = Object.entries(BUDDIES).map(([k, n]) => `<button class="buddy ${st.buddy === k ? 'on' : ''}" data-k="${k}"><span class="tick">✓</span><img src="${CAT(k)}" alt=""><span class="bn">${n.replace(' 고양이', '')}<br>고양이</span></button>`).join('');
    $('#summary').innerHTML = `<h3 class="box-tag">📋 선택한 내용 요약</h3><p><span>🐾 카드 디자인</span><b>${DESIGNS[st.design].name}</b></p><p><span><img src="${CAT(st.buddy)}" alt=""> 나의 수호 친구</span><b>${BUDDIES[st.buddy]}</b></p><p><span>🐾 예방 수칙</span><b>총 ${rules.length}개</b></p>`;
    $('#sign').textContent = signatureImg ? '✓ 서명했어요 (다시 쓰기)' : '✍️ 서명하기 (선택)';
    $('#sign').classList.toggle('signed', !!signatureImg);
    draw();
  };
  $('#designs').addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (!b) return; st.design = b.dataset.k; st.step = Math.max(st.step, 2); Store.set('design', st.design); playSfx('tab'); render(); });
  $('#buddies').addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (!b) return; st.buddy = b.dataset.k; st.step = Math.max(st.step, 3); Store.set('buddy', st.buddy); playSfx('check'); render(); replay($(`.buddy[data-k="${st.buddy}"]`), 'hop'); });

  /* 크게 보기 (휴대폰: 카드를 옆으로 돌려 화면 가득) */
  const zoom = () => {
    const url = canvas.toDataURL('image/jpeg', .9);
    const m = Modal.open(`<img class="zoom-img" src="${url}" alt="약속 카드 미리보기"><button class="btn white zoom-close" data-autofocus id="zc">✕ 닫기</button>`, { cls: 'zoom-dim' });
    onTap($('#zc', m), () => Modal.close());
  };
  onTap($('#zoom'), zoom);

  /* 서명 창 */
  onTap($('#sign'), () => {
    const m = Modal.open(`
      <div class="pop-head">✍️ 직접 서명하기</div>
      <p class="pop-small">손가락이나 터치펜으로 이름을 써 주세요. 서명은 선택이에요.</p>
      <canvas class="sig-pad" id="pad" width="900" height="300"></canvas>
      <div class="pop-btns three"><button class="btn white" id="sClose">닫기</button><button class="btn white" id="sClear">다시 쓰기</button><button class="btn pink" id="sOk">서명 완료</button></div>`, { cls: 'sheet' });
    const pad = $('#pad', m), c = pad.getContext('2d'); let drawing = false, has = false, lastPt = null;
    c.lineWidth = 9; c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = '#1f1b3a';
    const pt = e => { const r = pad.getBoundingClientRect(); return [(e.clientX - r.left) * pad.width / r.width, (e.clientY - r.top) * pad.height / r.height]; };
    pad.addEventListener('pointerdown', e => { drawing = true; lastPt = pt(e); pad.setPointerCapture(e.pointerId); });
    pad.addEventListener('pointermove', e => { if (!drawing) return; const p2 = pt(e); c.beginPath(); c.moveTo(...lastPt); c.lineTo(...p2); c.stroke(); lastPt = p2; has = true; });
    ['pointerup', 'pointercancel'].forEach(t => pad.addEventListener(t, () => (drawing = false)));
    onTap($('#sClose', m), () => Modal.close());
    onTap($('#sClear', m), () => { c.clearRect(0, 0, pad.width, pad.height); has = false; });
    onTap($('#sOk', m), async () => {
      if (!has) { Modal.close(); return; }
      signatureImg = await new Promise(res => { const i = new Image(); i.onload = () => res(i); i.src = pad.toDataURL('image/png'); });
      Modal.close(); render();
    });
  });

  onTap($('#redo'), () => Router.go('RULES', { tab: 0 }));
  onTap($('#home'), () => {
    const m = Modal.open(`<div class="pop-head">처음 화면으로 갈까요?</div><p class="pop-body">만든 카드는 아직 저장되지 않았어요.</p>
      <div class="pop-btns"><button class="btn white" data-autofocus id="mNo">아니요</button><button class="btn pink" id="mYes">처음 화면으로</button></div>`);
    onTap($('#mNo', m), () => Modal.close());
    onTap($('#mYes', m), () => { Modal.close(); Router.go('S39'); });
  });

  onTap($('#save'), async () => {
    if (!Store.get('cardNo')) {
      const t = DateK.today().replace(/-/g, '').slice(0, 6);
      Store.set('cardNo', `AL-${t}-${String(Math.floor(1000 + Math.random() * 9000))}`);
    }
    const out = document.createElement('canvas');
    const res = await drawPromiseCard(out, { ...st, name, cardNo: Store.get('cardNo'), rules, sigImg: signatureImg, preview: false });
    if (!res.fit) {
      toast('약속이 카드에 다 들어가지 않아요. [다시 꾸미기]에서 약속을 줄이거나 짧게 고쳐 주세요.', 3500); return;
    }
    try { await saveCanvasPNG(out, `promise-card_${Store.get("cardNo")}.png`); }
    catch (e) { toast(e && e.name === 'AbortError' ? '카드 저장이 취소됐어요. 다시 눌러 주세요.' : '저장하지 못했어요. 다시 눌러 주세요.', 2500); return; }
    st.step = 4; playSfx('save'); render();
    Store.set('design', st.design); Store.set('buddy', st.buddy);
    if (!Challenge.get()) Challenge.create();
    Router.go('S46', { install: !isStandalone() });
  });
  render();
};

/* ===================== S45 앱 설치 안내 (S46 위 팝업) ===================== */
function openInstallModal() {
  const ios = isIOS();
  /* 아이폰·아이패드: Safari와 홈 화면 앱은 저장 공간이 따로 → 기록을 주소 # 뒤에 담아 둠 (서버로 전송 안 됨) */
  try {
    const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(Store.snapshot()))));
    history.replaceState(Router.current, '', location.pathname + location.search + '#restore=' + b64);
  } catch (e) {}
  const guide = ios
    ? `<div class="ig-phone ios"><div class="ig-url"></div><div class="ig-sheet"><span>⧉ 복사</span><span class="hl">＋ 홈 화면에 추가</span><span>☆ 즐겨찾기</span></div><span class="ig-btn share">⇧</span></div>
       <div class="ig-steps"><span>① 공유 버튼 ⇧</span><span>② 홈 화면에 추가</span><span>③ 오른쪽 위 [추가]</span></div>
       <p class="ig-keep">홈 화면의 알레르기 약속 카드 아이콘으로 열어도 기록이 이어져요</p>`
    : `<div class="ig-phone android"><div class="ig-url"></div><span class="ig-btn menu">⋮</span><div class="ig-sheet"><span>↻ 새 탭</span><span class="hl">＋ 홈 화면에 추가</span><span>☆ 북마크</span></div></div>
       <div class="ig-steps"><span>① 메뉴 ⋮</span><span>② 홈 화면에 추가</span><span>③ [설치] 또는 [추가]</span></div>
       <p class="ig-keep">삼성 인터넷은 메뉴(≡) → 페이지 추가 → 홈 화면</p>`;
  const m = Modal.open(`
    <button class="pop-x" id="iX" aria-label="닫기">✕</button>
    <div class="install">
      <h2 class="title-banner sm">🎉 나만의 <em>약속 카드</em> 완성 및 저장 완료!</h2>
      <div class="install-grid">
        <div class="install-left">
          <div class="install-top"><img src="${CAT('pinky_03')}" alt=""><p class="bubble sm">내일부터 시작되는 5일 챌린지를 위해 <mark>앱을 홈 화면에 추가</mark>해 주세요.</p></div>
          <span class="lab-pill">나의 카드 고유번호</span>
          <div class="cardno">${esc(Store.get('cardNo', ''))}</div>
          <p class="saved-ok">※ 카드 저장이 완료되었습니다!</p>
        </div>
        <div class="install-guide" id="iGuide"><h4><b>홈 화면에 추가</b> 하는 방법</h4>${guide}</div>
      </div>
      <button class="btn pink big" id="iMain">＋ 홈 화면에 추가하고 <em>시작하기</em> ›</button>
      <button class="link" id="iWeb">웹 브라우저로 그냥 볼래요</button>
    </div>`, { cls: 'install-dim', onBack: () => closeInstall(false) });
  let done = false;
  const closeInstall = (web) => {
    Modal.close();
    history.replaceState({ s: 'S46', p: {} }, '', location.pathname + location.search + location.hash);
    Router.current = { s: 'S46', p: {} };
    if (web && ios && !sessionStorage.getItem('sevenDayTip')) { sessionStorage.setItem('sevenDayTip', '1'); toast('🐾 브라우저에서는 7일 동안 열지 않으면 기록이 지워질 수 있어요. 매일 들어와 주세요!', 4000); }
  };
  const setDone = () => { done = true; m.classList.add('flash'); $('#iMain', m).innerHTML = '다 했어요, <em>시작하기</em> ›'; };
  onTap($('#iMain', m), async () => {
    if (done) return closeInstall(false);
    if (!ios && deferredInstall) {
      deferredInstall.prompt();
      const r = await deferredInstall.userChoice; deferredInstall = null;
      if (r && r.outcome === 'accepted') return closeInstall(false);
      return;
    }
    setDone();
  });
  onTap($('#iWeb', m), () => closeInstall(true));
  onTap($('#iX', m), () => closeInstall(true));
}

/* ===================== S46 일일 실천 체크 (S47 구도 + 체크 팝업) ===================== */
const isKept = v => v === 'O';
const markOf = v => v === 'O' ? ['o','⭕'] : v === 'X' ? ['x','❌'] : ['n',''];
Router.screens.S46 = (app, p) => {
  const c = Challenge.get();
  if (!c) return Router.go('S39', {}, { replace: true });
  const status = Challenge.status(c);
  if (status === 'ended') return Router.go('S47', {}, { replace: true });
  const rules = selectedRules(), t = DateK.today(), need = needCount(rules.length), name = Store.get('name', '');
  const locked = status !== 'active';
  app.innerHTML = `
  <div class="sc outdoor s47 s46n">
    <h1 class="title-banner sm s47-tb">💗 오늘 <em>${esc(name)}${josaNeun(name)}</em> 몇 개나 지켰을까? 🐾</h1>
    <p class="sub-pill s47-sub">${locked ? '오늘은 체크하지 않는 날이에요' : '👆 약속 카드를 눌러 오늘 실천을 체크해요!'}</p>
    <div class="bubble sm s46-bubble">내가 정한 약속을<br>오늘도 잘 지켜볼까요?</div>
    <aside class="s47-left"><img class="s47-cat" src="${CAT('pinky_03')}" alt=""><div class="selbox" id="todaybox"></div></aside>
    <section class="s47-center">
      <div class="days" id="days"></div>
      <p class="legend"><span>⭐ 별 받음</span><span class="gray">⭐ 했지만 별 없음</span><span>– 체크 안 함</span><span>빈칸 아직</span></p>
      <div class="list-card" id="list"></div>
    </section>
    <aside class="s47-side"><div class="statbox" id="stats"></div><div class="resultbox" id="result"></div></aside>
    <div class="s46n-foot">
      <div class="resbar"><button class="btn pink big" id="res"></button><p class="hint" id="resHint"></p></div>
      <div class="delbox"><button class="btn outline" id="del">🗑 이 기기에서 내 기록 지우기</button>
        <p class="share-note">👭 친구와 태블릿을 함께 쓰나요? 상장을 보여 드린 뒤 지워 주세요.</p></div>
    </div>
    <p class="footer-line s46n-line">🔒 내 기록은 이 기기에만 저장돼요 <span class="dot">·</span> <button class="link" id="restart">↺ 처음부터 다시 하기</button></p>
  </div>`;

  const render = () => {
    const cc = Challenge.get(), log = cc.log[t] || {};
    $('#days').innerHTML = cc.days.map(d => {
      const s = Challenge.dayState(cc, d), mk = { star: '⭐', nostar: '⭐', miss: '–' }[s] || '';
      return `<div class="day ${s} ${d === t ? 'is-today sel' : ''}"><div class="mark">${mk}</div>${DateK.md(d)}<br>${DateK.wd(d)}요일</div>`;
    }).join('');
    const states = cc.days.map(d => Challenge.dayState(cc, d));
    const done = states.filter(s => s === 'star' || s === 'nostar').length, stars = states.filter(s => s === 'star').length;
    $('#stats').innerHTML = `<h3>📋 나의 챌린지 현황</h3><p>✅ 완료한 날짜 <b>${done}<small> / 5일</small></b></p><p>⭐ 별 받은 날짜 <b>${stars}<small> / 5일</small></b></p>`;
    const o = rules.filter(r => isKept(log[r.id])).length, answered = rules.filter(r => log[r.id]).length, all = answered === rules.length;
    const ts = Challenge.dayState(cc, t), tm = { star: '⭐', nostar: '⭐', today: '🐾' }[ts] || '🌙';
    $('#todaybox').innerHTML = `<h3>오늘</h3><p class="seld">${DateK.md(t)}<br>${DateK.wd(t)}요일</p><div class="selmark ${ts}">${tm}</div>`;
    if (locked) {
      const next = Challenge.nextCheckDay(cc);
      const msg = status === 'before' ? `<b>내일부터 시작해요!</b>첫 체크는 <em class="inl">${DateK.short(cc.days[0])}</em>에 만나요.`
        : `<b>오늘은 쉬는 날이에요</b>주말과 공휴일에는 체크하지 않아요.<br>다음 체크는 <em class="inl">${next ? DateK.short(next) : '-'}</em>에 만나요!`;
      $('#list').innerHTML = `<h2>📋 오늘 실천한 약속</h2><div class="empty">${msg}</div>`;
      $('#result').innerHTML = `<h3>오늘의 실천 결과</h3><div class="big dash">🌙</div><span class="msg soft">쉬는 날</span>`;
      $('#res').innerHTML = '📊 나의 <em>챌린지 기록</em> 보기 ›'; $('#res').disabled = false;
      $('#resHint').textContent = '지난 기록은 결과 화면에서 날짜를 눌러 볼 수 있어요';
      return;
    }
    $('#list').innerHTML = `<h2>📋 오늘 실천한 약속 <span class="ck-btn">✏️ ${answered ? '체크 고치기' : '눌러서 체크하기'}</span></h2><div class="scroll">` +
      rules.map(r => { const [k, m] = markOf(log[r.id]); return `<div class="rule-res"><p class="t">${r.mine ? '<span class="mine">나만의</span>' : ''}${esc(r.text)}</p><span class="res ${k}">${m}</span></div>`; }).join('') + '</div>';
    $('#list').classList.add('tapcard');
    $('#result').innerHTML = all
      ? `<h3>오늘의 실천 결과</h3><p class="n"><b>${o}</b> / ${rules.length}개 지켰어요!</p><div class="big ${o >= need ? '' : 'gray'}">⭐</div><span class="msg ${o >= need ? '' : 'soft'}">${o >= need ? '잘 실천했어요!' : '다음엔 조금 더!'}</span>`
      : `<h3>오늘의 실천 결과</h3><p class="goal-t">약속 ${rules.length}개 중 <b>${need}개</b> 지키면 ⭐</p><p class="now">지금 ⭕ ${o}개 · 남은 약속 ${rules.length - answered}개</p><div class="big gray">⭐</div><span class="msg soft">체크 중</span>`;
    $('#res').disabled = !all; $('#res').innerHTML = '📊 오늘의 <em>실천 결과</em> 보기 ›';
    $('#resHint').textContent = all ? '오늘 약속을 모두 체크했어요!' : `약속을 모두 체크하면 결과를 볼 수 있어요 (남은 약속 ${rules.length - answered}개)`;
  };

  const openCheck = () => {
    const cc = Challenge.get(), draft = { ...(cc.log[t] || {}) };
    const row = r => { const s = r.type === 'situ' && !r.mine, v = draft[r.id];
      return `<div class="ck-row"><p class="t">${r.mine ? '<span class="mine">나만의</span>' : ''}${esc(r.text)}${s ? `<button class="help" data-help="${r.id}" aria-label="도움말 보기" aria-expanded="false">?</button>` : ''}</p>
      <div class="ox"><button class="o ${v === 'O' ? 'on' : ''}" data-id="${r.id}" data-v="O"><i>⭕</i>지켰어요</button><button class="x ${v === 'X' ? 'on' : ''}" data-id="${r.id}" data-v="X"><i>❌</i>못 지켰어요</button></div></div>`; };
    const w = Modal.open(`<div class="ck-head"><img class="ck-cat" src="${CAT('pinky_02')}" alt=""><h2>📋 오늘 실천한 <em>약속</em></h2><button class="ck-x" id="ckX" aria-label="닫기">✕</button></div>
      <p class="ck-sub">약속을 하나씩 읽고 오늘 실천한 대로 눌러요 <span id="ckN"></span></p>
      <div class="ck-list" id="ckList">${rules.map(row).join('')}</div>
      <div class="ck-foot"><button class="btn white" id="ckClose">취소</button><button class="btn pink big" id="ckSave">✔ 저장하기</button></div>`, { cls: 'check-dim' });
    const upd = () => { $('#ckN', w).textContent = `${rules.filter(r => draft[r.id]).length} / ${rules.length} 체크`; };
    const tip = document.createElement('div'); tip.className = 'help-tip'; tip.setAttribute('role', 'tooltip');
    tip.innerHTML = '<button class="tip-x" aria-label="닫기">✕</button>💡 오늘 이런 상황이 없었나요?<br>그런 일이 생기면 꼭 하겠다고 다짐했다면<br><b>[⭕ 지켰어요]</b>를 눌러요.';
    let openHelp = null;
    const closeTip = () => { if (!openHelp) return; const hb = $(`[data-help="${openHelp}"]`, w); if (hb) { hb.classList.remove('on'); hb.setAttribute('aria-expanded', 'false'); } tip.remove(); openHelp = null; };
    const showTip = hb => {
      closeTip(); openHelp = hb.dataset.help; hb.classList.add('on'); hb.setAttribute('aria-expanded', 'true');
      const modal = $('.modal', w); modal.appendChild(tip);
      const mr = modal.getBoundingClientRect(), br = hb.getBoundingClientRect(), sc = mr.width / modal.offsetWidth || 1;
      const x = (br.left + br.width / 2 - mr.left) / sc, y = (br.top - mr.top) / sc;
      tip.style.left = Math.max(16, x - 260) + 'px'; tip.style.top = Math.max(10, y - tip.offsetHeight - 14) + 'px';
      tip.style.setProperty('--tail', (x - Math.max(16, x - 260)) + 'px');
    };
    w.addEventListener('click', e => {
      const hb = e.target.closest('[data-help]');
      if (hb) { e.stopPropagation(); if (openHelp === hb.dataset.help) closeTip(); else { playSfx('tap'); showTip(hb); } return; }
      if (e.target.closest('.tip-x') || !e.target.closest('.help-tip')) closeTip();
      const b = e.target.closest('[data-v]'); if (!b) return;
      if (draft[b.dataset.id] !== b.dataset.v) { playSfx(b.dataset.v === 'O' ? 'check' : 'uncheck'); replay(b, 'pop'); if (b.dataset.v === 'O') replay($('.ck-cat', w), 'hop'); }
      draft[b.dataset.id] = b.dataset.v; b.parentNode.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); upd();
    });
    $('#ckList', w).addEventListener('scroll', closeTip);
    onTap($('#ckX', w), () => { playSfx('tap'); Modal.close(); });
    onTap($('#ckClose', w), () => { playSfx('tap'); Modal.close(); });
    onTap($('#ckSave', w), () => { const c2 = Challenge.get(); c2.log[t] = draft; Store.set('challenge', c2); Challenge.recompute(c2, t); Modal.close(); playSfx('save'); render(); $$('#list .res').forEach((r, i) => { r.style.animationDelay = i * .1 + 's'; replay(r, 'pop'); }); toast('저장했어요!'); });
    upd();
  };
  $('#list').addEventListener('click', () => { if (!locked) openCheck(); });
  onTap($('#res'), () => { playSfx('next'); Router.go('S47', { sel: locked ? null : t }); });
  onTap($('#del'), () => openDeleteModal());
  onTap($('#restart'), () => Router.go('S39'));
  render();
  if (p.check && !locked) openCheck();
  if (p.install && !isStandalone()) openInstallModal();
};

/* ===================== S47 5일 실천 챌린지 결과 ===================== */
Router.screens.S47 = (app, p) => {
  const c = Challenge.get();
  if (!c) return Router.go('S39', {}, { replace: true });
  const status = Challenge.status(c), ended = status === 'ended', t = DateK.today();
  const rules = selectedRules(), need = needCount(rules.length);
  let sel = p.sel && c.days.includes(p.sel) ? p.sel : ended ? c.days[4] : (c.days.includes(t) ? t : ([...c.days].reverse().find(d => d < t) || c.days[0]));
  app.innerHTML = `
  <div class="sc outdoor s47">
    <h1 class="title-banner sm s47-tb">📊 5일 실천 <em>챌린지</em> 결과</h1>
    <p class="sub-pill s47-sub">나의 5일 실천 기록을 확인해요!</p>
    <aside class="s47-left">
      <img class="s47-cat" src="${CAT('pinky_03')}" alt="">
      <div class="selbox" id="selbox"></div>
    </aside>
    <section class="s47-center">
      <div class="days" id="days"></div>
      <p class="legend"><span>⭐ 별 받음</span><span class="gray">⭐ 했지만 별 없음</span><span>– 체크 안 함</span><span>빈칸 아직</span></p>
      <div class="list-card" id="list"></div>
    </section>
    <aside class="s47-side"><div class="statbox" id="stats"></div><div class="resultbox" id="result"></div></aside>
    <nav class="s47-foot ${ended ? 'ended' : ''}">
      ${ended ? '' : '<button class="btn white big" id="back">‹ 오늘의 체크로 돌아가기</button>'}
      <button class="btn pink big" id="final" ${ended ? '' : 'disabled'}>${ended ? '🏆 5일 챌린지 <em>최종 결과</em> 보기 ›' : '🔒 5일 챌린지 최종 결과 보기'}</button>
    </nav>
    <p class="hint s47-hint">${ended ? '5일 챌린지가 끝났어요! 최종 결과를 확인해 보세요.' : `최종 결과는 5일 챌린지가 끝나면 볼 수 있어요 (마지막 날: ${DateK.short(c.days[4])})`}</p>
  </div>`;
  const render = () => {
    $('#days').innerHTML = c.days.map(d => {
      const s = Challenge.dayState(c, d), mk = { star: '⭐', nostar: '⭐', miss: '–' }[s] || '';
      return `<button class="day ${s} ${d === t ? 'is-today' : ''} ${d === sel ? 'sel' : ''}" data-d="${d}" ${s === 'future' ? 'disabled' : ''}><div class="mark">${mk}</div>${DateK.md(d)}<br>${DateK.wd(d)}요일</button>`;
    }).join('');
    const states = c.days.map(d => Challenge.dayState(c, d));
    const done = states.filter(s => s === 'star' || s === 'nostar').length, stars = states.filter(s => s === 'star').length;
    $('#stats').innerHTML = `<h3>📋 나의 챌린지 현황</h3><p>✅ 완료한 날짜 <b>${done}<small> / 5일</small></b></p><p>⭐ 별 받은 날짜 <b>${stars}<small> / 5일</small></b></p>`;
    const log = c.log[sel] || {}, label = DateK.short(sel), isT = sel === t;
    const ss = Challenge.dayState(c, sel);
    const mk = { star: '⭐', nostar: '⭐', miss: '–', today: '🐾', future: '🕒' }[ss] || '';
    $('#selbox').innerHTML = `<h3>선택한 날짜</h3><p class="seld">${DateK.md(sel)}<br>${DateK.wd(sel)}요일</p><div class="selmark ${ss}">${mk}</div>`;
    const complete = Challenge.dayComplete(c, sel, rules);
    if (complete) {
      const o = rules.filter(r => isKept(log[r.id])).length, ok = o >= need;
      $('#list').innerHTML = `<h2>${isT ? '오늘' : label} 실천한 약속 <span>${label}</span></h2><div class="scroll">` +
        rules.map(r => `<div class="rule-res"><p class="t">${r.mine ? '<span class="mine">나만의</span>' : ''}${esc(r.text)}</p><span class="res ${markOf(log[r.id])[0]}">${markOf(log[r.id])[1]}</span></div>`).join('') + '</div>';
      $('#result').innerHTML = `<h3>${isT ? '오늘의' : label} 실천 결과</h3><p class="n"><b>${o}</b> / ${rules.length}개 지켰어요!</p><div class="big ${ok ? '' : 'gray'}">⭐</div><span class="msg ${ok ? '' : 'soft'}">${ok ? '잘 실천했어요!' : '다음엔 조금 더!'}</span><p class="need">${rules.length}개 중 ${need}개 지키면 별</p>`;
    } else if (sel > t) {
      $('#list').innerHTML = `<h2>${label} 실천한 약속 <span>${label}</span></h2><div class="empty"><b>아직 시작 전이에요</b><p>이날이 되면 약속을 체크할 수 있어요.<br>첫 체크는 <em class="inl">${DateK.short(c.days[0])}</em>에 만나요!</p></div>`;
      $('#result').innerHTML = `<h3>${label} 실천 결과</h3><div class="big dash">🕒</div><span class="msg soft">아직이에요</span>`;
    } else if (isT) {
      $('#list').innerHTML = `<h2>오늘 실천한 약속 <span>${label}</span></h2><div class="empty"><b>아직 체크 중이에요</b>오늘의 체크로 돌아가 약속을 모두 체크해 주세요.</div>`;
      $('#result').innerHTML = `<h3>오늘의 실천 결과</h3><div class="big gray">⭐</div><span class="msg soft">체크 중</span>`;
    } else {
      $('#list').innerHTML = `<h2>${label} 실천한 약속 <span>${label}</span></h2><div class="empty"><b>이날은 체크하지 않았어요</b>지난 날짜는 다시 체크할 수 없어요.<br>오늘의 약속을 꼭 체크해 주세요!</div>`;
      $('#result').innerHTML = `<h3>${label} 실천 결과</h3><div class="big dash">–</div><span class="msg soft">기록 없음</span>`;
    }
  };
  $('#days').addEventListener('click', e => { const b = e.target.closest('[data-d]'); if (!b || b.disabled) return; sel = b.dataset.d; playSfx('tap'); render(); });
  onTap($('#back'), () => { playSfx('tap'); Router.go('S46'); });
  onTap($('#final'), () => { if (ended) { playSfx('next'); Router.go('S48'); } });
  render();
  /* 오늘 별을 처음 받았으면 한 번만 별 연출 + 소리 (promiseCard.starShown) */
  const ts = Challenge.dayState(c, t), shown = Store.get('starShown', []);
  if (ts === 'star' && !shown.includes(t)) {
    Store.set('starShown', [...shown, t]); playSfx('star');
    [$(`#days [data-d="${t}"] .mark`), $('#result .big')].forEach(el => replay(el, 'star-pop'));
  } else if (ts === 'nostar') replay($('.s47-cat'), 'nod');
};

/* ===================== S48 5일 챌린지 완료 ===================== */
let savedCompleteThisSession = false;
Router.screens.S48 = (app) => {
  const c = Challenge.get();
  if (!c) return Router.go('S39', {}, { replace: true });
  if (Challenge.status(c) !== 'ended') return Router.go('S47', {}, { replace: true });
  const name = Store.get('name', '');
  const states = c.days.map(d => Challenge.dayState(c, d)), stars = states.filter(s => s === 'star').length;
  const line = stars === 5 ? '⭐ 별 5개! <b>완벽해요!</b>' : stars >= 3 ? `⭐ 별 ${stars}개! <b>잘했어요!</b>` : `별 ${stars}개 · <b>다음에 다시 도전해요!</b>`;
  const first = !sessionStorage.getItem('s48Shown');
  app.innerHTML = `
  <div class="sc outdoor s48">
    <header class="s48-head"><h1 class="title-banner pinkline">💗 오늘 <b>${esc(name)}${josaNeun(name)}</b> 몇 개나 지켰을까? 🐾</h1><p class="bubble sm">내가 정한 약속을<br>5일 동안 잘 지켰나요?</p></header>
    <h2 class="title-banner sm s48-tb">🏆 5일 챌린지 <em>완료!</em></h2>
    <p class="sub-pill s48-sub">5일 동안 나의 예방 <em class="pk">약속</em>을 실천했어요!</p>
    <img class="s48-cat ${first ? 'cheer' : 'bob'}" src="${CAT('pinky_03')}" alt="">
    <div class="days s48-days">${c.days.map((d, i) => `<div class="day ${states[i]}">${DateK.md(d)}<br>${DateK.wd(d)}요일<div class="mark ${states[i] === 'star' && first ? 'star-pop' : ''}" style="animation-delay:${i * .15}s">${{ star: '⭐', nostar: '⭐', miss: '–' }[states[i]] || ''}</div></div>`).join('')}</div>
    <aside class="s48-box"><h3>⭐ 나의 챌린지 결과 ⭐</h3><p class="starn"><span class="bigstar">⭐</span><span>별 획득<br><b>${stars}</b> <small>/ 5일</small></span></p></aside>
    <div class="ribbon ${first ? 'pop' : ''}">축하합니다! 5일 챌린지 완료!</div>
    <p class="ribbon-line">${line}</p>
    <div class="s48-btns">
      <button class="btn pink big" id="del">🗑 이 기기에서 내 기록 지우기</button>
      <button class="btn blue big pulse" id="medal">🏅 챌린지 성공 메달 받기 ›</button>
    </div>
    <p class="warn">❗ 기록을 지우면 이 기기에 저장된 모든 활동 정보(챌린지 기록, 약속 카드 등)는 복구할 수 없어요.</p>
  </div>`;
  if (first) { sessionStorage.setItem('s48Shown', '1'); playSfx('fanfare'); confetti(); }
  onTap($('#medal'), () => openMedalModal({ stars }));
  onTap($('#del'), () => { playSfx('tap'); openDeleteModal(); });
};

/* ===================== S48-2 챌린지 성공 메달 받기 (S48 위 팝업) ===================== */
function openMedalModal({ stars }) {
  const cardNo = Store.get('cardNo', ''), board = Config.get().board;
  let color = 'pink', savedColor = null;
  const m = Modal.open(`
    <h2 class="md-title">🏅 5일 챌린지 성공 메달 받기!</h2>
    <button class="md-x" id="mdX" aria-label="닫기">✕</button>
    <div class="md-talk"><img src="${CAT('pinky_05')}" alt="" class="hop"><p>5일 동안 약속을 잘 지킨 나에게 주는 메달이에요.<br>마음에 드는 색을 골라 저장해 보세요!</p></div>
    <div class="md-list" id="mdList">${Object.keys(MEDAL_COLORS).map(k => `<button class="md-card ${k === color ? 'on' : ''}" data-k="${k}" aria-label="${MEDAL_COLORS[k].label} 메달"><span class="md-chk"></span><canvas data-c="${k}"></canvas></button>`).join('')}</div>
    <button class="btn pink big md-save" id="mdSave">⬇ 선택한 메달 이미지로 저장하기 ›</button>
    <button class="link md-later" id="mdLater">다음에 저장할래요</button>`, { cls: 'medal-dim' });
  $$('canvas[data-c]', m).forEach(cv => drawMedal(cv, { color: cv.dataset.c, stars, cardNo }));
  const paintBtn = () => {
    const b = $('#mdSave', m);
    if (savedColor === color) b.innerHTML = board ? '📌 선생님 게시판에 올리기 ›' : '✔ 저장 완료! 다른 색도 저장하기';
    else b.innerHTML = '⬇ 선택한 메달 이미지로 저장하기 ›';
    b.classList.toggle('green', savedColor === color && !!board);
  };
  $('#mdList', m).addEventListener('click', e => {
    const b = e.target.closest('[data-k]'); if (!b || b.dataset.k === color) return;
    color = b.dataset.k; playSfx('tab');
    $$('.md-card', m).forEach(x => x.classList.toggle('on', x === b)); replay(b, 'pop'); paintBtn();
  });
  const save = async () => {
    const cv = document.createElement('canvas');
    await drawMedal(cv, { color, stars, cardNo });
    try {
      await saveCanvasPNG(cv, `challenge-medal_${cardNo}.png`);
      savedColor = color; playSfx('save'); replay($(`.md-card[data-k="${color}"]`, m), 'shine-once');
      toast('메달을 저장했어요! 기록을 지워도 이 이미지는 남아요.', 2200); paintBtn();
    } catch (e) { toast(e && e.name === 'AbortError' ? '저장이 취소됐어요.' : '저장하지 못했어요. 다시 눌러 주세요.'); }
  };
  onTap($('#mdSave', m), async () => {
    if (savedColor === color && board) { playSfx('next'); return window.open(board, '_blank', 'noopener'); }
    if (savedColor === color && !board) { savedColor = null; paintBtn(); }
    await save();
  });
  const close = () => { playSfx('tap'); Modal.close(); };
  onTap($('#mdX', m), close); onTap($('#mdLater', m), close);
  m.addEventListener('click', e => { if (e.target === m) close(); });
}

/* 색종이 (S48 진입 때 한 번) */
function confetti() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const box = document.createElement('div'); box.className = 'confetti';
  const cols = ['#f0196e', '#ffd43b', '#4fa0ff', '#4fcf6a', '#9a6bff'];
  for (let i = 0; i < 36; i++) { const s = document.createElement('i'); s.style.left = Math.random() * 100 + '%'; s.style.background = cols[i % 5]; s.style.animationDelay = Math.random() * .6 + 's'; s.style.transform = `rotate(${Math.random() * 360}deg)`; box.appendChild(s); }
  $('#app').appendChild(box); setTimeout(() => box.remove(), 3200);
}

/* ===================== S48-2 기록 삭제 확인 팝업 (S46·S48 공통) ===================== */
function openDeleteModal() {
  const m = Modal.open(`
    <div class="pop-head redbar">⚠ 정말 기록을 지우시겠습니까?</div>
    <div class="del-grid">
      <div class="del-art"><img src="${CAT('pinky_01')}" alt=""><span class="trash">🗑</span></div>
      <div>
        <p class="pop-box pink">지금까지 참여한 모든 실천 기록과 약속 카드가 <strong>영구히 삭제</strong>되며, 복구할 수 없습니다.</p>
        <p class="pop-box yellow">특히, <strong>친구와</strong> 함께 쓰는 태블릿이라면 <strong>신중하게</strong> 선택해 주세요!</p>
      </div>
    </div>
    <div class="pop-btns"><button class="btn blue" data-autofocus id="dNo">아니오, 취소할게요</button><button class="btn red" id="dYes">네, 모두 지울래요</button></div>`,
    { cls: 'delete', onBack: () => {}, sfx: 'full' });
  onTap($('#dNo', m), () => { playSfx('tap'); Modal.close(); });
  onTap($('#dYes', m), () => {
    $('#dYes', m).disabled = true; playSfx('delete');
    Store.clearAll(); signatureImg = null; savedCompleteThisSession = false;
    Modal.close();
    Router.go(Config.get().mode === 'event' ? 'S39' : 'S00', {}, { replace: true });
  });
}

/* ===================== S49 선생님 설정 (한 화면 · 탭 2개 · 미리 보기) ===================== */
const isHttps = s => /^https:\/\/\S+$/i.test(s);
const DEMO_BASE = 'https://health-action-card.github.io/Allergy-Promise-Card/';
const PREVIEW_VIEWS = [['start', '처음 화면'], ['RULES', '약속 고르기'], ['S44', '카드 꾸미기'], ['S46', '5일 체크'], ['S48', '완료 화면']];
Router.screens.T49 = (app, p) => {
  const returnTo = p.returnTo || 'S00';
  let tab = p.tab || 1, d = Draft.get(), dev = 'tablet', view = Draft.get().mode === 'event' ? 'card' : 'lab';
  const local = location.protocol === 'file:' || ['localhost', '127.0.0.1', ''].includes(location.hostname);
  const base = local ? DEMO_BASE : location.origin + location.pathname;
  const okBoard = () => d.board && isHttps(d.board);
  const query = () => '?mode=' + (d.mode === 'event' ? 'event' : 'class') + (okBoard() ? '&board=' + encodeURIComponent(d.board) : '');
  const urlOf = () => base + query();
  app.innerHTML = `<div class="sc outdoor tg">
    <img class="tg-cat" src="${CAT('pinky_03')}" alt="">
    <h1 class="tg-title">⚙ 냥박사 알레르기 연구소 · <em>선생님 설정</em></h1>
    <p class="tg-sub">✦ 학생들에게 나눠 주기 전, 수업 활용 방식과 결과 공유 방법을 정해 주세요 ✦</p>
    <button class="tg-close" id="tClose">✕ 닫기</button>
    <nav class="tg-tabs"><button class="tg-tab" data-t="1">⚙ <b>01</b> 기본 설정</button><button class="tg-tab" data-t="2">▦ <b>02</b> 공유 준비 및 QR 코드</button></nav>
    <section class="tg-panel" id="panel"></section>
  </div>`;
  const viewName = () => view === 'lab' ? 'S00' : 'S39';
  const pvSrc = () => `index.html${query()}&preview=1&view=${viewName()}`;
  const fitFrame = () => {
    const f = $('#frame'), ifr = $('#pv'); if (!f) return;
    const W = dev === 'tablet' ? 1600 : 393, H = dev === 'tablet' ? 900 : 852, s = Math.min(f.clientWidth / W, f.clientHeight / H);
    Object.assign(ifr.style, { width: W + 'px', height: H + 'px', transform: `translate(-50%,-50%) scale(${s})` });
  };
  const drawPrev = () => {
    if (tab === 1) {
      if (d.mode === 'event' && view === 'lab') view = 'card';
      $$('#views button').forEach(x => { x.classList.toggle('on', x.dataset.v === view); x.disabled = x.dataset.v === 'lab' && d.mode === 'event'; });
      $('#pv').src = pvSrc(); fitFrame();
      $('#pvcap').textContent = view === 'lab' ? '🔬 수업용 학생은 연구소에서 시작해요. 연구소 학습(S00~S38A)을 마치면 약속 카드로 넘어가요.'
        : d.mode === 'event' ? '✏️ 행사용: 학생은 QR을 찍으면 바로 이 약속 카드 화면에서 시작해요.' : '🛡 수업용: 연구소 학습을 마친 학생이 이 약속 카드 화면으로 와요.';
    } else {
      $('#qr').innerHTML = QR.toSVG(urlOf()); $('#lnk').textContent = urlOf();
      $('#modeChip').innerHTML = `지금 설정: <b>${d.mode === 'event' ? '✏️ 행사용 모드' : '📚 수업용 모드'}</b> <span>바꾸기 ›</span>`;
    }
  };
  const draw = () => {
    $$('.tg-tab').forEach(b => b.classList.toggle('on', +b.dataset.t === tab));
    if (tab === 1) {
      $('#panel').innerHTML = `
      <div class="tg-col">
        <h3 class="tg-h sky"><i>🖥</i>앱 실행 모드 선택</h3>
        <div class="tg-modes" id="seg">
          <button data-m="class" class="${d.mode !== 'event' ? 'on' : ''}"><span class="rd"></span><span class="tx"><b>수업용 모드</b>연구소 학습(S00~S38A)을 마친 후<br>예방 약속 카드를 만듭니다.</span><em>📚</em></button>
          <button data-m="event" class="${d.mode === 'event' ? 'on' : ''}"><span class="rd"></span><span class="tx"><b>행사용 모드</b>학습 과정을 생략하고 '예방 약속 카드<br>만들기(P7)' 화면으로 바로 진입합니다.</span><em>✏️</em></button>
        </div>
        <h3 class="tg-h lav"><i>☁</i>결과 공유 게시판 <span class="opt">선택사항</span></h3>
        <p class="tg-label">학생들이 <b>5일 챌린지</b> 메달 이미지를 올릴 패들렛, 띵커벨 보드 주소</p>
        <label class="tg-url" id="uf">🔗<input type="url" inputmode="url" id="board" placeholder="예: https://padlet.com/..." value="${esc(d.board)}"></label>
        <p class="tg-err" id="err"></p>
        <p class="tg-info"><i>i</i><span>입력하면 완료 화면에 <b>'선생님 게시판에 올리기'</b> 버튼이 생겨요.<br>앱은 어떤 정보도 자동으로 보내지 않아요.</span></p>
      </div>
      <div class="tg-col">
        <div class="tg-pvhead"><h3 class="tg-h pink"><i>👀</i>미리 보기</h3>
          <div class="tg-views" id="views"><button data-v="lab">🔬 연구소</button><button data-v="card">🛡 약속 카드</button></div>
          <div class="tg-dev" id="dev"><button data-d="tablet" class="${dev === 'tablet' ? 'on' : ''}">태블릿</button><button data-d="phone" class="${dev === 'phone' ? 'on' : ''}">휴대폰</button></div></div>
        <div class="tg-frame" id="frame"><iframe id="pv" title="학생 화면 미리 보기"></iframe></div>
        <p class="tg-pvcap" id="pvcap"></p>
        <div class="tg-btns"><button class="tg-reset" id="reset">기본값으로</button><button class="tg-go pink" id="toNext">다음 단계로 ›</button></div>
      </div>`;
      $('#seg').addEventListener('click', e => { const b = e.target.closest('[data-m]'); if (!b) return; d.mode = b.dataset.m; Draft.set(d); view = d.mode === 'event' ? 'card' : 'lab';
        $$('#seg button').forEach(x => x.classList.toggle('on', x === b)); drawPrev(); });
      $('#board').addEventListener('change', e => { d.board = e.target.value.trim(); Draft.set(d);
        const bad = d.board && !isHttps(d.board); $('#uf').classList.toggle('bad', !!bad); $('#err').textContent = bad ? '⚠ https로 시작하는 주소를 넣어 주세요.' : ''; });
      $('#views').addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (!b || b.disabled) return; view = b.dataset.v; drawPrev(); });
      $('#dev').addEventListener('click', e => { const b = e.target.closest('[data-d]'); if (!b) return; dev = b.dataset.d; $$('#dev button').forEach(x => x.classList.toggle('on', x === b)); fitFrame(); });
      onTap($('#toNext'), () => { tab = 2; draw(); });
      onTap($('#reset'), () => { d = { mode: 'class', board: '' }; Draft.set(d); view = 'lab'; draw(); toast('기본값으로 되돌렸어요'); });
    } else {
      $('#panel').innerHTML = `
      <div class="tg-col qrcol">
        <h3 class="tg-ribbon">📱 학생 접속 QR코드</h3>
        <button class="tg-mode" id="modeChip"></button>
        <div class="tg-qrbox"><span class="ray l"></span><button class="tg-qr" id="qr" aria-label="QR 크게 보기"></button><span class="ray r"></span></div>
        <p class="tg-hint">⤢ QR 코드를 누르면 전체 화면으로 크게 확대됩니다.</p>
        <img class="tg-cat2" src="${CAT('pinky_02')}" alt="">
      </div>
      <div class="tg-col">
        <h3 class="tg-h sky"><i>🔗</i>접속 링크 직접 공유</h3>
        <div class="tg-link" id="lnk"></div>
        <button class="tg-go blue" id="copy">⧉ 링크 복사하기</button>
        <h3 class="tg-h lav"><i>☁</i>5일 챌린지 결과 게시판</h3>
        ${okBoard()
          ? `<div class="tg-board"><span>☁ ${esc(d.board)}</span><button class="tg-go blue sm" id="bqr">📌 결과 게시판 QR 보기</button></div>`
          : `<div class="tg-board none"><span>⚠ 5일 챌린지 업로드 게시판 설정이 안 되었습니다.</span><button class="tg-reset" id="goSet">01 기본 설정에서 넣기 ›</button></div>`}
        <p class="tg-info"><i>i</i><span>설정을 바꾸면 링크와 QR도 바뀌어요.<br>학생들은 <b>새 QR을 다시 스캔</b>해야 해요.</span></p>
        <div class="tg-btns"><button class="tg-go white" id="prev">‹ 이전 (설정 수정)</button><button class="tg-go pink" id="done">설정 완료 및 닫기 ✓</button></div>
      </div>`;
      onTap($('#copy'), async () => { if (await copyText(urlOf(), $('#lnk'))) toast('✅ 링크를 복사했어요.', 1800); });
      onTap($('#bqr'), () => full('📌 결과 게시판 QR (접속용 아님)', d.board, true));
      onTap($('#goSet'), () => { tab = 1; draw(); setTimeout(() => { const i = $('#board'); if (i) i.focus(); }, 50); });
      onTap($('#qr'), () => full('📱 학생 접속 QR코드', urlOf()));
      onTap($('#modeChip'), () => { tab = 1; draw(); });
      onTap($('#prev'), () => { tab = 1; draw(); });
      onTap($('#done'), () => Router.go(returnTo));
    }
    drawPrev();
  };
  const full = (title, text, warn) => {
    const m = Modal.open(`<h3 class="${warn ? 'warn' : ''}">${title}</h3><div class="qr-big">${QR.toSVG(text)}</div><p>${warn ? '5일 챌린지를 마친 뒤 메달 이미지를 올릴 때 쓰세요' : '태블릿 카메라로 스캔하세요'}</p><button class="btn white" data-autofocus id="qc">✕ 닫기</button>`, { cls: 'qr-full', sfx: null });
    onTap($('#qc', m), () => Modal.close());
  };
  $('.tg-tabs').addEventListener('click', e => { const b = e.target.closest('[data-t]'); if (!b) return; tab = +b.dataset.t; draw(); });
  onTap($('#tClose'), () => Router.go(returnTo));
  draw();
};
Router.screens.T50 = (app, p) => Router.screens.T49(app, { ...p, tab: 2 });

/* 미리 보기용 예시 기록 (preview 키에만 저장) */
function seedPreview(view) {
  Store.clearAll();
  Store.set('name', '김건강'); Store.set('cardNo', 'AL-PREVIEW');
  Store.set('rules', { home: ['home-1', 'home-2'], school: ['school-1', 'school-3'], outside: ['outside-2'] });
  Store.set('custom', { home: [], school: [], outside: [] });
  if (view === 'S46' || view === 'S48') {
    const real = DateK.override; DateK.override = '2026-11-04';
    const c = Challenge.create ? Challenge.create() : null;
    const cc = Challenge.get(), ids = selectedRules().map(r => r.id);
    const upto = view === 'S48' ? 5 : 2;
    cc.days.slice(0, upto).forEach((d, i) => { cc.log[d] = {}; ids.forEach((id, j) => cc.log[d][id] = (i === 1 && j === 1) ? 'X' : 'O'); });
    Store.set('challenge', cc); cc.days.slice(0, upto).forEach(d => Challenge.recompute(Challenge.get(), d));
    DateK.override = view === 'S48' ? '2026-11-20' : cc.days[2]; void c; void real;
  }
}

/* ===================== 앱 시작 ===================== */
(function start() {
  const qs = new URLSearchParams(location.search);
  if (/^\d{4}-\d{2}-\d{2}$/.test(qs.get('today') || '')) DateK.override = qs.get('today'); // 테스트용 날짜
  /* 1) 교사 링크의 설정을 이 기기에 저장 */
  if (qs.has('mode') || qs.has('board')) {
    const board = qs.get('board') || '';
    Config.set({ mode: qs.get('mode') === 'event' ? 'event' : 'class', board: isHttps(board) ? board : '' });
    qs.delete('mode'); qs.delete('board');
  }
  /* 2) 아이폰·아이패드 홈 화면 앱 첫 실행: Safari 기록 이어 받기 */
  if (location.hash.startsWith('#restore=')) {
    if (!Store.hasRecord()) { try { Store.restore(JSON.parse(decodeURIComponent(escape(atob(location.hash.slice(9)))))); } catch (e) {} }
  }
  const q = qs.toString();
  history.replaceState(null, '', location.pathname + (q ? '?' + q : ''));
  /* 3) 기록 보존 요청 */
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  /* 미리 보기(iframe): 예시 기록으로 원하는 화면만 보여 주기 */
  if (PREVIEW) { seedPreview(qs.get('view')); Router.go(qs.get('view') || 'S00', {}, { replace: true }); return; }
  /* 4) 시작 화면 판단 */
  const st = Challenge.status();
  const first = st === 'ended' ? 'S47' : st !== 'none' ? 'S46' : Config.get().mode === 'event' ? 'S39' : 'S00';
  Router.go(first, {}, { replace: true });
  /* 5) 오프라인 실행 (https에서만) */
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
  /* 6) 자정이 지나면 다시 그리기 */
  let day = DateK.today();
  setInterval(() => { const n = DateK.today(); if (n !== day) { day = n; if (Router.current) Router.render(Router.current); } }, 60000);
})();
