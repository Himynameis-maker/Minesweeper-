#!/usr/bin/env node
/* 英語化の漏れ検査(ブラウザ無し)。node tools/i18n-check.js
   ・js/game/*.js と js/ui/*.js の tx('日本語') の「日本語」が、js/i18n-en.js(と js/i18n-en-rules.js)に訳されているか
   ・index.html に最初から書いてある日本語(テキスト/title/placeholder/data-h)が訳されているか
   ・訳に差し込み {名前} の過不足がないか / 呼び出しの {名前:値} が足りているか / 関数の訳が動くか
   ・縛り(rules/*.js)の name/desc/why が I18N_RULES に訳されているか(rules/ があるとき)
   問題があれば一覧を出して終了コード1。 */
const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'..'),JP=/[\u3040-\u30ff\u3400-\u9fff]/;
const rd=p=>fs.readFileSync(path.join(root,p),'utf8');
const sb={console,location:{protocol:'https:',pathname:'/en',search:''},setTimeout:()=>0};
vm.createContext(sb);
for(const f of['js/i18n.js','js/i18n-en.js','js/i18n-en-rules.js'])if(fs.existsSync(path.join(root,f)))vm.runInContext(rd(f)+'\n;this.__ok=1',sb,{filename:f});
const EN=vm.runInContext('I18N_EN',sb),RU=vm.runInContext('I18N_RULES',sb);
const err=[],warn=[],used=new Set();
const ph=s=>[...new Set((String(s).match(/\{(\w+)\}/g)||[]).map(x=>x.slice(1,-1)))].sort();
/* ---- JS のソースから tx( の引数を取り出す ---- */
function scanStr(s,i){const q=s[i];let j=i+1,v='';while(j<s.length&&s[j]!=q){if(s[j]=='\\'){v+=s[j+1];j+=2}else v+=s[j++]}return[v,j+1]}
function args(s,i){/* s[i]=='(' の次から、トップレベルのカンマで分けた引数の原文を返す */
 const out=[];let d=0,st=i+1,j=i+1;
 while(j<s.length){const c=s[j];
  if(c=="'"||c=='"'||c=='`'){j=scanStr(s,j)[1];continue}
  if(c=='/'&&s[j+1]=='/'){while(j<s.length&&s[j]!='\n')j++;continue}
  if(c=='/'&&s[j+1]=='*'){j=s.indexOf('*/',j)+2;continue}
  if('([{'.includes(c))d++;
  else if(')]}'.includes(c)){if(d==0){out.push(s.slice(st,j));return out}d--}
  else if(c==','&&d==0){out.push(s.slice(st,j));st=j+1}
  j++}
 return out}
function lits(a){const o=[];for(let j=0;j<a.length;){const c=a[j];if(c=="'"||c=='"'){const[v,e]=scanStr(a,j);o.push(v);j=e}else j++}return o}
function objKeys(a){a=a.trim();if(a[0]!='{')return null;const body=a.slice(1,a.lastIndexOf('}')),parts=[];let d=0,st=0;
 for(let j=0;j<body.length;j++){const c=body[j];
  if(c=="'"||c=='"'||c=='`'){j=scanStr(body,j)[1]-1;continue}
  if('([{'.includes(c))d++;else if(')]}'.includes(c))d--;else if(c==','&&d==0){parts.push(body.slice(st,j));st=j+1}}
 parts.push(body.slice(st));return parts.map(x=>x.trim()).filter(Boolean).map(x=>{const m=x.match(/^(\w+)\s*(:|$)/);return m?m[1]:'?'})}
const files=[];for(const d of['js/game','js/ui'])for(const f of fs.readdirSync(path.join(root,d)))if(f.endsWith('.js'))files.push(d+'/'+f);
for(const f of files){const s=rd(f);let i=-1;
 while((i=s.indexOf('tx(',i+1))>=0){if(/[\w$.]/.test(s[i-1]||''))continue;
  const a=args(s,i+2),ks=lits(a[0]||'').filter(k=>JP.test(k)||/\{\w+\}/.test(k));
  if(!ks.length){if(!/^\s*[kK]\s*$/.test(a[0]||''))warn.push(f+': tx() の中に日本語の文が見つかりません → '+(a[0]||'').trim().slice(0,40));continue}
  const pk=a[1]?objKeys(a[1]):[];
  for(const k of ks){used.add(k);
   if(EN[k]===undefined){err.push('[未翻訳] '+f+': '+k);continue}
   const need=ph(k);if(need.length&&pk){const miss=need.filter(n=>!pk.includes(n));if(miss.length)err.push('[差し込み不足] '+f+': '+k+' ← '+miss.join(','))}
   if(need.length&&!a[1])err.push('[差し込み不足] '+f+': '+k)}}}
