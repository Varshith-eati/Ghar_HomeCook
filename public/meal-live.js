try{document.documentElement.dataset.theme=localStorage.getItem('ghar-theme') || (matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light');}catch{}
const connect=()=>{const socket=new WebSocket((location.protocol==='https:'?'wss://':'ws://')+location.host+'/meal-events');
socket.onmessage=()=>{const status=document.getElementById('live');const link=document.createElement('a');link.href='/meal-finder/';link.textContent='View updated menus';status.replaceChildren('A chef updated the catalog. ',link);};};
connect();
