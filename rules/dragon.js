/* 龍: 左端の1マスから右端の1マスまで、爆弾が1列ごとに「同じ行 or 上下1行ずれ」でつながる列(龍)が盤面のどこかに必ずある。
   龍以外の爆弾は自由(龍に触れていてもよい)。全体制約 dragon:true を CORE が実装(solver の [dragon] / gen の dsample / prep の dok・dpath)。
   併用不可: groupBomb(連結成分が grp 個ずつ。龍は C 個以上つながる), noIsolate(塊が n 個以下。龍は C 個以上つながる),
            noTouch(縦横に隣り合う爆弾を禁止。龍は直進で縦横に並ぶ), rect(直線のみ・斜め不可。龍は斜めに進む),
            allConnected(論理的には両立するが、龍が全爆弾の背骨になり「外すと詰む」を満たしにくい。自前検査で 7x7 M=13/17 が4秒打ち切り・品質OK 1/3,0/3)。 */
reg({id:'dragon',
 name:'龍', desc:'盤面のどこかに、ランダムな位置の左端から、ランダムな位置の右端まで爆弾が連なっている(上下に0または1マスずれながら右端まで辿り着く）',
 dragon:true,
 ok:c=>c.M>=c.C&&c.M<=Math.floor(c.R*c.C*.4), // 龍は最低 C 個。多すぎると龍が当たり前になる
 conflicts:['groupBomb','noIsolate','noTouch','rect','allConnected']
});
