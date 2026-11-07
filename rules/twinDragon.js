/* 双竜: 龍(左端→右端)に加えて、上端→下端の龍も必ず1体いる。龍に8近傍で触れる爆弾は、必ず龍の一部(龍以外の爆弾は龍に触れない)。
   全体制約 dragon:2 を CORE が実装(prep の tok/tpath、solver の [dragon] の TW、gen の tsample)。dragon:true(龍)の2体版で、同時に使えるのはどちらか1つだけ。
   龍は2体(H と V)で、どちらかがもう片方に含まれてしまう形(斜めの一本道を2体と数える等)は不可。Hと同じマスを通るのはOK。
   龍(H∪V)と、それに触れない爆弾だけで盤面ができている。龍以外の爆弾が別の龍になることはない(H と V には必ず触れるため)。
   併用不可: dragon(同じ全体制約), groupBomb / noIsolate(専用サンプラが優先され龍を置けない。論理的にも噛み合わない), noTouch(縦横の隣接禁止。龍は直進で縦横に並ぶ),
            rect(直線のみ・斜め不可。龍は斜めに進む), allConnected(全爆弾が龍になり、龍の外に爆弾が置けない)。 */
reg({id:'twinDragon',
 name:'双竜', desc:'左端から右端まで、上端から下端まで、爆弾が2体の龍になってつながっている(1つ進むごとに、まっすぐか斜めまで)。龍に隣り合う爆弾(斜め含む)は、必ず龍の一部。',
 dragon:2,
 ok:c=>c.M>=c.R+c.C-1&&c.M<=Math.floor(c.R*c.C*.3),
 conflicts:['dragon','groupBomb','noIsolate','noTouch','rect','allConnected']
});
