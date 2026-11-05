/* [core/selftest] ルール検査(単体+併用ペア)と、AIに渡す検査レポート。DOM非依存(tools/headless.js からも使う)。
   selfTest(only): only=['id',...] を渡すと、そのルールの単体 + そのルールを含む組だけ検査する。省略で全部。 */
const TEST={},PAIR_NG=[];
async function selfTest(only){PAIR_NG.length=0;const ids=Object.keys(RULES),sel=only&&only.length?new Set(only):null;
 for(const id of ids){if(sel&&!sel.has(id))continue;const r=RULES[id];let ok=0,fail=0,why='';
  for(const[R,C,M0]of[[7,7,8],[9,9,14]]){const M=mpick(R,C,M0,[id]);if(!M)continue;const cfg={R,C,M,ids:[id]};
   for(let t=0;t<2;t++){try{(await gen(cfg,{qms:1500,hard:8000}))?ok++:fail++}catch(e){fail++;why=e.message}}}
  TEST[id]=fail?'NG('+ok+'/'+(ok+fail)+(why?' '+why:'')+')':ok?'OK('+ok+')':'未検査(適用外)'}
 for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++){const a=RULES[ids[i]],b=RULES[ids[j]];if(conflict(a,b))continue;
  if(sel&&!sel.has(a.id)&&!sel.has(b.id))continue;
  const M=mpick(7,7,10,[a.id,b.id]);if(!M)continue;const cfg={R:7,C:7,M,ids:[a.id,b.id]};
  try{if(!await gen(cfg,{qms:800,hard:4000}))PAIR_NG.push(a.id+'+'+b.id)}catch(e){PAIR_NG.push(a.id+'+'+b.id+'('+e.message+')')}}}
/* 検査レポート(markdown)。ルール一覧は id/name/使用フックのみ(ソースは rules/<id>.js を別途渡す) */
function buildReport(){
 const hk=r=>[r.nb&&'nb',r.wt&&'wt',r.cons&&'cons',r.ok&&'ok',r.grp&&'grp='+r.grp,r.liar&&'liar',r.iso&&'iso'+(r.iso===true?'':'='+r.iso),r.conn&&'conn',r.mstep&&'mstep='+r.mstep,r.why&&'why',r.excl&&'excl='+r.excl,r.conflicts&&'conflicts='+r.conflicts.join(',')].filter(Boolean).join(' ');
 const rows=Object.values(RULES).map(r=>'| '+r.id+' | '+r.name+' | '+hk(r)+' | '+(TEST[r.id]||'未検査')+' |');
 return['# 検査レポート ('+new Date().toISOString().slice(0,10)+')','',
  '| id | name | hooks | 単体検査 |','|---|---|---|---|',...rows,'',
  '登録エラー: '+(RULE_ERR.join(' / ')||'なし'),
  '併用で生成に失敗した組(conflicts の検討対象): '+(PAIR_NG.length?PAIR_NG.join(', '):'なし(または未検査)')].join('\n')}
