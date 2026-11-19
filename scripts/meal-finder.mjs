import {randomUUID} from 'node:crypto';
import {initialProviders,areas} from '../lib/data.mjs';
import {enoughDates,money,quote,todayIST} from '../lib/domain.mjs';
import {ollamaClient,planMeal} from '../lib/meal-agent.mjs';
import {embeddingCache} from './embedding-cache.mjs';
import {stripeGateway,openCheckout,paidReceipt} from './test-checkout.mjs';

const escape = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const menuName = menu => [menu.name,menu.menuName].filter(Boolean).join(' · ');
const choices = (items,selected) => items.map(x=>'<option'+(x===selected?' selected':'')+'>'+escape(x)+'</option>').join('');
function page(catalog,{area=areas[0],days=7,query='',message='',result,gateway}={}) {
  let panel='';
  if(result?.choice){
    const menu=result.choice;
    panel='<section><h2>'+escape(menuName(menu))+'</h2><p>'+days+' lunches · <strong>'+money(result.total)+'</strong> including the plan discount.</p><p>'+escape(result.steps.join(' → '))+' · '+result.tokens+' model tokens</p>';
    if(gateway && result.total>0) panel+='<form action="/meal-finder/checkout" method="post">'+
      Object.entries({id:menu.id,area,days,amount:result.total,requestId:randomUUID()}).map(([k,v])=>'<input type="hidden" name="'+k+'" value="'+escape(v)+'">').join('')+
      '<button>Open Stripe test checkout</button></form>';
    else if(result.total>0) panel+='<p>Test checkout is available when a Stripe test key is configured.</p>';
    panel+='</section>';
  }
  const list=catalog.map(m=>'<li><strong>'+escape(menuName(m))+'</strong><span>'+escape(m.areas.join(' · '))+' · '+money(m.price)+' / lunch</span></li>').join('');
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Meal finder | Ghar</title><link rel="stylesheet" href="/meal-finder.css"><script src="/meal-live.js" defer></script></head><body><main><nav><a href="/">← Back to Ghar</a></nav><h1>Find my lunch</h1><p>Describe a dish you like and choose where you need it delivered.</p><form action="/meal-finder/" method="post"><label>What sounds good?<input name="query" maxlength="200" required placeholder="Sambar and rice" value="'+escape(query)+'"></label><div class="fields"><label>Delivery area<select name="area">'+choices(areas,area)+'</select></label><label>Number of lunches<select name="days">'+choices([1,7,30],days)+'</select></label></div><button>Find a menu</button></form>'+
    (message?'<p role="status">'+escape(message)+'</p>':'')+panel+'<section><h2>Available menus</h2><p id="live" aria-live="polite"></p><ul>'+list+'</ul></section></main></body></html>';
}
function redirect(res,url){res.writeHead(303,{Location:url,'Cache-Control':'no-store'});res.end();}
async function readForm(req) {
  if(req.headers['content-type']?.split(';')[0]!=='application/x-www-form-urlencoded')return null;
  let size=0;const chunks=[];
  for await(const chunk of req){size+=chunk.length;if(size>4096)return null;chunks.push(chunk);}
  return new URLSearchParams(Buffer.concat(chunks).toString('utf8'));
}
export function createFinder({account,client=ollamaClient(),cache=embeddingCache(),gateway=stripeGateway()}) {
  return async function finder(req,res,origin) {
    const url=new URL(req.url,origin),path=url.pathname;
    if(!path.startsWith('/meal-finder/'))return false;
    const token=account.sessionFor(req);
    if(!token){redirect(res,'/login/');return true;}
    const catalog=[...account.menus(),...initialProviders.filter(m=>m.verified)];
    function send(status,details){res.writeHead(status,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(page(catalog,{...details,gateway}));return true;}
    if(req.method==='GET' && path==='/meal-finder/')return send(200,{message:url.searchParams.has('cancelled')?'Test checkout cancelled.':''});
    if(req.method==='GET' && path==='/meal-finder/receipt') {
      try {const receipt=gateway && await paidReceipt(gateway,url.searchParams.get('session_id'),token);
        return receipt?send(200,{message:'Stripe confirmed a test payment of '+money(receipt.total)+' for '+receipt.days+' lunches.'}):send(400,{message:'A paid test receipt could not be verified for this session.'});
      }catch{return send(502,{message:'Stripe could not verify this test receipt.'});}
    }
    if(!['/meal-finder/','/meal-finder/checkout'].includes(path))return send(404,{message:'Page unavailable.'});
    if(req.method!=='POST')return send(405,{message:'Use the form to continue.'});
    if(req.headers.origin!==origin)return send(403,{message:'Submit from this Ghar site.'});
    const form=await readForm(req);
    if(!form)return send(400,{message:'Check your form.'});
    const days=Number(form.get('days')),area=form.get('area'),query=(form.get('query')||'').trim();
    if(![1,7,30].includes(days)||!areas.includes(area))return send(400,{message:'Choose a listed area and plan.'});
    if(path==='/meal-finder/checkout'){
      if(!gateway)return send(503,{message:'Configure a Stripe test key to open checkout.'});
      const menu=catalog.find(m=>m.id===form.get('id') && m.areas.includes(area) && enoughDates(m,todayIST(),days));
      if(!menu || !form.has('amount') || quote(menu.price,days,'lunch',menu)!==Number(form.get('amount')))return send(409,{message:'The menu or price changed. Find your lunch again.'});
      const requestId=form.get('requestId');
      if(!/^[0-9a-f-]{36}$/.test(requestId||''))return send(400,{message:'Reopen your quote.'});
      try {redirect(res,await openCheckout(gateway,{menu,days,token,requestId,origin}));return true;}
      catch{return send(502,{message:'Stripe could not open test checkout. Check your test account settings.'});}
    }
    if(!query || query.length>200)return send(400,{message:'Describe your meal in 1–200 characters.'});
    try {const result=await planMeal({query,area,days},catalog,client,cache);
      return send(200,{query,area,days,result,message:result.choice?'':'No menu can supply this plan in your area.'});
    }catch{return send(503,{area,days,query,message:'Meal suggestions are unavailable. Check that Ollama is running with both models listed in VIVA.md.'});}
  };
}
