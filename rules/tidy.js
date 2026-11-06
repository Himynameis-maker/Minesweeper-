/* 端正: 縦横どちらも、同じ種類(爆弾/安全マス)が3マス以上続かない。
   全ての縦横3連のマスで爆弾は1〜2個(下限つき cons。生成は gen.js の lsample/smove)。 */
reg({id:'tidy',
 probe:true,                            // 仮定して矛盾を探す推論を solver で使う(重なる3連制約は全列挙が打ち切られるため)
 name:'端正', desc:'爆弾も安全マスも、縦か横に3マス以上は続かない',
 // 併用不可(いずれも 7x7 で5回中5回生成失敗。headless の併用検査で確認):
 //  crossScan: 数字0の開始マスが上下左右2マスずつ開き、安全マスが3つ並ぶ(端正に反する)ので論理的に両立しない
 //  noTouch / rect: 爆弾が縦横に隣り合えないと、3連に1個以上の下限と合わせてほぼ市松に固定され、数字が飾りになる
 //  allConnected / groupBomb / noIsolate: 専用サンプラが下限つき cons を見ないので配置が作れない(gen.js の制限。第9節)
 conflicts:['crossScan','noTouch','rect','allConnected','groupBomb','noIsolate'],
 // 3連ごとに爆弾1〜2個
 cons:(R,C)=>{const a=[];
  for(let r=0;r<R;r++)for(let c=0;c<C;c++){const i=r*C+c;
   if(c+2<C)a.push({cells:[i,i+1,i+2],lo:1,hi:2});
   if(r+2<R)a.push({cells:[i,i+C,i+2*C],lo:1,hi:2});}
  return a},
 // 爆弾は盤面の4〜6割(6x6〜9x9 で生成を確認済み。範囲外は未検査)
 ok:c=>c.M*5>=c.R*c.C*2&&c.M*5<=c.R*c.C*3,
});
