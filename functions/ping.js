/* GET /ping → サーバー機能(Functions)が動いているかの確認用。ブラウザで https://<サイト>/ping を開いて {"ok":true,...} が出ればよい。
   binding=D1 の変数名 DB が結びついている / tables=schema.sql が実行済み / token=環境変数 DAILY_TOKEN がある。値そのものは返さない。 */
import{json}from'./_lib.js';
export async function onRequestGet({env}){
 let tables=false;try{await env.DB.prepare('SELECT 1 AS x FROM boards LIMIT 1').first();await env.DB.prepare('SELECT 1 AS x FROM plays LIMIT 1').first();await env.DB.prepare('SELECT 1 AS x FROM ranks LIMIT 1').first();tables=true}catch(e){}
 let maint=false;try{await env.DB.prepare('SELECT 1 AS x FROM maint LIMIT 1').first();maint=true}catch(e){} /* メンテ用テーブル。無くても管理APIの予約時に自動で作る */
  let picks=false;try{await env.DB.prepare('SELECT 1 AS x FROM picks LIMIT 1').first();picks=true}catch(e){} /* 厳選盤面用テーブル。無くても管理APIが自動で作る */
 return json({ok:true,binding:!!env.DB,tables,maint,picks,token:!!env.DAILY_TOKEN})}
