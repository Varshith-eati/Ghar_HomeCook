import {readFile} from 'node:fs/promises';
import {planMeal,ollamaClient} from '../lib/meal-agent.mjs';
import {initialProviders} from '../lib/data.mjs';
import {embeddingCache} from './embedding-cache.mjs';
const cases=JSON.parse(await readFile(new URL('../tests/meal-cases.json',import.meta.url),'utf8'));
const client=ollamaClient(),cache=embeddingCache() || new Map();
let passed=0,hits=0,choices=0;
for(const sample of cases){
  try{
    const result=await planMeal(sample,initialProviders.filter(m=>m.verified),client,cache);
    const hit=sample.expected && result.retrieved?.includes(sample.expected);
    if(hit)hits++;
    const ok=(result.choice?.id??null)===sample.expected && (result.total??null)===sample.total &&
      (sample.expected?hit && result.steps.join(',')==='search_menus,quote_menu':result.steps.length===0);
    if(ok)passed++;
    console.log(ok?'PASS':'FAIL',sample.query,'=>',result.choice?.id??'none',result.total??'',result.tokens+' tokens');
  }catch(e){console.error('ERROR',sample.query,e.message);}
  if(sample.expected)choices++;
}
await cache.close?.();
console.log('Passed '+passed+'/'+cases.length+' cases. Retrieval hit@3 '+hits+'/'+choices+'.');
if(passed!==cases.length)process.exitCode=1;
