/* 嘘つき数字: 宣言だけ。実体は CORE([liar] 印: prep.js / solver.js / gen.js)にある。 */
reg({id:'liar',name:'嘘つき数字',desc:'数字は実際の爆弾数と1ズレている。ただし各行・各列にちょうど1つだけ正直な数字がある',liar:true,ok:c=>c.R===c.C,why:'縦と横が同じ盤面でだけ使えます'});
