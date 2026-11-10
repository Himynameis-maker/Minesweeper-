/* GET /api/picks → {picks:[{day,n,code,at}]}。厳選盤面の一覧(誰でも見られる。盤面コードは公開してよいもの)。新しい順(作られた日 → 時刻)。最大 PICK_MAX 個。
   n=縛りの数、day=作られた日(JST)。画面は day ごとにまとめて出す。ルールセット番号が古いものは、新しい盤面が入るときにサーバーが消す(画面側も bcOld のものは出さない)。
   picks テーブルがまだ無い(schema.sql 未実行・まだ1つも入っていない)ときは空の一覧を返す。 */
import{json,PICK_MAX}from'../_lib.js';
export async function onRequestGet({env}){
 try{const r=await env.DB.prepare('SELECT day,n,code,at FROM picks ORDER BY day DESC, at DESC, rowid DESC LIMIT ?').bind(PICK_MAX).all();return json({picks:r.results||[]})}
 catch(e){if(/no such table/i.test(String(e&&e.message)))return json({picks:[]});throw e}}
