import {createClient} from 'redis';
export function embeddingCache() {
  if(!process.env.REDIS_URL) return undefined;
  const redis=createClient({url:process.env.REDIS_URL,socket:{connectTimeout:1500,reconnectStrategy:false}});
  redis.on('error',()=>{});
  let pending;
  async function ready(){
    if(redis.isReady)return;
    if(!pending) pending=redis.connect().finally(()=>{pending=null;});
    await pending;
  }
  return {
    async get(key){try{await ready();const raw=await redis.get(key);return raw?JSON.parse(raw):null;}catch{return null;}},
    async set(key,vector){try{await ready();await redis.set(key,JSON.stringify(vector),{EX:86400});}catch{}},
    async close(){if(redis.isOpen) await redis.quit();}
  };
}
