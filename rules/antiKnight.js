/* 非ナイト: 爆弾同士は桂馬(チェスのナイト)の位置にならない。
   cons だけで書ける(2マスの組ごとに「爆弾は2個まで…ではなく1個以下」)。下限なしなので生成の制限は受けない。 */
reg({id:'antiKnight',
 name:'非ナイト', desc:'どの爆弾も、別の爆弾から桂馬(ナイト)の位置にはない',
 // 爆弾が多すぎると桂馬を避けきれず生成が重くなるので、盤面の3.5割までにする
 ok:c=>c.M<=Math.floor(c.R*c.C*0.35),
 cons:(R,C)=>{
  const a=[];
  for(let i=0;i<R*C;i++)
   for(const j of offs(R,C,i,KN))
    if(j>i)a.push({cells:[i,j],lo:0,hi:1}); // 桂馬の組を1回ずつ。両方が爆弾にはならない
  return a;
 }
});
