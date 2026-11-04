/* ルールのひな形(index.html には読み込まない。_ で始まるファイルは無視される)。
   新ルール = rules/<id>.js を1個作る(ファイル名=id)。使うフックだけ残して他は消す。仕様: context.md 第4節。 */
reg({id:'myRule',                       // camelCase 一意。ファイル名と揃える
 name:'表示名(短く)', desc:'説明を1行で',
 // excl:'num',                         // 数字の定義を変えるルールは 'num'(同じ excl は併用不可)
 // conflicts:['otherId'],              // 併用不可の相手(片側宣言で双方向)
 // ok:c=>c.M>=c.R,                     // 適用条件 c={R,C,M}
 // why:'爆弾数では直らない理由',         // ok が盤面の形などで偽になる理由(画面表示)
 // mstep:2,                            // 爆弾数がこの倍数
 // nb:(R,C,i)=>offs(R,C,i,D8),         // マスiの数字が数えるマス
 // cons:(R,C)=>[{cells:[0,1],lo:0,hi:1}], // 常に成り立つ制約(cells内の爆弾数が lo 以上 hi 以下)
});
