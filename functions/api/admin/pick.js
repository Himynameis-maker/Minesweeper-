/* /api/admin/pick  厳選盤面の登録(GitHub Actions の picks-board から)。管理者だけ(Authorization: Bearer <DAILY_TOKEN>)。
   GET → {day,count,limit,max,total,full}。今日(JST)すでに何個作られたか。full=今日の枠が埋まっている(workflow はこのとき生成を省く)
   PUT {code} → 厳選盤面を登録。縛りの数・ルールセット番号・作成日(今日の JST)はサーバーがコードと時計から決める(送られてきた値は信じない)。
     ・今日すでに PICK_PER_DAY 個あれば 409 {err:'limit'} / 同じコードがすでにあれば 200 {dup:true}
     ・今ある盤面より古いルールセット番号のコードは 409 {err:'old'}(古い版の workflow が入れるのを防ぐ)
     ・メンテナンス中(解除されるまで)は 423 {err:'maint'}(デイリーの盤面と同じ理由)
     ・入れたついでに、ルールセット番号がこのコードより古いものと、新しい順で PICK_MAX 個を超えたものを消す
   schema.sql を実行していなくても、無ければここで picks テーブルを作る。 */
import{json,isAdmin,jstDay,okCode,readJson,getMaint,boardLocked,PICK_PER_DAY,PICK_MAX}from'../../_lib.js';
const mk=db=>db.batch([db.prepare('CREATE TABLE IF NOT EXISTS picks(code TEXT PRIMARY KEY, day TEXT NOT NULL, at INTEGER NOT NULL, ver INTEGER NOT NULL, n INTEGER NOT NULL)'),db.prepare('CREATE INDEX IF NOT EXISTS picks_day ON picks(day, at)')]);
/* コード MS1.<ver>.<R>x<C>.<start>.<ids>.<mines>.<sh>.<sum> から、ルールセット番号と縛りの数を読む。形が違えば null */
const parse=c=>{if(!okCode(c))return null;const f=c.split('.');if(f.length!=8||f[0]!='MS1'||!/^\d{1,6}$/.test(f[1]))return null;return{ver:+f[1],n:f[4]?f[4].split(',').length:0}};
export async function onRequestGet({request,env}){
 if(!isAdmin(request,env))return json({err:'auth'},401);
 await mk(env.DB);const day=jstDay(Date.now()),c=await env.DB.prepare('SELECT COUNT(*) AS n FROM picks WHERE day=?').bind(day).first(),t=await env.DB.prepare('SELECT COUNT(*) AS n FROM picks').first();
 return json({day,count:c.n,limit:PICK_PER_DAY,max:PICK_MAX,total:t.n,full:c.n>=PICK_PER_DAY})}
export async function onRequestPut({request,env}){
 if(!isAdmin(request,env))return json({err:'auth'},401);
 const b=await readJson(request),p=b&&parse(b.code);if(!p)return json({err:'bad'},400);
 const db=env.DB,now=Date.now(),day=jstDay(now);
 if(boardLocked(await getMaint(db),day))return json({err:'maint'},423);
 await mk(db);
 if(await db.prepare('SELECT 1 AS x FROM picks WHERE code=?').bind(b.code).first())return json({ok:true,dup:true});
 const mx=await db.prepare('SELECT MAX(ver) AS v FROM picks').first();if(mx&&mx.v!=null&&p.ver<mx.v)return json({err:'old'},409);
 /* 1文で「今日の本数が上限未満のときだけ」入れる(同時に2つ届いても上限を超えない) */
 const r=await db.prepare('INSERT INTO picks(code,day,at,ver,n) SELECT ?,?,?,?,? WHERE (SELECT COUNT(*) FROM picks WHERE day=?)<?').bind(b.code,day,now,p.ver,p.n,day,PICK_PER_DAY).run();
 if(!r.meta||!r.meta.changes)return json({err:'limit'},409);
 await db.batch([db.prepare('DELETE FROM picks WHERE ver<?').bind(p.ver),db.prepare('DELETE FROM picks WHERE code NOT IN(SELECT code FROM picks ORDER BY day DESC, at DESC, rowid DESC LIMIT ?)').bind(PICK_MAX)]);
 return json({ok:true,day,n:p.n})}
