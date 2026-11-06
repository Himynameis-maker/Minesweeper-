/* 端正: 縦横どちらも、同じ種類(爆弾/安全マス)が3マス以上続かない。
   全ての縦横3連のマスで爆弾は1〜2個(下限つき cons。生成は gen.js の lsample/smove)。 */
reg({id:'tidy',
 name:'端正', desc:'爆弾も安全マスも、縦か横に3マス以上は続かない',
 // 3連ごとに爆弾1〜2個
 cons:(R,C)=>{const a=[];
  for(let r=0;r<R;r++)for(let c=0;c<C;c++){const i=r*C+c;
   if(c+2<C)a.push({cells:[i,i+1,i+2],lo:1,hi:2});
   if(r+2<R)a.push({cells:[i,i+C,i+2*C],lo:1,hi:2});}
  return a},
 // 爆弾は盤面の4〜6割(仮置き。headless の結果で調整)
 ok:c=>c.M*5>=c.R*c.C*2&&c.M*5<=c.R*c.C*3,
});
