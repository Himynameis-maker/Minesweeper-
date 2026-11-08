/* GET /api/daily/ranking → {today, days:[{day, code, ranks:[{name,ms}], today?}]}。先頭が「今日」(today:true・code は常に null=今日の盤面コードは出さない。ランキングは今の分が見える)、
   そのあとが 1〜KEEP_DAYS日前(新しい順)の盤面コードとランキング。
   過去分は日付が変わるまで変わらないので、エッジのキャッシュ(PAST_CACHE_S=600秒。キーに今日の日付を含むので日付が変われば自然に切り替わる)に載せて D1 をほとんど読まない。
   今日の分は別のキーで TODAY_CACHE_S=60秒だけキャッシュする(連打されても D1 は1分に1回ほど)。他の人のクリアが載るまで最大60秒遅れるが、
   記録が入ったとき(finish)に今日のキャッシュを捨てるので、クリアした本人は自分の記録がすぐ見える。 */
import{json,jstDay,addDay,KEEP_DAYS,PAST_CACHE_S,TODAY_CACHE_S,rankKey}from'../../_lib.js';
export async function onRequestGet({request,env,waitUntil}){
 const today=jstDay(Date.now()),cache=typeof caches!='undefined'?caches.default:null,db=env.DB,pk=rankKey(request,'d',today),tk=rankKey(request,'t',today);
 const read=async k=>{try{const h=cache&&await cache.match(k);return h?await h.json():null}catch(e){return null}};
 const keep=(k,res)=>{if(cache&&waitUntil)waitUntil(cache.put(k,res.clone()))};
 const[pj,tj]=await Promise.all([read(pk),read(tk)]);
 let past=pj&&Array.isArray(pj.days)?pj.days.filter(x=>x.day<today):null,tr=tj&&tj.day==today&&Array.isArray(tj.ranks)?tj.ranks:null;
 if(!past){
  const from=addDay(today,-KEEP_DAYS),to=addDay(today,-1);
  const bs=(await db.prepare('SELECT day,code FROM boards WHERE day>=? AND day<=?').bind(from,to).all()).results||[];
  const rs=(await db.prepare('SELECT day,name,ms FROM ranks WHERE day>=? AND day<=? ORDER BY day DESC,ms,at,rowid').bind(from,to).all()).results||[];
  past=[];for(let n=1;n<=KEEP_DAYS;n++){const d=addDay(today,-n),b=bs.find(x=>x.day==d);past.push({day:d,code:b?b.code:null,ranks:rs.filter(x=>x.day==d).map(x=>({name:x.name,ms:x.ms}))})}
  keep(pk,json({days:past},200,{'cache-control':'public, max-age='+PAST_CACHE_S}))}
 if(!tr){
  tr=((await db.prepare('SELECT name,ms FROM ranks WHERE day=? ORDER BY ms,at,rowid').bind(today).all()).results||[]).map(x=>({name:x.name,ms:x.ms}));
  keep(tk,json({day:today,ranks:tr},200,{'cache-control':'public, max-age='+TODAY_CACHE_S}))}
 return json({today,days:[{day:today,today:true,code:null,ranks:tr},...past]})}