/* ---- js/i18n.js の i18nHead(タイトル・説明文)に書いてある日本語 ---- */
{const s=rd('js/i18n.js');for(let j=0;j<s.length;){const c=s[j];
 if(c=="'"||c=='"'){const[v,e]=scanStr(s,j);if(JP.test(v)&&!v.startsWith('[i18n]')){used.add(v);if(EN[v]===undefined)err.push('[未翻訳] js/i18n.js: '+v)}j=e}
 else if(c=='/'&&s[j+1]=='*'){j=s.indexOf('*/',j)+2}
 else if(c=='/'&&s[j+1]=='/'){while(j<s.length&&s[j]!='\n')j++}
 else j++}}
/* ---- index.html ---- */
{const h=rd('index.html').replace(/<!--[\s\S]*?-->/g,'').replace(/<script[\s\S]*?<\/script>/g,'').replace(/<style[\s\S]*?<\/style>/g,'');
 const VOID=new Set(['meta','link','input','br','img','hr']),re=/<(\/?)([a-zA-Z][\w-]*)([^>]*)>|([^<]+)/g;let m;const stack=[];
 const want=k=>{used.add(k);if(EN[k]===undefined)err.push('[未翻訳] index.html: '+k)};
 while((m=re.exec(h))){
  if(m[4]!==undefined){const t=m[4].trim();if(t&&JP.test(t)&&!stack.some(e=>e.nt||e.hh))want(t);continue}
  const close=m[1],tag=m[2].toLowerCase(),at=m[3];
  if(close){while(stack.length){const e=stack.pop();if(e.tag==tag)break}continue}
  if(!stack.some(e=>e.nt)){for(const a of['title','placeholder']){const r=new RegExp('\\s'+a+'="([^"]*)"').exec(at);if(r&&JP.test(r[1]))want(r[1])}}
  if(VOID.has(tag)||/\/\s*$/.test(at))continue;
  const e={tag,nt:/\sdata-nt(\s|=|$)/.test(' '+at),hh:/\sdata-h(\s|=|$)/.test(' '+at)};
  if(e.hh&&!stack.some(x=>x.nt)){/* 要素の中身ぜんぶが日本語の文(data-h) */
   let d=1,j=re.lastIndex;const tr=new RegExp('<(/?)'+tag+'(\\s[^>]*)?>','gi');tr.lastIndex=j;let x;
   while((x=tr.exec(h))){d+=x[1]?-1:1;if(d==0)break}
   want(h.slice(j,x.index).trim())}
  stack.push(e)}}
/* ---- 訳の中身 ---- */
for(const[k,v]of Object.entries(EN)){
 if(!used.has(k))warn.push('[使われていない訳] '+k);
 if(typeof v=='function'){const p=new Proxy({},{get:(t,n)=>n==Symbol.toPrimitive?undefined:2});
  try{const r=v(p);if(typeof r!='string')err.push('[関数の訳が文字列を返さない] '+k)}catch(e){err.push('[関数の訳がエラー] '+k+' : '+e.message)}
  for(const c of[0,1,2]){try{v({c,n:1,k:1,r:'1',m:1,h:1,sz:'6×6',b:'30',w:1,x:1})}catch(e){err.push('[関数の訳がエラー] '+k+' : '+e.message)}}}
 else{if(ph(k).join()!==ph(v).join())err.push('[差し込みが日本語と違う] '+k+' → '+v);
  if(JP.test(v))err.push('[訳に日本語が残っている] '+k)}}
/* ---- 縛り ---- */
if(fs.existsSync(path.join(root,'rules'))){
 const ids=fs.readdirSync(path.join(root,'rules')).filter(f=>f.endsWith('.js')&&!f.startsWith('_')).map(f=>f.slice(0,-3));
 for(const id of ids){const r=RU[id];if(!r){err.push('[縛りの訳なし] '+id);continue}
  const src=rd('rules/'+id+'.js');
  if(!r.name||!r.desc)err.push('[縛りの訳が不足] '+id);
  if(/\bwhy\s*:/.test(src)&&!r.why)err.push('[縛りの why の訳なし] '+id);
  for(const x of['name','desc','why'])if(r[x]&&JP.test(r[x]))err.push('[縛りの訳に日本語が残っている] '+id+'.'+x)}
 for(const id of Object.keys(RU))if(!ids.includes(id))warn.push('[縛りの訳だけある(rules/ に無い)] '+id)}
else warn.push('(rules/ が見つからないので、縛りの訳の検査は飛ばしました)');
for(const w of warn)console.log('注意 '+w);
for(const e of err)console.log('NG '+e);
console.log(err.length?`\n問題 ${err.length} 件`:'\nOK: 訳の漏れはありません');
process.exit(err.length?1:0);
