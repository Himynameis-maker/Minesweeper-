/* /en … 同じ index.html をそのまま返す(アドレスは /en のまま変わらない)。言語は js/i18n.js がアドレスから決める。
   _redirects で index.html に振り向ける方法は、Pages が「/」に飛ばしてしまい英語にならないので使わない。
   /ja も同じ作り(functions/ja.js)。 */
export async function onRequest({request,env}){
 const u=new URL(request.url);u.pathname='/';
 return env.ASSETS.fetch(new Request(u.toString(),{method:request.method,headers:request.headers}))}
