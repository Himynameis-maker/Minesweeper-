/* 長方形: 地雷は 1x1〜1x4 の直線(長方形)になり、長方形どうしは縦横斜めに触れない。
   cons だけで表現できる(全て上限 hi のみ。下限なしなので第9節の生成制限は受けない):
   - 2x2 のどの枠も地雷は2個以下  → L字/T字/2x2正方形ができない(=曲がらない)
   - 2x2 の対角2マスは同時に地雷にならない → 斜め接触の禁止(8近傍連結=縦横連結になる)
   - 横5マス・縦5マスの窓は地雷4個以下 → 長さ5以上の直線を禁止 */
reg({id:'rect',
 name:'長方形', desc:'地雷は1x1〜1x4の直線になり、別の地雷とは縦横斜めに触れない',
 // noTouch: 縦横に隣り合う地雷を禁じるので全部 1x1 になり、noTouch が rect に含まれて「外しても解ける」飾りになるため併用不可。
 // groupBomb: 4個1組だと全部が1x4の直線に縮み、生成も難しいので併用しない方針(rect 側で宣言すれば双方向に効く)。
 conflicts:['noTouch','groupBomb'],
 cons:(R,C)=>{const o=[],id=(r,c)=>r*C+c;
  for(let r=0;r+1<R;r++)for(let c=0;c+1<C;c++){
   const a=id(r,c),b=id(r,c+1),d=id(r+1,c),e=id(r+1,c+1);
   o.push({cells:[a,b,d,e],lo:0,hi:2},{cells:[a,e],lo:0,hi:1},{cells:[b,d],lo:0,hi:1})}
  for(let r=0;r<R;r++)for(let c=0;c+4<C;c++)o.push({cells:[0,1,2,3,4].map(k=>id(r,c+k)),lo:0,hi:4});
  for(let c=0;c<C;c++)for(let r=0;r+4<R;r++)o.push({cells:[0,1,2,3,4].map(k=>id(r+k,c)),lo:0,hi:4});
  return o}
});
