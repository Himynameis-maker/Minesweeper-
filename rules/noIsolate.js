/* 孤立なし: どの爆弾も、縦横斜めの8マスのどこかに別の爆弾がある。
   cons では書けない(爆弾がある場合だけ課す条件つき制約)ので CORE の iso フック([iso] 印: prep/solver/gen)に実体がある。 */
reg({id:'noIsolate',name:'孤立なし',desc:'どの爆弾も、縦横斜めの8マスのどこかに別の爆弾がある(孤立した爆弾はない)',
 iso:true,
 ok:c=>c.M>=2,
 // groupBomb: 4個1組の中は縦横につながっているので、孤立なしが常に成り立ち飾りになる
 conflicts:['groupBomb']});
