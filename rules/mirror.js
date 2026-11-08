/* 鏡爆弾: 宣言だけ。実体は CORE([mir] 印: prep.js / solver.js / gen.js / play.js)にある。
   どれか1個の爆弾が鏡爆弾(どれかは表示しない。個数は prep.js の MIRN)。マスpの鏡爆弾は、盤面の中心と点対称なマスの周囲8マスの数字を+1する。
   鏡爆弾は上下左右に爆弾が無い(ほかの爆弾とも縦横で隣り合わない)。数字の意味を変えるので excl:'num'。
   liar/liar2/colorDouble(数字の数え方)・dragon(隠れ龍。数字の隠れ状態 L.sh を同じように使う)とは併用不可。 */
reg({id:'mirror',name:'鏡爆弾',desc:'爆弾のうち1個は鏡爆弾(どれかは不明・縦横に爆弾が隣り合わない)。盤面の中心と点対称なマスの周囲8マスの数字を+1する',
 mir:true,excl:'num',conflicts:['liar','liar2','colorDouble','dragon'],
 ok:c=>c.M>=2&&c.M<=Math.floor(c.R*c.C*.6)});
