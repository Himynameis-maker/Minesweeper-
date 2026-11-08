/* GET /api/daily/code?token=... → {code}。今日の盤面コード(「盤面入手」ボタン)。今日もう終わった(done)端末にだけ渡す。
   途中でやめた人(playing)には渡さない(盤面を持ち帰って何度も練習できてしまうため)。昨日以前の分はランキング画面(/api/daily/ranking)から見られる。 */
import{json,jstDay,okToken}from'../../_lib.js';
export async function onRequestGet({request,env}){
 const t=new URL(request.url).searchParams.get('token');if(!okToken(t))return json({err:'bad'},400);
 const day=jstDay(Date.now()),db=env.DB,p=await db.prepare('SELECT done FROM plays WHERE day=? AND token=?').bind(day,t).first();
 if(!p||!p.done)return json({err:'notyet'},403);
 const bd=await db.prepare('SELECT code FROM boards WHERE day=?').bind(day).first();
 return bd?json({day,code:bd.code}):json({err:'prep'},503)}
