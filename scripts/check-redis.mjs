import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createClient} from 'redis';
import {embeddingCache} from './embedding-cache.mjs';
if(!process.env.REDIS_URL)throw new Error('Set REDIS_URL or run this inside the Compose app.');
const probe=createClient({url:process.env.REDIS_URL,socket:{connectTimeout:3000,reconnectStrategy:false}});
probe.on('error',()=>{});
const cache=embeddingCache(),key='ghar:probe:'+randomUUID();
try{
  await probe.connect();await cache.set(key,[0.25,0.75]);
  assert.deepEqual(await cache.get(key),[0.25,0.75]);
  assert.ok((await probe.ttl(key))>0);
  console.log('Redis stored and returned the vector with an active expiry.');
}finally{
  if(probe.isReady){await probe.del(key);await probe.quit();}
  await cache.close();
}
