/* POST /api/daily/finish {token, day, clear, name} → {ok, ms, rank}。クリアかミスで終わったときに1回だけ呼ぶ。
   タイムはサーバーが測る(今 − 開始時刻 − CD_MS)。端末の申告は使わない。ランキングに載るのは「クリア かつ 上位TOP位」だけで、それ以外は何も保存しない
   (rank=null は圏外かミス)。日付をまたいで終わった人は、始めた日のランキングに入る(今日か昨日の分だけ受け付ける)。 */
import{json,jstDay,addDay,okDay,okToken,cleanName,readJson,CD_MS,TOP}from'../../_lib.js';
export async function onRequestPost({request,env}){
 const b=await readJson(request);if(!b||!okToken(b.token)||!okDay(b.day)||typeof b.clear!='boolean')return json({err:'bad'},400);
 const now=Date.now(),today=jstDay(now);if(b.day>today||b.day<addDay(today,-1))return json({err:'day'},400);
 const name=b.clear?cleanName(b.name):'-';if(!name)return json({err:'name'},400);
 const db=env.DB,p=await db.prepare('SELECT started FROM plays WHERE day=? AND token=? AND done=0').bind(b.day,b.token).first();
 if(!p)return json({err:'noplay'},409);
 const u=await db.prepare('UPDATE plays SET done=1 WHERE day=? AND token=? AND done=0').bind(b.day,b.token).run();
 if(u.meta.changes!=1)return json({err:'noplay'},409); /* 同時に2回送られても1回しか通らない */
 const ms=Math.max(1,now-p.started-CD_MS);if(!b.clear)return json({ok:true,ms,rank:null});
 const th=await db.prepare('SELECT ms FROM ranks WHERE day=? ORDER BY ms,at,rowid LIMIT 1 OFFSET ?').bind(b.day,TOP-1).first();
 if(th&&ms>=th.ms)return json({ok:true,ms,rank:null}); /* 圏外(同タイムは先に入った人が上) */
 const n=await db.prepare('SELECT COUNT(*) AS n FROM ranks WHERE day=? AND ms<=?').bind(b.day,ms).first();
 await db.batch([db.prepare('INSERT INTO ranks(day,name,ms,at) VALUES(?,?,?,?)').bind(b.day,name,ms,now),
  db.prepare('DELETE FROM ranks WHERE day=? AND rowid NOT IN (SELECT rowid FROM ranks WHERE day=? ORDER BY ms,at,rowid LIMIT ?)').bind(b.day,b.day,TOP)]);
 return json({ok:true,ms,rank:n.n+1})}
