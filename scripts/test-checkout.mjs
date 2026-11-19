import Stripe from 'stripe';
import {createHash} from 'node:crypto';
import {quote} from '../lib/domain.mjs';
const owner = token => createHash('sha256').update(token).digest('hex');
export function stripeGateway(key=process.env.STRIPE_SECRET_KEY) {
  return key?.startsWith('sk_test_') ? new Stripe(key) : null;
}
export async function openCheckout(gateway,{menu,days,origin,token,requestId}) {
  const total = quote(menu.price,days,'lunch',menu);
  if (!total) throw new Error('This plan is free.');
  const result = await gateway.checkout.sessions.create({
    mode:'payment',payment_method_types:['card'],client_reference_id:owner(token),
    metadata:{menu_id:menu.id,days:String(days)},
    line_items:[{quantity:1,price_data:{currency:'inr',unit_amount:total*100,
      product_data:{name:(menu.menuName ? menu.name+' · '+menu.menuName : menu.name)+' · '+days+' lunches'}}}],
    success_url:origin+'/meal-finder/receipt?session_id={CHECKOUT_SESSION_ID}',
    cancel_url:origin+'/meal-finder/?cancelled=1'
  },{idempotencyKey:owner(token)+':'+requestId});
  if(result.livemode!==false || !result.url) throw new Error('Test checkout unavailable.');
  return result.url;
}
export async function paidReceipt(gateway,id,token) {
  if(!/^cs_test_[a-zA-Z0-9_]+$/.test(id||'')) return null;
  const session=await gateway.checkout.sessions.retrieve(id);
  if(session.livemode!==false || session.client_reference_id!==owner(token) ||
    session.payment_status!=='paid' || session.currency!=='inr' || !Number.isSafeInteger(session.amount_total)) return null;
  return {total:session.amount_total/100,days:session.metadata.days};
}
