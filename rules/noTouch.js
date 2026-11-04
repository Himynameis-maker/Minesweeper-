/* 縦横非隣接: cons だけで書ける典型例(マス集合の爆弾数の範囲) */
reg({id:'noTouch',name:'縦横非隣接',desc:'爆弾同士は上下左右に隣り合わない',
 cons:(R,C)=>{const o=[];for(let i=0;i<R*C;i++){if(i%C<C-1)o.push({cells:[i,i+1],lo:0,hi:1});if(i<(R-1)*C)o.push({cells:[i,i+C],lo:0,hi:1})}return o}});
