import { useEffect, useRef, useState } from 'react';

export function kitchenCard(kitchen) {
  const items = kitchen.mode === 'weekly' ? kitchen.week : [...Object.values(kitchen.dates), ...kitchen.recurring.map(i=>kitchen.week[i])];
  return {...kitchen, name:kitchen.menuName ? kitchen.name + ' · ' + kitchen.menuName : kitchen.name, published:true, verified:true, cook:kitchen.name, initials:kitchen.name.slice(0,2).toUpperCase(), cuisine:'Home kitchen', tags:[], rating:0, reviews:0, accent:'var(--pale)', image:items.find(e=>e.photo)?.photo || '/thali.jpg', menu:kitchen.week.map(e=>e.dish)};
}
export function useKitchens(preview) {
  const [catalog,setCatalog] = useState(null);
  const [error,setError] = useState('');
  const [attempt,setAttempt] = useState(0);
  const sequence = useRef(0);
  useEffect(()=>{
    const controller = new AbortController();
    async function load() {
      const ticket = ++sequence.current;
      try {
        const response = await fetch('/api/kitchens',{cache:'no-store',signal:controller.signal});
        if (!response.ok) throw new Error();
        const data = await response.json();
        if (!controller.signal.aborted && ticket === sequence.current) {setCatalog(data); setError('');}
      } catch { if (!controller.signal.aborted && ticket === sequence.current) setError('Published menus could not be loaded.'); }
    }
    load();
    let socket,reconnect;
    function connect(){
      socket=new WebSocket((location.protocol==='https:'?'wss://':'ws://')+location.host+'/meal-events');
      socket.onmessage=load;
      socket.onclose=()=>{if(!controller.signal.aborted)reconnect=setTimeout(connect,3000);};
    }
    if(preview)connect();
    window.addEventListener('focus',load);
    return ()=>{controller.abort();clearTimeout(reconnect);socket?.close();window.removeEventListener('focus',load);};
  },[attempt,preview]);
  async function publish(draft) {
    const response = await fetch('/api/kitchens',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(draft)});
    const result = await response.json();
    if (!response.ok) { if ([404,409].includes(response.status)) setAttempt(n=>n+1); throw new Error(result.error || 'Your menu could not be published.'); }
    ++sequence.current;
    setCatalog(current=>({...current,ownedIds:[...new Set([...current.ownedIds,result.kitchen.id])],kitchens:[result.kitchen,...current.kitchens.filter(k=>k.id!==result.kitchen.id)]}));
    return result.kitchen;
  }
  async function remove(menu) {
    const response = await fetch('/api/kitchens',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:menu.id,revision:menu.revision})});
    const result = await response.json();
    if (!response.ok) {setAttempt(n=>n+1); throw new Error(result.error || 'Could not delete this menu.');}
    ++sequence.current;
    setCatalog(current=>({...current,kitchens:current.kitchens.filter(k=>k.id!==menu.id)}));
  }
  return {catalog,error,publish,remove,retry:()=>setAttempt(n=>n+1)};
}
