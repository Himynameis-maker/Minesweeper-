/* GET /api/daily/status?token=...  → {day, state}。画面がスタートボタンか盤面入手ボタンかを決めるのに使う。
   state: prep(今日の盤面がまだ無い) / new(まだ遊んでいない) / playing(始めたがまだ終わっていない) / done(クリアかミスで終わった) */
import{json,jstDay,okToken}from'../../_lib.js';
export async function onRequestGet({request,env}){
 const t=new URL(request.url).searchParams.get('token');if(!okToken(t))return json({err:'bad'},400);
 const day=jstDay(Date.now()),db=env.DB,bd=await db.prepare('SELECT 1 AS x FROM boards WHERE day=?').bind(day).first();
 if(!bd)return json({day,state:'prep'});
 const p=await db.prepare('SELECT done FROM plays WHERE day=? AND token=?').bind(day,t).first();
 return json({day,state:!p?'new':p.done?'done':'playing'})}
