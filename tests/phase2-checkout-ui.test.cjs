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

test('bulk and catering submit control exists and enquiry returns a confirmation',async()=>{
 const html=fs.readFileSync('phase2-preview/index.html','utf8');
 const requestForm=html.slice(html.indexOf('<form id="request-form"'),html.indexOf('</form>',html.indexOf('<form id="request-form"'))+7);
 assert.ok(requestForm,'request form exists');
 assert.match(requestForm,/<button[^>]*type="submit"[^>]*>Send enquiry/);
 const source=fs.readFileSync('phase2-preview/app.js','utf8');
 const start=source.indexOf('async function enquiry(event){');
 const end=source.indexOf('async function refresh(){',start);
 assert.ok(start>=0&&end>start);
 for(const type of ['bulk','catering']){
  const button={disabled:false};
  const form={querySelector:selector=>selector==='button[type=submit]'?button:null,reset(){this.didReset=true;}};
  const elements={'request-result':{innerHTML:''}};
  const context={
   settingsReady:true,
   FormData:class{constructor(x){assert.equal(x,form);}[Symbol.iterator](){return [['type',type],['contactName','Test Shop'],['phone','9876543210'],['address','Rampurhat'],['eventDate',''],['guestCount',''],['notes','Test request'],['website','']][Symbol.iterator]();}},
   $:id=>elements[id],
   api:async(path,options)=>{assert.equal(path,'/requests');assert.equal(options.method,'POST');assert.equal(JSON.parse(options.body).type,type);return {requestId:'42'};},
   wa:message=>'https://example.test/?text='+encodeURIComponent(message),
   escapeHtml:s=>s,
   flash:message=>{throw Error('Unexpected error: '+message)}
  };
  vm.createContext(context);
  vm.runInContext(source.slice(start,end),context);
  await vm.runInContext('enquiry',context)({currentTarget:form,preventDefault(){}});
  assert.equal(button.disabled,false);
  assert.equal(form.didReset,true);
  assert.match(elements['request-result'].innerHTML,/Request saved/);
  assert.match(elements['request-result'].innerHTML,/Send on WhatsApp/);
 }
});
