/* POST /api/daily/start {token} → {day, code, startedAt}。今日の盤面を渡し、その瞬間を開始時刻として記録する(1日1回。盤面はここ以外では配らない)。
   409 played=今日はもう始めた / 503 prep=今日の盤面がまだ無い。応答が届かなかった人のために、RETRY_MS 以内なら同じ端末は同じ盤面をもう一度受け取れる。 */
import{json,jstDay,okToken,readJson,RETRY_MS}from'../../_lib.js';
export async function onRequestPost({request,env}){
 const b=await readJson(request);if(!b||!okToken(b.token))return json({err:'bad'},400);
 const now=Date.now(),day=jstDay(now),db=env.DB,bd=await db.prepare('SELECT code FROM boards WHERE day=?').bind(day).first();
 if(!bd)return json({err:'prep'},503);
 const ins=await db.prepare('INSERT INTO plays(day,token,started,done) VALUES(?,?,?,0) ON CONFLICT(day,token) DO NOTHING').bind(day,b.token,now).run();
 if(ins.meta.changes==1)return json({day,code:bd.code,startedAt:now});
 const p=await db.prepare('SELECT started,done FROM plays WHERE day=? AND token=?').bind(day,b.token).first();
 if(p&&!p.done&&now-p.started<RETRY_MS)return json({day,code:bd.code,startedAt:p.started});
 return json({err:'played'},409)}
