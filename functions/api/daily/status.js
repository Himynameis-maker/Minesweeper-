/* GET /api/daily/status?token=...  → {day, ver, state}(ver=今日の盤面コードのルールセット番号)。画面がスタートボタンか盤面入手ボタンかを決めるのに使う。
   state: prep(今日の盤面がまだ無い) / new(まだ遊んでいない) / playing(始めたがまだ終わっていない) / done(クリアかミスで終わった)
   / maint(メンテナンス=アプデのため今日は遊べない。まだ始めていない端末にだけ返す。もう始めた/終わった端末は今までどおり=盤面入手などは普通に使える) */
import{json,jstDay,okToken,getMaint,playBlocked}from'../../_lib.js';
export async function onRequestGet({request,env}){
 const t=new URL(request.url).searchParams.get('token');if(!okToken(t))return json({err:'bad'},400);
 const day=jstDay(Date.now()),db=env.DB,[bd,mday]=await Promise.all([db.prepare('SELECT code FROM boards WHERE day=?').bind(day).first(),getMaint(db)]);
 if(playBlocked(mday,day)){const q=await db.prepare('SELECT 1 AS x FROM plays WHERE day=? AND token=?').bind(day,t).first();if(!q)return json({day,state:'maint'})} /* 更新中。盤面があっても無くても「更新中」 */
 if(!bd)return json({day,state:'prep'});
 const ver=+String(bd.code).split('.')[1]||0; /* 盤面コードのルールセット番号(画面が古い番号の盤面を「準備中」として扱うため。コード自体は返さない) */
 const p=await db.prepare('SELECT done FROM plays WHERE day=? AND token=?').bind(day,t).first();
 return json({day,ver,state:!p?'new':p.done?'done':'playing'})}
