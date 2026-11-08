/* [core/boardcode] 盤面コード(デイリー用)。盤面そのものを文字列にしたもので、シードではない。DOM非依存。
   形式(.区切り。空欄あり): MS1.<ルールセット番号>.<R>x<C>.<開始マス>.<縛りid(,区切り)>.<爆弾ビット列>.<表示数字(あるときだけ)>.<検査4字>
   ・縛りは番号でなく id の文字列なので、ルールを足しても既存コードは壊れない。登録に無い id のコードは断る。
   ・表示数字は、実際の爆弾数と数字が違う盤面(liar・隠れ龍など、gen が L.sh を返すとき)だけ入る。play が使うのは L.sh だけなので、これで盤面を再現できる。
   ・新しい隠れ状態が増えて play が L.sh 以外も要るようになったら、末尾の検査の手前に欄を足す(BC_HEAD を MS2 に上げる)。 */
const BC_HEAD='MS1',BC_ABC='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const bcB64=b=>{let o='';for(let i=0;i<b.length;i+=3){const n=Math.min(3,b.length-i),x=b[i]<<16|(b[i+1]||0)<<8|(b[i+2]||0);o+=BC_ABC[x>>18&63]+BC_ABC[x>>12&63];if(n>1)o+=BC_ABC[x>>6&63];if(n>2)o+=BC_ABC[x&63]}return o};
const bcUnb64=s=>{if(s.length%4==1)return null;const o=[];let x=0,n=0;for(let i=0;i<s.length;i++){const v=BC_ABC.indexOf(s[i]);if(v<0)return null;x=x<<6|v;n+=6;if(n>=8){n-=8;o.push(x>>n&255);x&=(1<<n)-1}}return Uint8Array.from(o)};
const bcSum=s=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)>>>0}return('0000000'+h.toString(36)).slice(-4)};
/* cfg={R,C,M,ids}, res=gen の返り値({mines,start,L})→ 盤面コード */
function boardEncode(cfg,res){const{R,C,ids}=cfg,N=R*C,mb=new Uint8Array(N+7>>3);
 for(let i=0;i<N;i++)if(res.mines[i])mb[i>>3]|=1<<(i&7);
 const sh=res.L&&res.L.sh?bcB64(Uint8Array.from(res.L.sh,x=>x&255)):'';
 const body=[BC_HEAD,BOARD_VER,R+'x'+C,res.start,ids.join(','),bcB64(mb),sh].join('.');return body+'.'+bcSum(body)}
/* 盤面コード → {ok:true,cfg,res,ver}(res は gen の返り値と同じ形。play の setBoard にそのまま渡せる) / {ok:false,err,id?}
   err: format(形が違う) sum(写し間違い) old(ルールセット番号が古い) size rule(id=未登録の縛り) board(中身が不正) */
function boardDecode(code){const f=String(code||'').trim().split('.'),bad=(err,id)=>({ok:false,err,id});
 if(f.length!=8||f[0]!=BC_HEAD)return bad('format');
 if(bcSum(f.slice(0,7).join('.'))!=f[7])return bad('sum');
 const ver=+f[1];if(!/^\d+$/.test(f[1])||ver<BOARD_VER)return bad('old');
 const sz=/^(\d+)x(\d+)$/.exec(f[2]);if(!sz)return bad('size');
 const R=+sz[1],C=+sz[2],N=R*C;if(R<3||C<3||R>24||C>24)return bad('size');
 if(!/^\d+$/.test(f[3]))return bad('board');const start=+f[3];
 const ids=f[4]?f[4].split(','):[];
 for(const id of ids)if(!RULES[id])return bad('rule',id);
 if(new Set(ids).size!=ids.length)return bad('board');
 const mb=bcUnb64(f[5]);if(!mb||mb.length!=(N+7>>3))return bad('board');
 const mines=new Uint8Array(N);let M=0;for(let i=0;i<N;i++)if(mb[i>>3]>>(i&7)&1){mines[i]=1;M++}
 if(!M||start>=N||mines[start])return bad('board');
 let L=null;if(f[6]){const b=bcUnb64(f[6]);if(!b||b.length!=N)return bad('board');L={sh:Int8Array.from(b,x=>x<<24>>24)}}
 return{ok:true,ver,cfg:{R,C,M,ids},res:{mines,start,gf:1,q:1,L}}}
