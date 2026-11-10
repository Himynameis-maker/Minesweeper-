/* 均一な配置: 全ての2x2マスの中に、爆弾が1個以上ある。
   ふつうは開始マスの周囲(数字0の領域)が全部安全になり、その中に爆弾なしの2x2が必ず入ってしまうので、
   startOnly:true で「開始マスだけ安全(開始の数字は0でなくてよい)」に切り替える(CORE: prep.js の s1 / gen.js の SZ)。
   全ての2x2に下限つきの制約が重なって盤面全体が1つにつながるので、probe:true(仮定して矛盾を探す推論)を使う。 */
reg({id:'uniform',
 name:'均一な配置', desc:'全ての2×2マスの中に、爆弾が1個以上ある',
 startOnly:true,
 probe:true,
 /* grp / iso / conn / dragon 専用の配置作りは下限つき cons を見ない(context.md 第9節)ので併用不可。論理的に両立しないのではなく、生成の都合 */
 conflicts:['groupBomb','noIsolate','allConnected','dragon','twinDragon'],
 why:'盤面は3×3より大きいものだけ(3×4以上)',
 /* 爆弾数の下限: 盤面を2x2で区切った個数(縦÷2 × 横÷2、切り捨て)。上限: 盤面の4割(5割を超えると生成が極端に遅い/失敗する) */
 ok:c=>c.R>=3&&c.C>=3&&c.R*c.C>=12&&c.M>=Math.floor(c.R/2)*Math.floor(c.C/2)&&c.M<=Math.floor(c.R*c.C*0.4),
 cons:(R,C)=>{const o=[];for(let r=0;r+1<R;r++)for(let c=0;c+1<C;c++){const i=r*C+c;o.push({cells:[i,i+1,i+C,i+C+1],lo:1,hi:4})}return o}
});
