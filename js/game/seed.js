/* [game/seed] シード(フリープレイ限定): 盤面を文字列にして、貼り付けると完全に同じ盤面で始められる。DOM非依存(copyText だけ document を使う)。
   シード = 'v1.' + base64url( JSON {c:cfg(dropped 以外すべて), r:gen の返り値(res)} ) 。typed array は {"$":"..."} に包んで丸ごと入る。
   cfg と res の中身は項目名を決め打ちせず丸ごと入れるので、cfg/res に項目が増えても変更不要。
   ★ 形式を二度と変えないための約束: 盤面を決める情報(隠れ状態を含む)は、必ず gen の返り値 res に入れる。
     res に入れられるのは 数値・文字列・真偽・null・配列・プレーンオブジェクト・typed array だけ(Set/Map/関数は不可)。
     この約束を守る限り、ルールや CORE を拡張しても seed.js は変更不要。
   バージョンアップで盤面が変わっても追従しない(縛りidが無くなっていれば読み込みを断るだけ)。 */
const SEED_PRE='v1.',SEED_TA=['Uint8Array','Int8Array','Uint16Array','Int16Array','Uint32Array','Int32Array','Float32Array','Float64Array'];
const b64e=u=>{let s='';for(let i=0;i<u.length;i+=0x8000)s+=String.fromCharCode.apply(null,u.subarray(i,i+0x8000));return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')};
const b64d=t=>{const s=atob(t.replace(/-/g,'+').replace(/_/g,'/')),u=new Uint8Array(s.length);for(let i=0;i<s.length;i++)u[i]=s.charCodeAt(i);return u};
/* typed array → {"$":"b49:<ビット詰め>"}(0/1だけのUint8Array) か {"$":"Int8Array:<生バイト>"} */
function seedPack(k,x){
 if(x instanceof Set||x instanceof Map||typeof x=='function'||(typeof x=='number'&&!isFinite(x)))throw Error('seed未対応の型('+k+')'); /* 約束違反はここで落とす(begin が握りつぶしてボタンを出さず、smoke-ui が検出する) */
 if(ArrayBuffer.isView(x)&&!(x instanceof DataView)){
  if(x instanceof Uint8Array&&x.every(e=>e<2)){const b=new Uint8Array(Math.ceil(x.length/8));x.forEach((e,i)=>{if(e)b[i>>3]|=1<<(i&7)});return{$:'b'+x.length+':'+b64e(b)}}
  return{$:x.constructor.name+':'+b64e(new Uint8Array(x.buffer.slice(x.byteOffset,x.byteOffset+x.byteLength)))}}
 return x}
function seedUnpack(k,x){
 if(x&&typeof x=='object'&&!Array.isArray(x)&&typeof x.$=='string'&&Object.keys(x).length==1){
  const p=x.$.indexOf(':'),h=x.$.slice(0,p),u=b64d(x.$.slice(p+1));
  if(/^b\d+$/.test(h)){const n=+h.slice(1),a=new Uint8Array(n);for(let i=0;i<n;i++)a[i]=u[i>>3]>>(i&7)&1;return a}
  if(SEED_TA.includes(h))return new globalThis[h](u.buffer);
  throw Error('seed型')}
 return x}
function encodeSeed(cfg,res){const c={...cfg};delete c.dropped;return SEED_PRE+b64e(new TextEncoder().encode(JSON.stringify({c,r:res},seedPack)))}
/* 読めなければ null。読めたら {cfg,res}。最低限の整合だけ見る(解けるかは見ない) */
function decodeSeed(t){try{
 t=String(t||'').trim();if(!t.startsWith(SEED_PRE))return null;
 const o=JSON.parse(new TextDecoder().decode(b64d(t.slice(SEED_PRE.length))),seedUnpack),c=o.c,r=o.r;
 if(!c||!r||!Number.isInteger(c.R)||!Number.isInteger(c.C)||c.R<3||c.C<3||c.R>24||c.C>24)return null;
 const N=c.R*c.C;
 if(!Array.isArray(c.ids)||!c.ids.every(id=>typeof id=='string'&&RULES[id]))return null;
 if(!(r.mines instanceof Uint8Array)||r.mines.length!=N||!Number.isInteger(r.start)||r.start<0||r.start>=N||r.mines[r.start])return null;
 let s=0;for(const e of r.mines)s+=e;if(s!=c.M||s<1)return null;
 return{cfg:c,res:r}}catch(e){return null}}
/* クリップボードへ(file:// などで clipboard API が使えない時は従来方式)。コピーした旨の表示はしない */
function copyText(t){const fb=()=>{const a=document.createElement('textarea');a.value=t;a.style.cssText='position:fixed;left:-99px;top:0;height:1em;opacity:0';document.body.appendChild(a);a.focus();a.select();a.setSelectionRange(0,t.length);try{document.execCommand('copy')}catch(e){}a.remove()};
 try{if(navigator.clipboard&&window.isSecureContext)return navigator.clipboard.writeText(t).catch(fb)}catch(e){}fb()}
