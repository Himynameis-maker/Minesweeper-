/* 十字数字: nb だけで書ける典型例(数字が数えるマスの変更)。数字を変えるルールは excl:'num' */
reg({id:'cross',name:'十字数字',desc:'数字は上下左右4マスの爆弾数',excl:'num',nb:(R,C,i)=>offs(R,C,i,D4)});
