import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {randomUUID} from 'node:crypto';
import {WebSocket} from 'ws';
import {createServer} from '../scripts/preview.mjs';
import {planMeal,rankedMenus} from '../lib/meal-agent.mjs';
import {initialProviders} from '../lib/data.mjs';
import {stripeGateway,paidReceipt} from '../scripts/test-checkout.mjs';

function exampleClient(){
  return {embedding:'fixture',embed:async texts=>texts.map(()=>[1,0]),
    decide:async (_system,data)=>({value:data.matches?
      {tool:'quote_menu',id:data.matches[0].id}:{tool:'search_menus',query:data.preference},tokens:10})};
}
test('retrieval reuses vectors, and changed dishes get a fresh cache key',async()=>{
  const client=exampleClient(),calls=[],cache=new Map();
  client.embed=async texts=>{calls.push(texts);return texts.map(()=>[1,0]);};
  const menu={...initialProviders[0]};
  await rankedMenus([menu],'lunch',client,cache);
  await rankedMenus([menu],'lunch',client,cache);
  menu.menu=['new dish'];await rankedMenus([menu],'lunch',client,cache);
  assert.deepEqual(calls.map(batch=>batch[0]==='lunch'),[false,true,true,false,true]);
});
test('the agent skips expired date-only menus and rejects unknown tool results',async()=>{
  const menu={...initialProviders[0],mode:'dates',recurring:[],dates:{'2020-01-02':{dish:'rice'}}};
  const request={query:'rice',area:'Koramangala',days:1};
  assert.equal((await planMeal(request,[menu],exampleClient())).choice,null);
  const client=exampleClient();client.decide=async(_system,data)=>({tokens:0,value:data.matches?
    {tool:'quote_menu',id:'missing'}:{tool:'search_menus',query:'rice'}});
  await assert.rejects(planMeal(request,[initialProviders[0]],client),/Invalid quote/);
});
test('checkout accepts test credentials and paid receipts for the initiating session',async()=>{
  assert.equal(stripeGateway('unconfigured'),null);
  const gateway={checkout:{sessions:{retrieve:async()=>({livemode:false,client_reference_id:'someone else',payment_status:'paid',currency:'inr',amount_total:500})}}};
  assert.equal(await paidReceipt(gateway,'cs_test_example','user'),null);
});
test('local sign-in, live publish and delete, SSR, quotes, test checkout and receipt', {timeout:20000}, async t=>{
  const dir=await mkdtemp(path.join(tmpdir(),'ghar-viva-'));
  const origin='http://127.0.0.1:3000';
  let checkout;
  const gateway={checkout:{sessions:{async create(params,options){checkout={params,options};return {livemode:false,url:'https://checkout.stripe.com/test'};},
    async retrieve(){return {livemode:false,client_reference_id:checkout.params.client_reference_id,payment_status:'paid',currency:'inr',amount_total:checkout.params.line_items[0].price_data.unit_amount,metadata:checkout.params.metadata};}}}};
  const server=createServer({folder:pathToFileURL(dir+path.sep),origin,gateway,client:exampleClient(),cache:new Map()});
  server.listen(0,'127.0.0.1');await once(server,'listening');
  const base='http://127.0.0.1:'+server.address().port;
  let ws;
  t.after(async()=>{ws?.terminate();await new Promise(r=>server.close(r));await rm(dir,{recursive:true,force:true});});
  const unauth=await fetch(base+'/meal-finder/',{redirect:'manual'});assert.equal(unauth.headers.get('location'),'/login/');
  const signin=async()=>{const response=await fetch(base+'/__preview/signin',{method:'POST',headers:{origin},redirect:'manual'});
    assert.equal(response.status,303);return response.headers.get('set-cookie').split(';')[0];};
  const chef=await signin(),customer=await signin();
  ws=new WebSocket(base.replace('http:','ws:')+'/meal-events',{origin,headers:{cookie:customer}});await once(ws,'open');
  const catalog=async()=> (await fetch(base+'/meal-finder/',{headers:{cookie:customer}})).text();
  const update=(method,data)=>fetch(base+'/api/kitchens',{method,headers:{cookie:chef,origin,'content-type':'application/json'},body:JSON.stringify(data)});
  const draft={name:'Viva Kitchen',menuName:'Mango Lunch',mode:'weekly',week:Array.from({length:7},()=>({dish:'mango curry and millet'})),recurring:[],dates:{},price:100,weekly:20,monthly:30,areas:['Indiranagar'],revision:0,createKey:randomUUID()};
  let event=once(ws,'message');const created=await update('PUT',draft);assert.equal(created.status,200);
  const {kitchen}=await created.json();assert.equal(JSON.parse((await event)[0]).type,'menus_changed');
  assert.match(await catalog(),/Viva Kitchen · Mango Lunch/);
  const submit=(route,fields)=>fetch(base+route,{method:'POST',headers:{origin,cookie:customer},body:new URLSearchParams(fields),redirect:'manual'});
  const selection={query:'mango curry and millet',days:'7',area:'Indiranagar'};
  const result=await submit('/meal-finder/',selection);assert.equal(result.status,200);
  const html=await result.text();assert.match(html,/₹560/);assert.match(html,/quote_menu/);
  const fields={...selection,id:kitchen.id,amount:'560',requestId:randomUUID()};
  assert.equal((await submit('/meal-finder/checkout',{...fields,amount:'1'})).status,409);
  assert.equal((await submit('/meal-finder/checkout',fields)).headers.get('location'),'https://checkout.stripe.com/test');
  assert.equal(checkout.params.line_items[0].price_data.unit_amount,56000);
  const receipt=await fetch(base+'/meal-finder/receipt?session_id=cs_test_demo',{headers:{cookie:customer}});
  assert.match(await receipt.text(),/confirmed a test payment of ₹560/);
  event=once(ws,'message');assert.equal((await update('DELETE',{id:kitchen.id,revision:kitchen.revision})).status,200);
  await event;assert.doesNotMatch(await catalog(),/Viva Kitchen/);
  assert.equal((await submit('/meal-finder/checkout',fields)).status,409);
});
