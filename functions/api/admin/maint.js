/* /api/admin/maint  メンテナンス(アプデのためデイリーを止める)の予約・解除。管理者だけ(Authorization: Bearer <DAILY_TOKEN>)。操作は GitHub Actions の daily-maint から。
   GET    → {today, day, phase, playBlocked, boardLocked}。phase: none / reserved(予約中) / active(day の当日=遊べない+盤面ロック) / overdue(day を過ぎたが未解除=盤面ロックのまま)
   PUT    {day} → day(JST)の 0:00 から止める予約。day は今日〜MAINT_AHEAD 日先。今日を指定すると今すぐ。すでに active/overdue なら 409(先に解除する)。予約中なら日付を置き換える
   DELETE → 解除(予約の取り消しも同じ)。その場で遊べるようになり、盤面も受け付ける。
   止まるのは「デイリーを新しく始めること」と「新しい盤面の生成・登録」だけ。ランキング・盤面入手・終了の送信(finish)は止めない。 */
import{json,isAdmin,jstDay,addDay,okDay,readJson,getMaint,maintPhase,playBlocked,boardLocked,MAINT_AHEAD}from'../../_lib.js';
const view=(mday,today)=>({today,day:mday,phase:maintPhase(mday,today),playBlocked:playBlocked(mday,today),boardLocked:boardLocked(mday,today)});
export async function onRequestGet({request,env}){
 if(!isAdmin(request,env))return json({err:'auth'},401);
 const today=jstDay(Date.now());return json(view(await getMaint(env.DB),today))}
export async function onRequestPut({request,env}){
 if(!isAdmin(request,env))return json({err:'auth'},401);
 const b=await readJson(request);if(!b||!okDay(b.day))return json({err:'bad'},400);
 const today=jstDay(Date.now());if(b.day<today||b.day>addDay(today,MAINT_AHEAD))return json({err:'range'},400);
 const db=env.DB;await db.prepare('CREATE TABLE IF NOT EXISTS maint(id INTEGER PRIMARY KEY CHECK(id=1), day TEXT NOT NULL)').run(); /* schema.sql を実行していなくても動くように、無ければここで作る */
 const cur=await getMaint(db),ph=maintPhase(cur,today);
 if(ph=='active'||ph=='overdue')return json({err:'active',...view(cur,today)},409); /* 実行中のメンテを上書きしない(先に解除) */
 await db.prepare('INSERT INTO maint(id,day) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET day=excluded.day').bind(b.day).run();
 return json({ok:true,replaced:ph=='reserved',...view(b.day,today)})}
export async function onRequestDelete({request,env}){
 if(!isAdmin(request,env))return json({err:'auth'},401);
 const today=jstDay(Date.now()),had=await getMaint(env.DB);
 if(had)await env.DB.prepare('DELETE FROM maint WHERE id=1').run();
 return json({ok:true,lifted:!!had,...view(null,today)})}
