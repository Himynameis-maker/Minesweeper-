/* [core/registry] ルール登録(reg)・併用不可判定・爆弾数条件(mstep/grp)のヘルパー。DOM非依存。
   ルール定義の仕様は context.md 第4節。ここは通常触らない(新しい任意フィールドを足すときだけ reg と conflict を触る)。 */
const RULES={},RULE_ERR=[];
const conflict=(a,b)=>a.id!=b.id&&((a.excl&&a.excl===b.excl)||(a.grp&&b.grp)||(a.liar&&b.liar)||(a.wt&&b.wt)||(a.conflicts||[]).includes(b.id)||(b.conflicts||[]).includes(a.id));
/* 爆弾数の条件: 必要な倍数(mstep か grp) / 倍数に丸める */
const stepOf=r=>r.mstep||r.grp||1;
const lcmStep=ids=>ids.reduce((s,id)=>{const t=stepOf(RULES[id]);return s/gcd(s,t)*t},1);
function mfit(M,ids,N){const s=lcmStep(ids);if(s<2)return M;let m=Math.max(s,Math.round(M/s)*s);while(m>N-12&&m>s)m-=s;return m}
/* 爆弾数の統一判定: 全縛りが成り立つ爆弾数か / 前後の最寄り(フリープレイ表示とチャレンジ自動調整で共用) */
const mok=(R,C,M,ids)=>ids.every(id=>{const r=RULES[id];return M%stepOf(r)==0&&(!r.ok||r.ok({R,C,M,ids}))});
function mnear(R,C,M,ids,max){let lo=0,hi=0;for(let m=M-1;m>=1&&!lo;m--)if(mok(R,C,m,ids))lo=m;for(let m=M+1;m<=max&&!hi;m++)if(mok(R,C,m,ids))hi=m;return{lo,hi}}
/* M0 以上で全縛りが成り立つ最小の爆弾数(なければ0)。検査用 */
function mpick(R,C,M0,ids){const max=R*C-12;for(let m=M0;m<=max;m++)if(mok(R,C,m,ids))return m;return 0}
function reg(d){try{
 if(!d||!/^[a-z][a-zA-Z0-9]*$/.test(d.id||''))throw'id不正';
 if(RULES[d.id])throw'id重複';
 if(!d.name||!d.desc)throw'name/desc必須';
 for(const k of['nb','cons','ok','wt'])if(d[k]&&typeof d[k]!='function')throw k+'は関数';
 if(d.conflicts&&!Array.isArray(d.conflicts))throw'conflictsは配列';
 for(const k of['grp','mstep'])if(d[k]!==undefined&&!(Number.isInteger(d[k])&&d[k]>=2))throw k+'は2以上の整数';
 if(d.why!==undefined&&typeof d.why!='string')throw'whyは文字列';
 if(d.iso!==undefined&&d.iso!==true)throw'isoはtrue';
 if(d.conn!==undefined&&d.conn!==true)throw'connはtrue';
 RULES[d.id]=d}catch(e){RULE_ERR.push((d&&d.id)+': '+e)}}
