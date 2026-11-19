export const deliveryStages = ['Placed','Preparing','Out for delivery','Delivered'];
export const deliverySlots = ['12:00','13:00','19:00','20:00'];
export function availableDeliverySlots(menu,now=new Date()){
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
  const slots=[];
  for(let offset=0;offset<14;offset++){
    const day=new Date(Date.parse(today+'T12:00:00Z')+offset*86400000);
    const date=day.toISOString().slice(0,10),weekday=(day.getUTCDay()+6)%7;
    if(menu.mode==='dates' && !menu.dates[date] && !menu.recurring.includes(weekday))continue;
    const dish=(menu.mode==='dates' && menu.dates[date] || menu.week[weekday]).dish;
    for(const slot of deliverySlots){
      if(Date.parse(date+'T'+slot+':00+05:30')>now.getTime())slots.push({date,slot,dish});
    }
  }
  return slots;
}
