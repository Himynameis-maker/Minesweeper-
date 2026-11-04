/* [core/util] 共通ヘルパー。DOM非依存(node でも動く)。 */
const rnd=Math.random;
const D8=[[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]],D4=[[-1,0],[0,-1],[0,1],[1,0]],KN=[[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
/* マスiから [dr,dc] ずらした盤内マスの番号配列 */
const offs=(R,C,i,L)=>{const r=i/C|0,c=i%C,o=[];for(const[a,b]of L){const y=r+a,x=c+b;if(y>=0&&y<R&&x>=0&&x<C)o.push(y*C+x)}return o};
const gcd=(a,b)=>b?gcd(b,a%b):a;
