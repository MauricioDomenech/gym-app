import assert from 'node:assert/strict';
import test from 'node:test';
import { createWeightHandler, createWeightStore } from '../dist/api/weight.js';
import { validWeightDate, validWeight } from '../dist/src/components/weight/weightRecord.js';
const date = '2026-01-15';
const owner = '00000000-0000-4000-8000-000000000001';
const call = async (handler, method, body, query={date}) => {
  const res = {code:200,status(c){this.code=c;return this;},json(b){this.body=b;return this;},setHeader(){}};
  await handler({method,body,query,headers:{}},res);return res;
};
test('validación rechaza fechas imposibles/futuras, NaN, cero y precisión no soportada',()=>{
  for(const d of ['2026-02-30','2026-99-99','2999-01-01','abc','2026-1-01']) assert.equal(validWeightDate(d),false);
  for(const kg of [0,-1,NaN,Infinity,501,82.123,'82']) assert.equal(validWeight(kg),false);
  assert.equal(validWeight(82.55),true);
});
test('API requiere identidad y no permite dueño ni campos inyectados',async()=>{
  let writes=0;const store={read:async()=>null,write:async()=>{writes++;}};
  assert.equal((await call(createWeightHandler(store,async()=>null),'PUT',{date,kg:82})).code,401);
  const handler=createWeightHandler(store,async()=>owner);
  for(const body of [{date,kg:0},{date:'2026-99-99',kg:82},{date,kg:82,owner_id:'other'},null]) assert.equal((await call(handler,'PUT',body)).code,400);
  assert.equal(writes,0);
  assert.equal((await call(handler,'DELETE')).code,405);
});
test('guardar, recargar y actualizar un día conservan un único registro',async()=>{
  const rows=new Map();const store={read:async(o,d)=>rows.get(o+d)??null,write:async(o,r)=>{rows.set(o+r.date,r);return r;}};
  const handler=createWeightHandler(store,async()=>owner);
  assert.deepEqual((await call(handler,'GET')).body,{record:null});
  for(const kg of [82.5,82.5,82.4]) assert.equal((await call(handler,'PUT',{date,kg})).code,200);
  assert.equal(rows.size,1);
  assert.deepEqual((await call(handler,'GET')).body,{record:{date,kg:82.4}});
});
test('no anuncia guardado cuando falta almacenamiento, hay error o confirmación distinta',async()=>{
  for(const store of [null,{write:async()=>{throw Error('secret');}},{write:async()=>null},{write:async()=>({date,kg:99})}]) {
    const response=await call(createWeightHandler(store,async()=>owner),'PUT',{date,kg:82});
    assert.equal(response.code,503);assert.ok(!JSON.stringify(response.body).includes('secret'));
  }
});
test('PostgREST usa filtro de propietario y upsert atómico por propietario y fecha',async()=>{
  let row;const store=createWeightStore('https://synthetic.test','fake',async(input,init)=>{
    const url=new URL(input);
    if(init.method==='POST'){
      assert.equal(url.searchParams.get('on_conflict'),'owner_id,date');
      assert.equal(init.headers.Prefer,'resolution=merge-duplicates,return=representation');
      const b=JSON.parse(init.body);assert.equal(b.owner_id,owner);row={date:b.date,kg:b.kg};
    } else {assert.equal(url.searchParams.get('owner_id'),`eq.${owner}`);assert.equal(url.searchParams.get('date'),`eq.${date}`);}
    return Response.json(row?[row]:[]);
  });
  assert.equal(await store.read(owner,date),null);
  assert.deepEqual(await store.write(owner,{date,kg:82}),{date,kg:82});
  assert.deepEqual(await store.read(owner,date),{date,kg:82});
  const bad=createWeightStore('https://synthetic.test','fake',async()=>Response.json([]));
  await assert.rejects(bad.write(owner,{date,kg:82}));
});
