/* GET /api/daily/ranking → {today, days:[{day, code, ranks:[{name,ms}], today?}]}。先頭が「今日」(today:true・code は常に null=今日の盤面コードは出さない。ランキングは今の分が見える)、
   そのあとが 1〜KEEP_DAYS日前(新しい順)の盤面コードとランキング。
   過去分は日付が変わるまで変わらないので、エッジのキャッシュ(600秒。キーに今日の日付を含むので日付が変われば自然に切り替わる)に載せて D1 をほとんど読まない。
   今日の分は毎回 D1 から読む(最大 TOP 件だけなので軽い)。 */
import{json,jstDay,addDay,KEEP_DAYS}from'../../_lib.js';
export async function onRequestGet({request,env,waitUntil}){
 const today=jstDay(Date.now()),key=new Request(new URL('/api/daily/ranking?d='+today,request.url)),cache=typeof caches!='undefined'?caches.default:null,db=env.DB;
 let past=null;const hit=cache&&await cache.match(key);
 if(hit){try{const j=await hit.json();if(j&&Array.isArray(j.days))past=j.days.filter(x=>x.day<today)}catch(e){}}
 if(!past){
  const from=addDay(today,-KEEP_DAYS),to=addDay(today,-1);
  const bs=(await db.prepare('SELECT day,code FROM boards WHERE day>=? AND day<=?').bind(from,to).all()).results||[];
  const rs=(await db.prepare('SELECT day,name,ms FROM ranks WHERE day>=? AND day<=? ORDER BY day DESC,ms,at,rowid').bind(from,to).all()).results||[];
  past=[];for(let n=1;n<=KEEP_DAYS;n++){const d=addDay(today,-n),b=bs.find(x=>x.day==d);past.push({day:d,code:b?b.code:null,ranks:rs.filter(x=>x.day==d).map(x=>({name:x.name,ms:x.ms}))})}
  const res=json({days:past},200,{'cache-control':'public, max-age=600'});
  if(cache&&waitUntil)waitUntil(cache.put(key,res.clone()))}
 const tr=(await db.prepare('SELECT name,ms FROM ranks WHERE day=? ORDER BY ms,at,rowid').bind(today).all()).results||[];
 return json({today,days:[{day:today,today:true,code:null,ranks:tr.map(x=>({name:x.name,ms:x.ms}))},...past]})}
