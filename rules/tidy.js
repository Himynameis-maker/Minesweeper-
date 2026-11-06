/* 端正: 縦横どちらも、同じ種類(爆弾/安全マス)が4マス以上続かない。
   全ての縦横4連のマスで爆弾は1〜3個(下限つき cons。生成は gen.js の lsample/smove)。
   (旧版は3マス以上続かない=3連に爆弾1〜2個。ほぼ市松に固定されて盤面が似通ったので4連に変更。連の長さは cons 内の K だけで変えられる) */
reg({id:'tidy',
 probe:true,                            // 仮定して矛盾を探す推論を solver で使う(重なる4連制約は全列挙が打ち切られるため)
 name:'端正', desc:'爆弾も安全マスも、縦か横に4マス以上は続かない',
 // 併用不可:
 //  crossScan: 数字0の開始マスが上下左右2マスずつ開き、安全マスが5つ並ぶ(端正に反する)ので論理的に両立しない
 //  rect: 爆弾は直線(1x4は4連に反する)で斜めにも触れない。縦横どの4連にも爆弾が要るので、爆弾が4マス間隔・半ずらしの格子にほぼ固定され、盤面が似通う
 //  noTouch: 3連版では「ほぼ市松に固定」で生成失敗していた。4連では緩むので、noTouch が縦横だけの隣接禁止なら両立する可能性が高いが【未検査】。noTouch.js で確認できたら外す
 //  allConnected / groupBomb / noIsolate: 専用サンプラ(csample/gsample/isample)が下限つき cons を見ないので配置が作れない(gen.js の制限。第9節。3連/4連は無関係)
 conflicts:['crossScan','noTouch','rect','allConnected','groupBomb','noIsolate'],
 // 4連ごとに爆弾1〜3個
 cons:(R,C)=>{const a=[],K=4;
  for(let r=0;r<R;r++)for(let c=0;c<C;c++){const i=r*C+c;
   if(c+K<=C)a.push({cells:Array.from({length:K},(_,k)=>i+k),lo:1,hi:K-1});
   if(r+K<=R)a.push({cells:Array.from({length:K},(_,k)=>i+k*C),lo:1,hi:K-1});}
  return a},
 // 爆弾は盤面の3〜6.5割。6x6/7x7/8x8 の3〜6.5割(4連の理論上の限界は2.5〜7.5割)を単体で生成確認済み(各3回中3回成功)。
 // 7割では 6x6 が失敗した(25個で3回中0回)ので 6.5割までにした。9x9以上は未検査
 ok:c=>c.M*10>=c.R*c.C*3&&c.M*20<=c.R*c.C*13,
});
