/* デイリーAPI(Cloudflare Pages Functions)の共通部分。日付はすべてサーバーの JST で決める(端末の時計は使わない)。 */
export const CD_MS=3000;     // 画面の 3,2,1 カウントの長さ。サーバーは「開始〜クリア」からこれを引いてタイムにする。画面側のカウントを変えたらここも変える
export const RETRY_MS=20000; // 開始の応答が届かなかった人のために、この時間内なら同じ端末は盤面をもう一度受け取れる
export const KEEP_DAYS=6;    // 過去何日分の盤面・ランキングを残すか
export const TOP=20;         // ランキングに載る人数
export const NAME_MAX=12;    // ニックネームの最大文字数
export const PAST_CACHE_S=600;  // ランキングの過去分をエッジに載せる秒数(日付が変わるまで変わらないので長め)
export const TODAY_CACHE_S=60;  // ランキングの今日の分をエッジに載せる秒数(他の人のクリアが載るまで最大この秒数遅れる。自分の分は finish がキャッシュを捨てるので遅れない)
export const json=(o,status=200,h={})=>new Response(JSON.stringify(o),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...h}});
export const jstDay=ms=>new Date(ms+9*36e5).toISOString().slice(0,10);
export const addDay=(day,n)=>{const d=new Date(day+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};
export const okDay=d=>{if(typeof d!='string'||!/^\d{4}-\d{2}-\d{2}$/.test(d))return false;const t=new Date(d+'T00:00:00Z');return!isNaN(t)&&t.toISOString().slice(0,10)==d};
export const okToken=t=>typeof t=='string'&&/^[A-Za-z0-9_-]{16,64}$/.test(t);
export const okCode=c=>typeof c=='string'&&c.length<=2000&&/^MS1\.\d+\.\d+x\d+\.[A-Za-z0-9._,+-]+$/.test(c);
/* ニックネーム: 制御文字・ゼロ幅・< > を除き、前後の空白を落として NAME_MAX 文字まで。空なら null */
export const cleanName=n=>{if(typeof n!='string')return null;
 const s=Array.from(n.normalize('NFC').replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2060-\u206f\ufeff<>]/g,'').trim()).slice(0,NAME_MAX).join('').trim();return s||null};
export const readJson=async r=>{try{const b=await r.json();return b&&typeof b=='object'?b:null}catch(e){return null}};
/* 管理用(GitHub Actions → 盤面の登録)。Authorization: Bearer <DAILY_TOKEN>。定数時間で比べる */
export const isAdmin=(r,env)=>{const t=env.DAILY_TOKEN,h=r.headers.get('authorization')||'';if(!t||!h.startsWith('Bearer '))return false;
 const a=h.slice(7);if(a.length!=t.length)return false;let d=0;for(let i=0;i<a.length;i++)d|=a.charCodeAt(i)^t.charCodeAt(i);return d==0};
/* ランキングのエッジキャッシュ。k='d'=過去分 / k='t'=今日の分。キーに今日の日付を含むので、日付が変われば自然に切り替わる */
export const rankKey=(request,k,today)=>new Request(new URL('/api/daily/ranking?'+k+'='+today,request.url));
/* 記録が変わったときにキャッシュを捨てる(ks=['t'] など)。キャッシュが無い環境・失敗は黙って無視(最大 TODAY_CACHE_S 秒で自然に切れる) */
export const dropRankCache=async(request,today,ks)=>{try{if(typeof caches=='undefined'||!caches.default)return;await Promise.all(ks.map(k=>caches.default.delete(rankKey(request,k,today))))}catch(e){}};
