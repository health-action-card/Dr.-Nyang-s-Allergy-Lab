// 최소 QR 생성기 (바이트 모드, 오류 보정 M, 버전 1~40) — 외부 서버·라이브러리 없이 브라우저에서 생성
(function (global) {
  const ECC_M = [-1,10,16,26,18,24,16,18,22,22,26,30,22,22,24,24,28,28,26,26,26,26,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28];
  const BLK_M = [-1,1,1,1,2,2,4,4,4,5,5,5,8,9,9,10,10,11,13,14,16,17,17,18,20,21,23,25,26,28,29,31,33,35,37,38,40,43,45,47,49];
  function rawModules(v){ let r=(16*v+128)*v+64; if(v>=2){const n=Math.floor(v/7)+2; r-=(25*n-10)*n-55; if(v>=7) r-=36;} return r; }
  function dataCodewords(v){ return Math.floor(rawModules(v)/8) - ECC_M[v]*BLK_M[v]; }
  function mul(x,y){ let z=0; for(let i=7;i>=0;i--){ z=(z<<1)^((z>>>7)*0x11D); z^=((y>>>i)&1)*x; } return z; }
  function rsDivisor(d){ const r=new Array(d).fill(0); r[d-1]=1; let root=1;
    for(let i=0;i<d;i++){ for(let j=0;j<r.length;j++){ r[j]=mul(r[j],root); if(j+1<r.length) r[j]^=r[j+1]; } root=mul(root,2); } return r; }
  function rsRem(data,div){ const r=div.map(()=>0); for(const b of data){ const f=b^r.shift(); r.push(0); div.forEach((c,i)=>r[i]^=mul(c,f)); } return r; }
  function alignPos(v,size){ if(v===1) return []; const n=Math.floor(v/7)+2; const step=(v===32)?26:Math.ceil((v*4+4)/(n*2-2))*2;
    const res=[6]; for(let p=size-7;res.length<n;p-=step) res.splice(1,0,p); return res; }

  function encode(text){
    const bytes=Array.from(new TextEncoder().encode(text));
    let v=1; for(;v<=40;v++){ const cc=v<10?8:16; if(4+cc+bytes.length*8 <= dataCodewords(v)*8) break; }
    if(v>40) throw new Error('too long');
    const cap=dataCodewords(v)*8, bits=[];
    const put=(val,len)=>{ for(let i=len-1;i>=0;i--) bits.push((val>>>i)&1); };
    put(4,4); put(bytes.length, v<10?8:16); bytes.forEach(b=>put(b,8));
    put(0, Math.min(4, cap-bits.length)); put(0, (8-bits.length%8)%8);
    for(let p=0xEC; bits.length<cap; p^=0xEC^0x11) put(p,8);
    const data=[]; for(let i=0;i<bits.length;i+=8){ let b=0; for(let j=0;j<8;j++) b=(b<<1)|bits[i+j]; data.push(b); }

    // ECC + 인터리브
    const nb=BLK_M[v], el=ECC_M[v], raw=Math.floor(rawModules(v)/8), nShort=nb-raw%nb, sLen=Math.floor(raw/nb), div=rsDivisor(el);
    const blocks=[]; for(let i=0,k=0;i<nb;i++){ const dat=data.slice(k,k+sLen-el+(i<nShort?0:1)); k+=dat.length;
      const ecc=rsRem(dat,div); if(i<nShort) dat.push(0); blocks.push(dat.concat(ecc)); }
    const all=[]; for(let i=0;i<blocks[0].length;i++) blocks.forEach((b,j)=>{ if(i!==sLen-el || j>=nShort) all.push(b[i]); });

    const size=v*4+17, m=[...Array(size)].map(()=>Array(size).fill(false)), fn=[...Array(size)].map(()=>Array(size).fill(false));
    const set=(x,y,c)=>{ m[y][x]=c; fn[y][x]=true; };
    for(let i=0;i<size;i++){ set(6,i,i%2===0); set(i,6,i%2===0); }
    [[3,3],[size-4,3],[3,size-4]].forEach(([x,y])=>{ for(let dy=-4;dy<=4;dy++) for(let dx=-4;dx<=4;dx++){ const d=Math.max(Math.abs(dx),Math.abs(dy)), xx=x+dx, yy=y+dy;
      if(xx>=0&&xx<size&&yy>=0&&yy<size) set(xx,yy,d!==2&&d!==4); } });
    const ap=alignPos(v,size), na=ap.length;
    for(let i=0;i<na;i++) for(let j=0;j<na;j++){ if((i===0&&j===0)||(i===0&&j===na-1)||(i===na-1&&j===0)) continue;
      for(let dy=-2;dy<=2;dy++) for(let dx=-2;dx<=2;dx++) set(ap[i]+dx,ap[j]+dy,Math.max(Math.abs(dx),Math.abs(dy))!==1); }
    const drawFormat=(mask)=>{ const d=(0<<3)|mask; let r=d; for(let i=0;i<10;i++) r=(r<<1)^((r>>>9)*0x537); const b=((d<<10)|r)^0x5412, g=i=>((b>>>i)&1)===1;
      for(let i=0;i<=5;i++) set(8,i,g(i)); set(8,7,g(6)); set(8,8,g(7)); set(7,8,g(8)); for(let i=9;i<15;i++) set(14-i,8,g(i));
      for(let i=0;i<8;i++) set(size-1-i,8,g(i)); for(let i=8;i<15;i++) set(8,size-15+i,g(i)); set(8,size-8,true); };
    drawFormat(0);
    if(v>=7){ let r=v; for(let i=0;i<12;i++) r=(r<<1)^((r>>>11)*0x1F25); const b=(v<<12)|r;
      for(let i=0;i<18;i++){ const c=((b>>>i)&1)===1, a=size-11+i%3, bb=Math.floor(i/3); set(a,bb,c); set(bb,a,c); } }
    // 데이터 배치
    let i=0; for(let right=size-1;right>=1;right-=2){ if(right===6) right=5;
      for(let vert=0;vert<size;vert++) for(let j=0;j<2;j++){ const x=right-j, up=((right+1)&2)===0, y=up?size-1-vert:vert;
        if(!fn[y][x] && i<all.length*8){ m[y][x]=((all[i>>>3]>>>(7-(i&7)))&1)===1; i++; } } }
    // 마스크 선택
    const MASK=[(x,y)=>(x+y)%2===0,(x,y)=>y%2===0,(x,y)=>x%3===0,(x,y)=>(x+y)%3===0,(x,y)=>(Math.floor(x/3)+Math.floor(y/2))%2===0,
      (x,y)=>x*y%2+x*y%3===0,(x,y)=>(x*y%2+x*y%3)%2===0,(x,y)=>((x+y)%2+x*y%3)%2===0];
    const apply=k=>{ for(let y=0;y<size;y++) for(let x=0;x<size;x++) if(!fn[y][x]&&MASK[k](x,y)) m[y][x]=!m[y][x]; };
    const penalty=()=>{ let p=0;
      for(let y=0;y<size;y++){ let run=1; for(let x=1;x<=size;x++){ if(x<size&&m[y][x]===m[y][x-1]) run++; else { if(run>=5) p+=run-2; run=1; } } }
      for(let x=0;x<size;x++){ let run=1; for(let y=1;y<=size;y++){ if(y<size&&m[y][x]===m[y-1][x]) run++; else { if(run>=5) p+=run-2; run=1; } } }
      for(let y=0;y<size-1;y++) for(let x=0;x<size-1;x++){ const c=m[y][x]; if(c===m[y][x+1]&&c===m[y+1][x]&&c===m[y+1][x+1]) p+=3; }
      let dark=0; m.forEach(r=>r.forEach(c=>{ if(c) dark++; })); p+=Math.floor(Math.abs(dark*20-size*size*10)/(size*size))*10; return p; };
    let best=0, bestP=Infinity; for(let k=0;k<8;k++){ apply(k); drawFormat(k); const p=penalty(); if(p<bestP){ bestP=p; best=k; } apply(k); }
    apply(best); drawFormat(best);
    return { size, modules:m, version:v };
  }
  function toSVG(text, border=4){
    const q=encode(text), n=q.size+border*2; let d='';
    q.modules.forEach((row,y)=>row.forEach((c,x)=>{ if(c) d+=`M${x+border},${y+border}h1v1h-1z`; }));
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
  }
  global.QR = { encode, toSVG };
})(window);
