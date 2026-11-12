'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');

test('checkout shows committed order after async event.currentTarget becomes null',async()=>{
 const source=fs.readFileSync('phase2-preview/app.js','utf8');
 const start=source.indexOf('async function checkout(event){');
 const end=source.indexOf('\nasync function lookup(event){',start);
 assert.ok(start>=0 && end>start,'checkout handler found');
 const elements={
  'place-order':{disabled:false,textContent:'Confirm Order'},
  'order-number':{textContent:''},
  'success-total':{textContent:''},
  'send-whatsapp':{href:'',focus(){this.focused=true;}}
 };
 const form={resetCalled:false,reset(){this.resetCalled=true;}};
 const event={currentTarget:form,preventDefault(){}};
 let visible='',persisted=false;
 const storage=new Map();
 const context={
  settingsReady:true,shop:{minOrder:300,shopPhone:'7551858583'},
  cart:[{id:'1',qty:1}],
  cartLines:()=>[{id:'1',qty:1,product:{name_en:'Potato',price:'350',stock:5}}],
  $:id=>elements[id],
  FormData:class {constructor(value){assert.equal(value,form);}[Symbol.iterator](){return [['customerName','Test'],['phone','9876543210'],['address','Test'],['pincode','731224'],['deliverySlot','Tomorrow']][Symbol.iterator]();}},
  api:async()=>{event.currentTarget=null;return {orderNo:'SB-20261112-ABCDEFGH',total:'350.00'};},
  money:n=>'₹'+n,
  wa:msg=>'https://example.test/?text='+encodeURIComponent(msg),
  go:id=>{visible=id;},
  persist:()=>{persisted=true;},
  flash:()=>{throw new Error('Unexpected failed-order banner');},
  refresh:async()=>{},
  localStorage:{setItem:(key,value)=>storage.set(key,value)},
  Date,JSON,console
 };
 vm.createContext(context);
 vm.runInContext(source.slice(start,end),context);
 await vm.runInContext('checkout',context)(event);
 assert.equal(visible,'success');
 assert.equal(elements['order-number'].textContent,'SB-20261112-ABCDEFGH');
 assert.ok(elements['send-whatsapp'].href.includes('SB-20261112-ABCDEFGH'));
 assert.equal(form.resetCalled,true);
 assert.equal(persisted,true);
 assert.equal(context.cart.length,0);
 assert.equal(JSON.parse(storage.get('sokal-bela-pg-last-receipt-v1')).orderNo,'SB-20261112-ABCDEFGH');
});
