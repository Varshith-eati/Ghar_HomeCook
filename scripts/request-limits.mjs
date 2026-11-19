// Protect local model capacity per signed-in session. The limits reset on restart.
export function createMealSearchLimit({limit=6,windowMs=60000,now=Date.now}={}) {
  const sessions=new Map();
  return function limitMealSearch(req,res,account) {
    const path=new URL(req.url,'http://localhost').pathname;
    if(req.method!=='POST' || path!=='/meal-finder/')return false;
    const token=account.sessionFor(req);
    if(!token)return false;
    const time=now();
    for(const [key,entry] of sessions) {
      if(!entry.active && entry.until<=time)sessions.delete(key);
    }
    const entry=sessions.get(token) || {count:0,until:time+windowMs,active:false};
    if(entry.until<=time){entry.count=0;entry.until=time+windowMs;}
    if(entry.active || entry.count>=limit) {
      const retry=entry.active?5:Math.max(1,Math.ceil((entry.until-time)/1000));
      req.resume();
      res.writeHead(429,{'Content-Type':'text/html; charset=utf-8','Retry-After':String(retry),'Cache-Control':'no-store'});
      res.end('<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Please wait | Ghar</title><link rel="stylesheet" href="/meal-finder.css"><main><h1>Please wait a moment</h1><p>'+ (entry.active?'Your previous meal search is still running.':'You have made several meal searches. Try again in '+retry+' seconds.') +'</p><a href="/meal-finder/">Back to meal finder</a></main></html>');
      return true;
    }
    entry.count++;
    entry.active=true;
    sessions.set(token,entry);
    // The server releases this slot in finally, including after disconnects/errors.
    return ()=>{entry.active=false;};
  };
}
