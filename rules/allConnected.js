/* 手繋ぎ: 全ての爆弾が縦横斜めでひと続きにつながっている(離れた爆弾はない)。枝分かれ・塊もOK。
   cons では書けない全体制約なので CORE の conn フック([conn] 印: prep/solver/gen)に実体がある。 */
reg({id:'allConnected',name:'手繋ぎ',desc:'全ての爆弾が縦横斜めでひと続きにつながっている(離れた爆弾はない)',
 conn:true,
 ok:c=>c.M>=2,
 // noIsolate: 全体が1つにつながるなら孤立もないので飾りになる / rect: 全体が1本の直線(4個以内)になり成り立たない
 conflicts:['noIsolate','rect']});
