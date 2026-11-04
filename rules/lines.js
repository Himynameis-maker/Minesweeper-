/* 全行全列に爆弾: cons + ok + why の例(爆弾数が少なすぎると成り立たない) */
reg({id:'lines',name:'全行全列に爆弾',desc:'どの行にも列にも爆弾が1個以上ある',ok:c=>c.M>=Math.max(c.R,c.C),why:'爆弾数が縦・横の大きい方以上必要です',
 cons:(R,C)=>{const o=[];for(let r=0;r<R;r++)o.push({cells:[...Array(C)].map((_,c)=>r*C+c),lo:1,hi:C});
  for(let c=0;c<C;c++)o.push({cells:[...Array(R)].map((_,r)=>r*C+c),lo:1,hi:R});return o}});
