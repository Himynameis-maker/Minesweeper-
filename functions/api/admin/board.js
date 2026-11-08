/* /api/admin/board  GET ?day=YYYY-MM-DD → 盤面があれば 200 / 無ければ 404(workflow の「すでにあるか」)
                     PUT {day,code}      → 盤面を登録。すでにあれば置き換え、その日のプレイ記録とランキングは消す(=その日はみんなやり直せる。ルールセット番号を上げた日の作り直し用)
   どちらも Authorization: Bearer <DAILY_TOKEN> が必要。PUT のついでに、古い盤面・ランキング・プレイ記録を消す。 */
import{json,isAdmin,jstDay,addDay,okDay,okCode,readJson,dropRankCache,KEEP_DAYS}from'../../_lib.js';
export async function onRequestGet({request,env}){
 if(!isAdmin(request,env))return json({err:'auth'},401);
 const day=new URL(request.url).searchParams.get('day');if(!okDay(day))return json({err:'day'},400);
 const r=await env.DB.prepare('SELECT 1 AS x FROM boards WHERE day=?').bind(day).first();
 return r?json({exists:true}):json({exists:false},404)}
export async function onRequestPut({request,env}){
 if(!isAdmin(request,env))return json({err:'auth'},401);
 const b=await readJson(request);if(!b||!okDay(b.day)||!okCode(b.code))return json({err:'bad'},400);
 const today=jstDay(Date.now());if(b.day<addDay(today,-1)||b.day>addDay(today,2))return json({err:'range'},400); /* 日付の打ち間違い防止 */
 const db=env.DB,had=await db.prepare('SELECT 1 AS x FROM boards WHERE day=?').bind(b.day).first(),old=addDay(today,-KEEP_DAYS),oldPlay=addDay(today,-1);
 const q=[db.prepare('INSERT INTO boards(day,code) VALUES(?,?) ON CONFLICT(day) DO UPDATE SET code=excluded.code').bind(b.day,b.code)];
 if(had)q.push(db.prepare('DELETE FROM plays WHERE day=?').bind(b.day),db.prepare('DELETE FROM ranks WHERE day=?').bind(b.day));
 q.push(db.prepare('DELETE FROM boards WHERE day<?').bind(old),db.prepare('DELETE FROM ranks WHERE day<?').bind(old),db.prepare('DELETE FROM plays WHERE day<?').bind(oldPlay));
 await db.batch(q);await dropRankCache(request,today,['t','d']); /* 盤面や記録が変わったので、ランキングのキャッシュも捨てる */
 return json({ok:true,replaced:!!had})}
