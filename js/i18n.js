/* [i18n] 言語(日本語 / 英語)の切り替え。DOM非依存の部分(tx)と、画面の一括置き換え(i18nDom)だけ。
   ・言語は URL で決まる: /en → 英語、/ja と / → 日本語(/ は今のまま日本語)。ローカル(file://)や確認用は ?lang=en / ?lang=ja。
   ・画面に出す文言は、日本語の文をそのまま tx('日本語') に通す。日本語のときは何も変わらない(そのまま返る)。
     英語のときは I18N_EN(js/i18n-en.js)で「日本語の文 → 英語の文」に置き換える。
     数字などは tx('第{n}盤面',{n:3}) のように {名前} で差し込む(日本語の文にも {名前} をそのまま書く)。
     英語の値が関数(p=>…)のときは、複数形なども自由に書ける(p は差し込む値)。
   ・index.html に最初から書いてある文は、起動時に i18nDom が一括で置き換える。文の途中にタグが入るもの(<b>など)は、その要素に data-h をつける(要素の中身ぜんぶが「日本語の文」になる)。
     置き換えたくない所(検査レポートなど)は data-nt をつける。
   ・訳が無い日本語は、英語のときだけコンソールに「[i18n] 未翻訳」と出して日本語のまま表示する(壊れはしない)。tools/i18n-check.js で漏れを検査できる。
   ・縛りの名前/説明/why は rname(r) / rdesc(r) / rwhy(r) を通す(I18N_RULES[id]={name,desc,why}。js/i18n-en-rules.js)。
   ・core/(推論・生成)は触らない。盤面コード・BOARD_VER・デイリーの記録は言語に関係なく共通。 */
const LANG=(()=>{try{
 if(location.protocol!='file:'){const m=String(location.pathname||'').match(/^\/(en|ja)(\/|$)/);if(m)return m[1]}
 const q=String(location.search||'').match(/[?&]lang=(en|ja)(&|$)/);return q?q[1]:'ja'}catch(e){return'ja'}})();
const I18N_EN={},I18N_RULES={},I18N_MISS=new Set(),I18N_JP=/[\u3040-\u30ff\u3400-\u9fff]/;
function i18nMiss(k){if(I18N_MISS.has(k))return;I18N_MISS.add(k);try{console.warn('[i18n] 未翻訳: '+k)}catch(e){}}
function tx(k,p){let s=k;
 if(LANG=='en'){const e=I18N_EN[k];if(e!==undefined)s=e;else if(I18N_JP.test(k))i18nMiss(k)}
 if(typeof s=='function')return s(p||{});
 return p?s.replace(/\{(\w+)\}/g,(m,n)=>n in p?p[n]:m):s}
const rname=r=>LANG=='en'&&I18N_RULES[r.id]&&I18N_RULES[r.id].name||r.name,
 rdesc=r=>LANG=='en'&&I18N_RULES[r.id]&&I18N_RULES[r.id].desc||r.desc,
 rwhy=r=>LANG=='en'&&I18N_RULES[r.id]&&I18N_RULES[r.id].why||r.why;
/* ---- 起動時(DOMの読み込み直後・各 load 処理より前)に1回だけ ---- */
function i18nHead(){document.documentElement.lang=LANG;if(LANG!='en')return;
 document.title=tx('Minesweeper Plus 運ゲーなしの特殊ルールマインスイーパ');
 for(const[q,k]of[['meta[name="description"]','運ゲーなし。推論だけで解ける、特殊ルールのマインスイーパー。オンラインタイムアタックとチャレンジモードつき'],['meta[property="og:description"]','運ゲーなし。推論だけで解ける、特殊ルールのマインスイーパー']]){
  const m=document.querySelector(q);if(m)m.setAttribute('content',tx(k))}}
/* 言語切り替えのリンク(#lja / #len)。今の言語は太字。file:// のときは ?lang=… で切り替える */
function i18nLinks(){const f=location.protocol=='file:';
 for(const l of['ja','en']){const a=document.getElementById('l'+l);if(!a)continue;
  a.href=f?'?lang='+l:'/'+l;if(l==LANG){a.style.fontWeight='bold';a.style.opacity='1';a.setAttribute('aria-current','true')}}}
/* index.html に最初から書いてある文(テキスト・title・placeholder)を英語に置き換える */
function i18nDom(){if(LANG!='en')return;const root=document.body;
 const skip=n=>{for(;n&&n!==root;n=n.parentNode)if(n.nodeType==1&&(n.hasAttribute('data-nt')||/^(SCRIPT|STYLE|TEXTAREA)$/.test(n.tagName)))return true;return false};
 const tr=k=>{const v=I18N_EN[k];if(v===undefined){if(I18N_JP.test(k))i18nMiss(k);return null}return typeof v=='function'?v({}):v};
 root.querySelectorAll('[data-h]').forEach(e=>{if(skip(e))return;const v=tr(e.innerHTML.trim());if(v!==null)e.innerHTML=v});
 const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),L=[];while(w.nextNode())L.push(w.currentNode);
 for(const n of L){const s=n.nodeValue,k=s.trim();if(!k||!I18N_JP.test(k)||skip(n.parentNode))continue;const v=tr(k);if(v!==null)n.nodeValue=s.replace(k,()=>v)}
 root.querySelectorAll('[title],[placeholder]').forEach(e=>{if(skip(e))return;
  for(const a of['title','placeholder']){const k=e.getAttribute(a);if(k&&I18N_JP.test(k)){const v=tr(k);if(v!==null)e.setAttribute(a,v)}}})}
function i18nInit(){try{i18nHead();i18nLinks();i18nDom()}catch(e){try{console.error('[i18n]',e)}catch(x){}}}
try{if(typeof document!='undefined'&&document.addEventListener){if(document.readyState=='loading')document.addEventListener('DOMContentLoaded',i18nInit);else setTimeout(i18nInit,0)}}catch(e){}
