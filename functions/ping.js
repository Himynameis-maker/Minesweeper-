/* GET /ping → サーバー機能(Functions)が動いているかの確認用。ブラウザで https://<サイト>/ping を開いて {"ok":true,...} が出ればよい。
   binding=D1 の変数名 DB が結びついている / tables=schema.sql が実行済み / token=環境変数 DAILY_TOKEN がある。値そのものは返さない。 */
import{json}from'./_lib.js';
export async function onRequestGet({env}){
 let tables=false;try{await env.DB.prepare('SELECT 1 AS x FROM boards LIMIT 1').first();await env.DB.prepare('SELECT 1 AS x FROM plays LIMIT 1').first();await env.DB.prepare('SELECT 1 AS x FROM ranks LIMIT 1').first();tables=true}catch(e){}
 return json({ok:true,binding:!!env.DB,tables,token:!!env.DAILY_TOKEN})}
