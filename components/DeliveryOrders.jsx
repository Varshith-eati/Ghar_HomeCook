'use client';
import {useEffect,useRef,useState} from 'react';
import {ArrowRight,Check,Clock3,MapPin,Truck} from 'lucide-react';
import {availableDeliverySlots,deliveryStages} from '../lib/delivery.mjs';
import {money,niceDate} from '../lib/domain.mjs';

async function orderRequest(url,options={}){
  const response=await fetch(url,{cache:'no-store',...options});
  const result=await response.json();
  if(!response.ok)throw new Error(result.error || 'Could not load orders.');
  return result;
}
function mutateOrder(method,body){
  return orderRequest('/api/orders',{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
}
function windowLabel(slot){
  const hour=Number(slot.slice(0,2));
  return (hour%12||12)+'–'+((hour+1)%12||12)+' '+(hour>=12?'PM':'AM')+' IST';
}
export function MealOrderForm({provider,preferences,onPlaced}){
  const slots=availableDeliverySlots(provider);
  const dates=[...new Set(slots.map(s=>s.date))];
  const [date,setDate]=useState(dates[0]||''),[quantity,setQuantity]=useState(1),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const requestId=useRef(null);
  const choices=slots.filter(s=>s.date===date);
  async function submit(e){
    e.preventDefault();if(busy)return;
    const fields=Object.fromEntries(new FormData(e.currentTarget));
    setBusy(true);setError('');
    try{
      requestId.current ??= crypto.randomUUID();
      const {order}=await mutateOrder('POST',{...fields,date,quantity,menuId:provider.id,revision:provider.revision,id:requestId.current});
      onPlaced(order.id);
    }catch(err){setError(err.message);}finally{setBusy(false);}
  }
  if(!dates.length)return <p>No delivery slots are available in the next two weeks.</p>;
  return <form className="stack-form" onSubmit={submit}>
    <h3>{provider.name}</h3>
    <div className="form-grid"><label>Delivery date<select value={date} onChange={e=>setDate(e.target.value)}>{dates.map(d=><option key={d} value={d}>{niceDate(d)}</option>)}</select></label>
    <label>Delivery window<select key={date} name="slot" required>{choices.map(s=><option key={s.slot} value={s.slot}>{windowLabel(s.slot)}</option>)}</select></label></div>
    <p className="delivery-menu">{choices[0]?.dish}</p>
    <div className="form-grid"><label>Portions<select value={quantity} onChange={e=>setQuantity(Number(e.target.value))}>{Array.from({length:10},(_,i)=><option key={i+1}>{i+1}</option>)}</select></label>
    <label>Delivery area<select name="area" defaultValue={provider.areas.includes(preferences?.locality)?preferences.locality:provider.areas[0]}>{provider.areas.map(a=><option key={a}>{a}</option>)}</select></label></div>
    <label>Delivery address<input name="address" placeholder="Demo flat, building and street" required minLength={8} maxLength={160}/></label>
    <div className="checkout-total"><span>{quantity} × {money(provider.price)}<small>Demo order · no payment or courier booking</small></span><strong>{money(quantity*provider.price)}</strong></div>
    {error&&<p role="alert" className="form-error">{error}</p>}
    <button className="btn primary full" disabled={busy||!choices.length}>{busy?'Placing order…':'Place demo order'} <ArrowRight size={16}/></button>
  </form>;
}
const shortTime=iso=>new Intl.DateTimeFormat('en-IN',{day:'numeric',month:'short',hour:'numeric',minute:'2-digit',timeZone:'Asia/Kolkata'}).format(new Date(iso));
export function DeliveryOrders({chef=false,focusId,onReorder,providers=[]}){
  const [orders,setOrders]=useState(null),[error,setError]=useState(''),[attempt,setAttempt]=useState(0),[pending,setPending]=useState(''),[history,setHistory]=useState(false);
  useEffect(()=>{
    const controller=new AbortController();let latest=0;
    async function refresh(){
      const ticket=++latest;
      try{
        const result=await orderRequest('/api/orders?view='+(chef?'chef':'customer'),{signal:controller.signal});
        if(ticket===latest&&!controller.signal.aborted){setOrders(result.orders);setError('');}
      }catch(e){if(ticket===latest&&!controller.signal.aborted)setError(e.message);}
    }
    refresh();const timer=setInterval(refresh,8000);window.addEventListener('focus',refresh);
    return ()=>{controller.abort();clearInterval(timer);window.removeEventListener('focus',refresh);};
  },[chef,attempt]);
  async function advance(order){
    setPending(order.id);
    try{await mutateOrder('PATCH',{id:order.id,status:deliveryStages[deliveryStages.indexOf(order.status)+1]});setAttempt(i=>i+1);}
    catch(e){setError(e.message);}finally{setPending('');}
  }
  const shown=(orders||[]).filter(o=>(o.status==='Delivered')===history);
  return <section className="panel shared-orders"><div className="panel-heading"><div><h2>{chef?'Incoming meal orders':'Meal order tracking'}</h2><p>{chef?'Update each order as it leaves your kitchen.':'Delivery windows and updates from your chef.'}</p></div><Truck size={23}/></div>
    <div className="page-tabs">{['Active orders','Delivered orders'].map((label,i)=><button key={label} className={history===Boolean(i)?'active':''} aria-pressed={history===Boolean(i)} onClick={()=>setHistory(Boolean(i))}>{label}</button>)}</div>
    {error&&<p role="alert">{error} <button className="text-btn" onClick={()=>setAttempt(i=>i+1)}>Refresh orders</button></p>}
    {!orders&&!error&&<p role="status">Loading orders…</p>}{orders&&!shown.length&&<p>{history?'Completed meal orders will appear here.':chef?'New one-time orders for your published menus will appear here.':'Choose Order a meal on a chef’s published menu to track it here.'}</p>}
    {shown.map(o=>{
      const step=deliveryStages.indexOf(o.status),next=deliveryStages[step+1];
      return <article className="shared-order" key={o.id}>
        <div className="delivery-top"><div><small>{focusId===o.id?'Your new order · ':''}Order #{o.id.slice(0,8).toUpperCase()}</small><h3>{o.restaurant} · {o.menu}</h3></div><span className="pill">{o.status}</span></div>
        <p>{o.quantity} × {o.dish} · <strong>{money(o.total)}</strong></p>
        <p className="order-detail"><Clock3 size={16}/>{niceDate(o.date)} · {windowLabel(o.slot)}</p>
        <p className="order-detail"><MapPin size={16}/>{o.address}, {o.area}</p>
        <ol className="order-timeline" aria-label="Delivery progress">{deliveryStages.map((s,i)=><li key={s} className={i<=step?'reached':''} aria-current={i===step?'step':undefined}><span>{i<=step?<Check size={12}/>:null}</span><strong>{s}</strong>{o.timeline[s]&&<small>{shortTime(o.timeline[s])} IST</small>}</li>)}</ol>
        {chef&&next&&<button className="btn primary" disabled={!!pending} onClick={()=>advance(o)}>{pending===o.id?'Saving…':({'Preparing':'Start preparing','Out for delivery':'Send out for delivery','Delivered':'Mark delivered'}[next])}</button>}
        {!chef&&history&&providers.some(p=>p.id===o.menuId)&&<button className="btn secondary" onClick={()=>onReorder(o.menuId)}>Order again</button>}
      </article>;
    })}
  </section>;
}
