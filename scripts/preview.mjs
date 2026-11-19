import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(fileURLToPath(new URL('../out/',import.meta.url)));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon','.woff2':'font/woff2','.txt':'text/plain; charset=utf-8'};
import {WebSocketServer,WebSocket} from 'ws';
import {createPreviewAccount} from './preview-account.mjs';
import {createFinder} from './meal-finder.mjs';
import {createMealSearchLimit} from './request-limits.mjs';
export function createServer({origin,folder,client,cache,gateway,searchLimit}){
  const events=new WebSocketServer({noServer:true,maxPayload:1024});
  const account=createPreviewAccount({folder,onMenuChange(){
    for(const socket of events.clients) {
      if(!account.sessionFor(socket.request)) socket.close(1008);
      else if(socket.readyState===WebSocket.OPEN) socket.send(JSON.stringify({type:'menus_changed'}));
    }
  }});
  const finder=createFinder({account,client,cache,gateway});
  const limitMealSearch=createMealSearchLimit(searchLimit);
  const server=http.createServer(async(req,res)=>{
    let releaseSearch;
    try {
      releaseSearch=limitMealSearch(req,res,account);
      if(releaseSearch===true)return;
      if(await finder(req,res,origin) || await account(req,res,origin))return;
      const url=new URL(req.url,origin);
      let file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
      if(file!==root && !file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
      try{if((await stat(file)).isDirectory())file=path.join(file,'index.html');}
      catch{res.writeHead(404);res.end('Page unavailable');return;}
      const data=await readFile(file);
      res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(data);
    }catch{if(!res.headersSent)res.writeHead(500);res.end('Ghar could not complete this request.');}
    finally{if(typeof releaseSearch==='function')releaseSearch();}
  });
  server.on('upgrade',(req,socket,head)=>{
    if(req.url!=='/meal-events' || req.headers.origin!==origin || !account.sessionFor(req)){socket.destroy();return;}
    events.handleUpgrade(req,socket,head,ws=>{ws.request=req;ws.on('error',()=>{});});
  });
  server.on('close',()=>{events.close();account.close();});
  return server;
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const port=Number(process.env.PORT||3000),origin=process.env.GHAR_ORIGIN || 'http://127.0.0.1:'+port;
  createServer({origin}).listen(port,process.env.HOST || '127.0.0.1',()=>console.log('Ghar preview: '+origin));
}
