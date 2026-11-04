/* グループ爆弾: 宣言だけ。実体は CORE([grp] 印: prep.js / solver.js / gen.js)にある。 */
reg({id:'groupBomb',name:'グループ爆弾',desc:'爆弾は縦横につながった4個1組(斜めは不可)で、組同士は縦横で隣り合わない',grp:4,conflicts:['noTouch']});
