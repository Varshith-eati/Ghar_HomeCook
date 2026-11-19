import {availableDeliverySlots,deliveryStages} from '../lib/delivery.mjs';
const orderReply=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
const orderUuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
function publicOrder(row){
  return {id:row.id,menuId:row.menu_id,...JSON.parse(row.details),status:row.status,timeline:JSON.parse(row.timeline)};
}
export async function handleOrders(request,env,user){
  const url=new URL(request.url);
  const view=url.searchParams.get('view') || 'customer';
  if(request.method==='GET'){
    if(!['customer','chef'].includes(view))return orderReply({error:'Choose a valid order view.'},400);
    const field=view==='chef'?'chef_id':'customer_id';
    const {results}=await env.DB.prepare('SELECT * FROM ghar_delivery_orders WHERE '+field+'=? ORDER BY created_at DESC, id').bind(user.id).all();
    return orderReply({orders:results.map(publicOrder)});
  }
  if(!['POST','PATCH'].includes(request.method))return orderReply({error:'Unsupported order operation.'},405);
  if(request.headers.get('origin')!==url.origin)return orderReply({error:'Open Ghar to update an order.'},403);
  if(request.headers.get('content-type')?.split(';')[0]!=='application/json')return orderReply({error:'Expected an order form.'},415);
  const raw=await request.text();
  if(raw.length>3000)return orderReply({error:'Order form too large.'},413);
  let input;
  try{input=JSON.parse(raw);}catch{return orderReply({error:'Invalid order form.'},400);}
  if(!orderUuid.test(input?.id))return orderReply({error:'Check the order reference.'},400);
  const db=env.DB;
  const now=new Date(),stamp=now.toISOString();
  if(request.method==='PATCH'){
    const {results}=await db.prepare('SELECT * FROM ghar_delivery_orders WHERE id=? AND chef_id=?').bind(input.id,user.id).all();
    const row=results[0];
    if(!row)return orderReply({error:'Order unavailable.'},404);
    if(!deliveryStages.includes(input.status) || deliveryStages.indexOf(input.status)!==deliveryStages.indexOf(row.status)+1)return orderReply({error:'Refresh and advance one stage at a time.'},409);
    const timeline={...JSON.parse(row.timeline),[input.status]:stamp};
    const saved=await db.prepare('UPDATE ghar_delivery_orders SET status=?,timeline=? WHERE id=? AND chef_id=? AND status=?').bind(input.status,JSON.stringify(timeline),input.id,user.id,row.status).run();
    return saved.meta.changes===1?orderReply({ok:true}):orderReply({error:'Order changed. Refresh the list.'},409);
  }
  const findOwn=async()=>(await db.prepare('SELECT * FROM ghar_delivery_orders WHERE id=? AND customer_id=?').bind(input.id,user.id).all()).results[0];
  const existing=await findOwn();
  if(existing)return orderReply({order:publicOrder(existing)});
  if(typeof input.menuId!=='string' || !Number.isInteger(input.quantity)||input.quantity<1||input.quantity>10||
    typeof input.address!=='string'||input.address.trim().length<8||input.address.length>160)return orderReply({error:'Enter a delivery address and choose 1–10 portions.'},400);
  const {results}=await db.prepare('SELECT settings,revision,COALESCE(chef_id,owner_id) AS chef FROM ghar_kitchens WHERE kitchen_id=? AND deleted=0').bind(input.menuId).all();
  if(!results.length)return orderReply({error:'This menu is no longer available.'},404);
  const menu=JSON.parse(results[0].settings);
  if(input.revision!==results[0].revision)return orderReply({error:'This menu changed. Reopen it to review the current price and dishes.'},409);
  const selected=availableDeliverySlots(menu,now).find(s=>s.date===input.date && s.slot===input.slot);
  if(!selected||!menu.areas.includes(input.area))return orderReply({error:'Choose an available delivery slot and service area.'},400);
  const details={restaurant:menu.name,menu:menu.menuName||'House menu',dish:selected.dish,date:selected.date,slot:selected.slot,area:input.area,address:input.address.trim(),quantity:input.quantity,total:menu.price*input.quantity};
  const saved=await db.prepare("INSERT INTO ghar_delivery_orders (id,customer_id,chef_id,menu_id,details,status,timeline,created_at) SELECT ?,?,?,?,?, 'Placed',?,? FROM ghar_kitchens WHERE kitchen_id=? AND revision=? AND deleted=0 ON CONFLICT(id) DO NOTHING").bind(input.id,user.id,results[0].chef,input.menuId,JSON.stringify(details),JSON.stringify({Placed:stamp}),stamp,input.menuId,input.revision).run();
  const row=await findOwn();
  if(!row)return orderReply({error:'Order could not be placed. Reopen the menu and try again.'},409);
  return orderReply({order:publicOrder(row)},saved.meta.changes?201:200);
}
