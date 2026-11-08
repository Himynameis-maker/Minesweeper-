/* GET /api/daily/ranking → {today, days:[{day, code, ranks:[{name,ms}]}]}。1〜KEEP_DAYS日前(新しい順)の盤面コードとランキング。今日の分は出さない。
   結果は日付が変わるまで変わらないので、エッジのキャッシュ(600秒。キーに今日の日付を含むので日付が変われば自然に切り替わる)に載せて D1 をほとんど読まない。 */
import{json,jstDay,addDay,KEEP_DAYS}from'../../_lib.js';
export async function onRequestGet({request,env,waitUntil}){
 const today=jstDay(Date.now()),key=new Request(new URL('/api/daily/ranking?d='+today,request.url)),cache=typeof caches!='undefined'?caches.default:null;
 const hit=cache&&await cache.match(key);if(hit)return hit;
 const from=addDay(today,-KEEP_DAYS),to=addDay(today,-1),db=env.DB;
 const bs=(await db.prepare('SELECT day,code FROM boards WHERE day>=? AND day<=?').bind(from,to).all()).results||[];
 const rs=(await db.prepare('SELECT day,name,ms FROM ranks WHERE day>=? AND day<=? ORDER BY day DESC,ms,at,rowid').bind(from,to).all()).results||[];
 const days=[];for(let n=1;n<=KEEP_DAYS;n++){const d=addDay(today,-n),b=bs.find(x=>x.day==d);days.push({day:d,code:b?b.code:null,ranks:rs.filter(x=>x.day==d).map(x=>({name:x.name,ms:x.ms}))})}
 const res=json({today,days},200,{'cache-control':'public, max-age=600'});
 if(cache&&waitUntil)waitUntil(cache.put(key,res.clone()));return res}
