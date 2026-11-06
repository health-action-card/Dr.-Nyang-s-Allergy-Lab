/* =========================================================
   sfx.js — 효과음 12종 (연구소 'scan' 추가) (파일 없이 코드로 만든 소리, Web Audio API)
   문서 공통 기준 12번 그대로. 참고앱에는 아직 연결되지 않음.
   사용: playSfx('check');   끄기: setSound(false);
   ========================================================= */
'use strict';

const Sfx = { ctx: null, on: (() => { try { return localStorage.getItem('appSound') !== 'off'; } catch (e) { return true; } })() };

function setSound(on) {
  Sfx.on = on;
  try { localStorage.setItem('appSound', on ? 'on' : 'off'); } catch (e) {}
}

function tone(type, f1, f2, start, dur, vol) {
  const c = Sfx.ctx, o = c.createOscillator(), g = c.createGain(), t = c.currentTime + start;
  o.type = type; o.frequency.setValueAtTime(f1, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
}

function playSfx(name) {
  if (!Sfx.on) return;
  try {
    Sfx.ctx = Sfx.ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (Sfx.ctx.state === 'suspended') Sfx.ctx.resume();
    const v = 0.25, s = 0.12;
    ({
      tap:     () => tone('sine', 660, 0, 0, 0.05, v),                                   // 일반 버튼
      next:    () => { tone('sine', 660, 0, 0, 0.06, v); tone('sine', 990, 0, 0.06, 0.08, v); }, // 다음 화면
      tab:     () => tone('sine', 520, 880, 0, 0.12, v),                                 // 탭·디자인·메달 색
      check:   () => { tone('sine', 1046, 0, 0, 0.18, v); tone('sine', 1568, 0, 0, 0.18, v * 0.5); }, // 체크·지켰어요
      uncheck: () => tone('triangle', 330, 0, 0, 0.08, v),                               // 해제·못 지켰어요
      open:    () => tone('sine', 600, 720, 0, 0.08, s),                                 // 팝업 열림
      full:    () => tone('sine', 220, 180, 0, 0.25, s),                                 // 7개 초과·3개 미만
      save:    () => { tone('sine', 784, 0, 0, 0.1, v); tone('sine', 1046, 0, 0.1, 0.18, v); }, // 저장 완료
      star:    () => [1046, 1318, 1568].forEach((f, i) => tone('sine', f, 0, i * 0.07, 0.12, v)), // 별·3개 달성
      fanfare: () => [[523, 0, .12], [659, .12, .12], [784, .24, .12], [1046, .36, .4]].forEach(([f, st, d]) => tone('sine', f, 0, st, d, v)), // S48 진입
      delete:  () => tone('sine', 600, 150, 0, 0.3, s),                                  // 기록 삭제
      scan:    () => { tone('square', 1320, 0, 0, 0.05, s * 0.6); tone('square', 1760, 0, 0.07, 0.06, s * 0.6); } // 연구소 바코드 스캔 '삐빅'
    })[name]?.();
  } catch (e) { /* 소리 실패는 무시 */ }
}
