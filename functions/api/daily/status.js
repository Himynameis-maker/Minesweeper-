/* GET /api/daily/status?token=...  → {day, ver, state}(ver=今日の盤面コードのルールセット番号)。画面がスタートボタンか盤面入手ボタンかを決めるのに使う。
   state: prep(今日の盤面がまだ無い) / new(まだ遊んでいない) / playing(始めたがまだ終わっていない) / done(クリアかミスで終わった) */
import{json,jstDay,okToken}from'../../_lib.js';
export async function onRequestGet({request,env}){
 const t=new URL(request.url).searchParams.get('token');if(!okToken(t))return json({err:'bad'},400);
 const day=jstDay(Date.now()),db=env.DB,bd=await db.prepare('SELECT code FROM boards WHERE day=?').bind(day).first();
 if(!bd)return json({day,state:'prep'});
 const ver=+String(bd.code).split('.')[1]||0; /* 盤面コードのルールセット番号(画面が古い番号の盤面を「準備中」として扱うため。コード自体は返さない) */
 const p=await db.prepare('SELECT done FROM plays WHERE day=? AND token=?').bind(day,t).first();
 return json({day,ver,state:!p?'new':p.done?'done':'playing'})}
