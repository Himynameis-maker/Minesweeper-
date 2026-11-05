/* [ui/modal] 縛りモーダル(pick=検索つき選択 / view=今の盤面の縛り)、併用不可の無効化、長押しで出る7x7の例盤面。
   縛りに付くタグ(tags)は、新しいフックを足したらここに1行足す。例盤面(mini/exHtml)の見せ方もここ。 */
const tags=r=>(r.nb?'<span class="tag">数字変更</span>':'')+(r.cons?'<span class="tag">制約</span>':'')+(r.grp?'<span class="tag">グループ</span>':'')+(r.liar?'<span class="tag">数字が嘘</span>':'')+(r.iso?'<span class="tag">孤立禁止</span>':'')+(r.conn?'<span class="tag">つながる</span>':'')+(r.wt?'<span class="tag">数え方変更</span>':'')+(r.ok?'<span class="tag">条件付き</span>':'')+(stepOf(r)>1?'<span class="tag">爆弾数は'+stepOf(r)+'の倍数</span>':'');
const vis=()=>{const q=$('#mq').value.trim().toLowerCase();return Object.values(RULES).filter(r=>!q||(r.id+r.name+r.desc).toLowerCase().includes(q))};
function renderList(){const L=$('#ml');
 if(MODE=='pick'){$('#mt').textContent='縛りを選ぶ ('+SEL.size+'/'+Object.keys(RULES).length+')';
  L.innerHTML=vis().map(r=>{const d=blockers(r.id).length;return '<label class="ri'+(d?' dis':'')+'" data-rid="'+r.id+'"><input type="checkbox" data-id="'+r.id+'"'+(SEL.has(r.id)?' checked':'')+(d?' disabled':'')+'><div><b>'+r.name+'</b>'+tags(r)+'<div class="mut" style="margin:0">'+r.desc+'</div></div></label>'}).join('')||'<p class="mut">該当する縛りがありません</p>'}
 else{const h=G&&G.hint,hr=h?h.rs:[];
  L.innerHTML=G.cfg.ids.map(id=>'<div class="ri '+(hr.includes(id)?'hl':'')+'" data-rid="'+id+'"><div><b>'+RULES[id].name+'</b>'+tags(RULES[id])+'<div class="mut" style="margin:0">'+RULES[id].desc+'</div></div></div>').join('')||'<p class="mut">この盤面に縛りはありません</p>'}}
function openM(m){MODE=m;const p=m=='pick';if(!p)$('#mt').textContent='この盤面の縛り';$('#mh').textContent=!p&&hm?'ヒントON: 縛りをタップすると、その縛りから分かることを教えます':'縛りを長押しすると、例の盤面が表示されます';$('#mq').hidden=$('#mfoot').hidden=!p;$('#mq').value='';$('#md').hidden=false;renderList()}
function closeM(){$('#md').hidden=true;updSel();upd()}
function updSel(){const n=[...SEL].map(id=>RULES[id].name);$('#sel').textContent=n.length?n.length+'件: '+n.join(' / '):'未選択(縛りなし)'}
/* ---- 競合(併用不可)と例盤面 ---- */
const blockers=id=>[...SEL].filter(s=>s!=id&&conflict(RULES[s],RULES[id]));
const exCache={};
function mini(P,m,o){o=o||{};let h='<div class="mini">';
 for(let i=0;i<49;i++){let cl='c o',t='';
  if(o.pat){if(i==24){cl+=' ctr';t='?'}else if(P.nb[24].includes(i)){cl+=' cnt';t='●'}}
  else if(m[i])t='💣';else{const n=o.sh?o.sh[i]:ncount(P,m,i);t=n||'';if(n)cl+=' n'+Math.min(n,8);if(o.hon&&o.hon[i])cl+=' hon'}
  if(o.bc&&o.bc.includes(i))cl+=' bad';
  h+='<div class="'+cl+'"'+(P.w&&P.w[i]>1?WTST:'')+'>'+t+'</div>'}
 return h+'</div>'}
async function exHtml(id){if(exCache[id])return exCache[id];const r=RULES[id];
 let h='<h4 style="margin:14px 0 2px">'+r.name+'</h4><p class="mut" style="margin:0 0 6px">'+r.desc+'</p>',cfg=null;
 for(const M of[8,12,16]){const c={R:7,C:7,M,ids:[id]};if(M%stepOf(r)==0&&(!r.ok||r.ok(c))){cfg=c;break}}
 const e=cfg&&await gen(cfg,{sampleOnly:1});
 if(!e||!e.mines)return h+'<p class="mut">例の盤面を作れませんでした</p>';
 h+='<div class="mut">OK例'+(r.nb?'(数字はこのルールで数えた値)':'')+'</div>'+mini(e.P,e.mines,{sh:e.L&&e.L.sh,hon:e.L&&e.L.hon});
 if(r.wt)h+='<div class="mut">橙に塗ったマスが色つき。色つきマスの爆弾は数字に2個ぶんとして数える(爆弾の総数は変わらない)</div>';
 if(r.liar)h+='<div class="mut">青枠が正直な数字(各行・各列に1つ)。ほかの数字は実際の爆弾数と1ズレている</div>';
 if(r.nb)h+='<div class="mut">数字が数えるマス: 中央「?」の数字は ● のマスの爆弾数</div>'+mini(e.P,null,{pat:1});
 else if(e.bad)h+='<div class="mut">NG例(赤枠がルール違反)</div>'+mini(e.P,e.bad,{bc:e.bc});
 return exCache[id]=h}
async function showEx(ids,title){$('#et').textContent=title;$('#el').innerHTML='<p class="mut">作成中…</p>';$('#ex').hidden=false;
 let h='';for(const id of ids)h+=await exHtml(id);$('#el').innerHTML=h||'<p class="mut">縛りはありません</p>'}
function longpress(el,sel,fn){let tm=0,fired=0;
 el.addEventListener('pointerdown',e=>{const t=e.target.closest(sel);if(!t)return;fired=0;clearTimeout(tm);tm=setTimeout(()=>{fired=1;fn(t)},500)});
 for(const n of['pointerup','pointerleave','pointercancel'])el.addEventListener(n,()=>clearTimeout(tm));
 el.addEventListener('click',e=>{if(fired){fired=0;e.preventDefault();e.stopImmediatePropagation()}},true);
 el.addEventListener('contextmenu',e=>{if(e.target.closest(sel))e.preventDefault()})}
/* モーダル(#md 縛り / #ex 例盤面)が開いている間は、後ろの画面をスクロールさせない。CSSを触らず、ここで style を足す。 */
try{if(typeof document!=='undefined'&&document.head&&document.createElement){const st=document.createElement('style');
 st.textContent='html:has(#md:not([hidden])),html:has(#ex:not([hidden])),body:has(#md:not([hidden])),body:has(#ex:not([hidden])){overflow:hidden}#md,#md *,#ex,#ex *{overscroll-behavior:contain}';
 document.head.appendChild(st)}}catch(e){}
