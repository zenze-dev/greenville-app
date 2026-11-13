"use strict";
/* ---------- fixed facts ---------- */
const BANK={bank:"ธนาคารกรุงเทพ",name:"ห้างหุ้นส่วนสามัญ งามเจริญ กรีนวิลล์",no:"037-8-03938-2"};
const bankInfo=()=>({bank:S.settings.bank||BANK.bank,name:S.settings.bankName||BANK.name,no:S.settings.bankNo||BANK.no});
const DEF={rentNormal:1800,rentAir:2000,depNormal:2000,depAir:3000,depAirUpgrade:1000,keyFee:100,waterRate:15,elecRate:5.5,threshold:15};
const TM=["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
const TMF=["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];

const ROOMS=(()=>{const r=[];const p=(b,f,n)=>b+f+String(n).padStart(2,"0");
  r.push({id:"ASUP",b:"A",f:1,label:"ซุปเปอร์",sub:"A102+A104",sup:true});
  r.push({id:"A103",b:"A",f:1,label:"A103"});
  for(let n=5;n<=15;n++){const id=p("A",1,n);r.push({id,b:"A",f:1,label:id})}
  for(let f=2;f<=4;f++)for(let n=1;n<=15;n++){const id=p("A",f,n);r.push({id,b:"A",f,label:id})}
  for(let n=1;n<=14;n++){const id=p("B",1,n);r.push({id,b:"B",f:1,label:id})}
  for(let f=2;f<=3;f++)for(let n=1;n<=16;n++){const id=p("B",f,n);r.push({id,b:"B",f,label:id})}
  return r})();
const RBY=Object.fromEntries(ROOMS.map(r=>[r.id,r]));
const FLOORS={A:[1,2,3,4],B:[1,2,3]};

/* ---------- helpers ---------- */
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmt=n=>(Math.round(n*100)/100).toLocaleString("en-US");
const numv=v=>v===""||v==null||isNaN(+v)?null:+v;
function todayISO(){const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")}
const mKey=iso=>iso.slice(0,7);
const isPast=()=>S.month<mKey(todayISO());
function addMonth(k,d){let[y,m]=k.split("-").map(Number);m+=d;while(m>12){m-=12;y++}while(m<1){m+=12;y--}return y+"-"+String(m).padStart(2,"0")}
function mLabel(k){const[y,m]=k.split("-").map(Number);return TM[m-1]+" "+String(y+543).slice(2)}
function mLabelFull(k){const[y,m]=k.split("-").map(Number);return TMF[m-1]+" "+(y+543)}
function dLabel(iso){if(!iso)return"";const[y,m,d]=iso.split("-").map(Number);return d+" "+TM[m-1]+" "+String(y+543).slice(2)}
/* ปัดหลักสิบ: ลงท้าย 5 ขึ้นไปปัดขึ้น ต่ำกว่าปัดลง */
function round10(x){x=Math.round(x*100)/100;return Math.floor((x+5)/10)*10}
function bahtText(n){n=Math.round(n*100)/100;if(n<0)return"ลบ"+bahtText(-n);const baht=Math.floor(n),sat=Math.round((n-baht)*100);
  const D=["ศูนย์","หนึ่ง","สอง","สาม","สี่","ห้า","หก","เจ็ด","แปด","เก้า"],P=["","สิบ","ร้อย","พัน","หมื่น","แสน"];
  const grp=x=>{let s="";const t=String(x),L=t.length;for(let i=0;i<L;i++){const d=+t[i],pos=L-i-1;if(!d)continue;
    if(pos===0&&d===1&&L>1)s+="เอ็ด";else if(pos===1&&d===2)s+="ยี่";else if(pos===1&&d===1)s+="";else s+=D[d];s+=P[pos]}return s};
  const full=x=>{if(x===0)return"ศูนย์";let s="";const mil=Math.floor(x/1e6),rest=x%1e6;if(mil)s+=full(mil)+"ล้าน";if(rest)s+=grp(rest);return s};
  return full(baht)+"บาท"+(sat?full(sat)+"สตางค์":"ถ้วน")}
/* กติกาค่าปรับจ่ายช้า ตั้งได้รายเดือน (ไม่ตั้ง = ใช้ค่าตั้งต้น) */
const LATE_DEF={lateDay1:8,lateDay2:15,lateFee1:100,lateFee2:200};
function lateRule(month){const m=S.months[month]||{},st=S.settings||{},o={};for(const k in LATE_DEF){const v=m[k]??st[k];o[k]=v==null||v===""||isNaN(+v)?LATE_DEF[k]:+v}return o}
function lateText(month){const r=lateRule(month);return `1–${r.lateDay1} ไม่ปรับ, ${r.lateDay1+1}–${r.lateDay2} ปรับ ${fmt(r.lateFee1)}, ${r.lateDay2+1} ขึ้นไป ปรับ ${fmt(r.lateFee2)}`}
function lateFee(month,payISO){if(!payISO)return 0;const pm=mKey(payISO);if(pm<month)return 0;const r=lateRule(month);if(pm>month)return r.lateFee2;const d=+payISO.slice(8,10);return d<=r.lateDay1?0:d<=r.lateDay2?r.lateFee1:r.lateFee2}

/* ---------- state ---------- */
const store=(k,v)=>{try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v)}catch(e){return null}};
const S={month:mKey(todayISO()),settings:{...DEF},months:{},rooms:{},bills:{},db:null,dl:true,canWrite:true,
  loaded:{rooms:false,bills:false,settings:false},qEdit:new Set(),qSaving:new Set(),pending:0,warnOpen:!!store("gv_warn"),showPrev:new Set(),timeout:false,offline:false,
  view:"home",bld:store("gv_bld")||"A",floor:+(store("gv_floor")||1),payOpen:null,payBld:"A",invBld:"ALL",ovBld:"A",rmMode:null,
  hist:null,histOpen:null,confirmUnpay:null};
let unsubBills=null;

function roomInfo(id){const d=S.rooms[id]||{};return{tenant:"",phone:"",moveIn:"",aircon:false,vacant:false,deposit:null,tenantKey:"k-"+id,...d}}
function billId(m,r){return m+"_"+r}
function bill(r,m=S.month){return S.bills[billId(m,r)]||null}
function rates(m){const md=S.months[m];return{waterRate:md?.waterRate??S.settings.waterRate,elecRate:md?.elecRate??S.settings.elecRate}}
/* get(m,room) -> bill for lookups (current map or a history map) */
const getLive=(m,r)=>S.bills[billId(m,r)]||null;
/* ยกไปบิลเดือนหน้า (เฉพาะผู้เช่าคนเดิม): ส่วนที่จ่ายไม่ครบ/จ่ายเกิน + ค่าปรับจ่ายช้าของเดือนก่อน */
const r2=x=>Math.round(x*100)/100;
function carryParts(b,get=getLive){if(b.paid!=null&&b.carry!=null){const fee=+b.carryFee||0;return{due:r2(b.carry-fee),fee}}
  const p=get(addMonth(b.month,-1),b.room);
  if(p&&p.paid!=null&&p.tenantKey===b.tenantKey&&p.expected!=null)return{due:r2(p.expected-p.paid),fee:+p.lateFee||0};return{due:0,fee:0}}
function carryOf(b,get=getLive){const c=carryParts(b,get);return r2(c.due+c.fee)}
function calc(b,get=getLive){
  const r=b.wRate!=null?{waterRate:b.wRate,elecRate:b.eRate}:rates(b.month);
  const sup=RBY[b.room]?.sup;
  const wu=(b.wCur-b.wPrev)+(sup?((b.w2Cur??0)-(b.w2Prev??0)):0);
  const eu=b.eCur-b.ePrev;
  const wc=sup?round10((b.wCur-b.wPrev)*r.waterRate)+round10(((b.w2Cur??0)-(b.w2Prev??0))*r.waterRate):round10(wu*r.waterRate),ec=round10(eu*r.elecRate);
  const cp=carryParts(b,get);const carry=r2(cp.due+cp.fee);const extra=+b.extra||0;
  const total=b.rent+wc+ec+carry+extra;
  return{wu,eu,wc,ec,carry,carryDue:cp.due,carryFee:cp.fee,extra,total,r}}
function anomaly(b,get=getLive){const p=get(addMonth(b.month,-1),b.room);if(!p||p.tenantKey!==b.tenantKey)return[];
  const a=calc(b,get),q=calc(p,get),th=S.settings.threshold,out=[];
  [["น้ำ",a.wu,q.wu],["ไฟ",a.eu,q.eu]].forEach(([k,c,o])=>{if(o>0){const pct=(c-o)/o*100;if(Math.abs(pct)>th)out.push({k,c,o,pct})}});return out}

/* ---------- data ---------- */
/* ---------- Google Apps Script data layer ---------- */
const API={call(fn,...args){return new Promise((res,rej)=>{if(!(window.google&&google.script&&google.script.run)){rej(new Error("NO_GAS"));return}
  google.script.run.withSuccessHandler(res).withFailureHandler(e=>rej(e instanceof Error?e:new Error(String(e&&e.message||e))))[fn](...args)})}};
function localSet(c,id,d,merge){
  if(c==="config")S.settings={...DEF,...(merge?S.settings:{}),...d};
  else if(c==="months")S.months[id]=merge?{...S.months[id],...d}:d;
  else if(c==="rooms")S.rooms[id]=merge?{...S.rooms[id],...d}:d;
  else if(c==="bills"){const m=merge?{...S.bills[id],...d}:d;if([addMonth(S.month,-1),S.month].includes(m.month))S.bills[id]=m}}
const DBA={doc(p){const[c,id]=p.split("/");return{
    set:async d=>{await API.call("setDoc",S.pin,c,id,JSON.stringify(d));localSet(c,id,d,false)},
    update:async d=>{await API.call("updateDoc",S.pin,c,id,JSON.stringify(d));localSet(c,id,d,true)}}},
  collection(c){return{where(f,op,v){return{get:async()=>{const r=JSON.parse(await API.call("queryBills",S.pin,v));return{docs:r.map(x=>({data:()=>x}))}}}}}}};
let refSeq=0;
async function refresh(){if(S.pending>0)return;const seq=++refSeq;
  try{const r=JSON.parse(await API.call("getState",S.pin,JSON.stringify([addMonth(S.month,-1),S.month])));
    if(seq!==refSeq)return;
    if(r.error==="pin"){S.needPin=true;S.offline=false;render();return}
    S.needPin=false;S.offline=false;S.timeout=false;S.ready=true;
    S.settings={...DEF,...r.config};S.months=r.months||{};S.rooms=r.rooms||{};S.bills=r.bills||{};render()}
  catch(e){if(seq===refSeq){S.offline=true;render()}}}
async function boot(){S.db=DBA;S.pin=store("gv_pin")||"";render();
  const to=setTimeout(()=>{if(!S.ready){S.timeout=true;render()}},10000);
  await refresh();clearTimeout(to);
  setInterval(()=>{if(document.visibilityState==="visible")refresh()},60000);
  document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")refresh()})}
function subBills(){S.bills={};refresh()}
async function write(fn,okMsg){
  try{await fn();render();if(okMsg)toast(okMsg);return true}
  catch(e){if(String(e&&e.message).includes("BAD_PIN")){S.needPin=true;render();toast("รหัสไม่ถูกต้อง")}
    else toast("บันทึกไม่สำเร็จ ตรวจอินเทอร์เน็ตแล้วลองอีกครั้ง");return false}}
async function ensureMonth(m){if(!S.months[m]){const r={waterRate:S.settings.waterRate,elecRate:S.settings.elecRate,...lateRule(m)};S.months[m]=r;await S.db.doc("months/"+m).set(r)}}

/* ---------- ui utilities ---------- */
let toastT;function toast(msg){let t=$(".toast");if(!t){t=document.createElement("div");t.className="toast";t.setAttribute("role","status");document.body.appendChild(t)}
  t.textContent=msg;t.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>t.hidden=true,3500)}
function busy(msg){let b=$(".busy:not(.dlbox)");if(msg==null){b&&b.remove();return}if(!b){b=document.createElement("div");b.className="busy";b.innerHTML="<div></div>";document.body.appendChild(b)}b.firstChild.textContent=msg}
const seg=(name,opts,cur)=>`<div class="seg" role="group">${opts.map(([v,l])=>`<button data-act="seg" data-k="${name}" data-v="${v}" aria-pressed="${String(v)===String(cur)}">${l}</button>`).join("")}</div>`;
const backBtn=()=>"";
const occupied=b=>ROOMS.filter(r=>(b==="ALL"||r.b===b)&&!roomInfo(r.id).vacant);

/* ---------- render ---------- */
function render(){
  if(S.needPin){$("#app").innerHTML=`<div style="max-width:380px;margin:12vh auto 0;text-align:center"><h1 style="font-size:1.5rem">งามเจริญ กรีนวิลล์</h1><p class="lead">ใส่รหัสเข้าใช้งาน (ใส่ครั้งเดียว เครื่องนี้จะจำไว้)</p>
    <input type="password" inputmode="numeric" id="pin-in" style="text-align:center;font-size:1.6rem;letter-spacing:.3em;margin-bottom:12px" autocomplete="off"><button class="btn big" data-act="pin">เข้าใช้งาน</button></div>`;return}
  const app=$("#app");const keep={};let focusId=document.activeElement?.id;
  app.querySelectorAll("[data-keep]").forEach(i=>{if(i.dataset.dirty)keep[i.id]=i.value});
  const v=S.view;let body="";
  if(v==="home")body=vHome();else if(v==="meter")body=vMeter();else if(v==="bills")body=vBills();else if(v==="pay")body=vPay();
  else if(v==="overview")body=vOverview();else if(v==="rooms")body=vRooms();else if(v.startsWith("room-"))body=vRoom(v.slice(5));else if(v==="rates")body=vRates();else if(v==="report")body=vReport();else body=vHome();
  let ban="";
  if(S.offline)ban=`<div class="banner bad">เชื่อมต่อข้อมูลไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองเปิดใหม่</div>`;
  else if(S.timeout)ban=`<div class="banner warn">กำลังโหลดข้อมูล… ถ้านานเกินไป ให้ตรวจอินเทอร์เน็ต</div>`;
  else if(!S.canWrite)ban=`<div class="banner warn">บัญชีนี้ดูข้อมูลได้อย่างเดียว ขอสิทธิ์แก้ไขจากเจ้าของก่อนจึงจะบันทึกได้</div>`;
  app.innerHTML=`${v==="home"?"":`<nav class="topnav" aria-label="กลับ"><button class="homebtn" data-act="go" data-v="home"><span aria-hidden="true">🏠</span> กลับหน้าแรก</button>${v.startsWith("room-")?`<button class="roomsbtn" data-act="go" data-v="rooms">← ห้องทั้งหมด</button>`:""}</nav>`}<header class="top"><div class="brand"><h1>งามเจริญ กรีนวิลล์</h1><small>ระบบค่าเช่าห้อง</small></div>
    ${v==="rooms"||v.startsWith("room-")||v==="report"?"":`<div class="monthbar" aria-label="เลือกเดือน"><button data-act="month" data-v="-1" aria-label="เดือนก่อน">‹</button>
    <button class="ml" data-act="pick" aria-expanded="${!!S.pick}">${mLabelFull(S.month)}<span>${S.month===mKey(todayISO())?"เดือนปัจจุบัน":"แตะเพื่อเลือกเดือน"} ▾</span></button><button data-act="month" data-v="1" aria-label="เดือนถัดไป">›</button></div>`}</header>${S.pick&&!(v==="rooms"||v.startsWith("room-")||v==="report")?pickHTML():""}${ban}${body}`;
  for(const id in keep){const el=document.getElementById(id);if(el){el.value=keep[id];el.dataset.dirty="1"}}
  document.querySelectorAll(".card[data-room],.mr[data-room]").forEach(c=>updatePreview(c.dataset.room));
  if(focusId){const el=document.getElementById(focusId);if(el&&el.matches("input,select")){el.focus()}}
}

function pickHTML(){const y=S.pickYear;const cur=mKey(todayISO());
  return `<div class="picker" role="dialog" aria-label="เลือกเดือนและปี"><div class="pyear"><button data-act="pickYear" data-v="-1" aria-label="ปีก่อน">‹</button><b>ปี ${y+543}</b><button data-act="pickYear" data-v="1" aria-label="ปีถัดไป">›</button></div>
  <div class="pgrid">${TMF.map((n,i)=>{const k=y+"-"+String(i+1).padStart(2,"0");return `<button data-act="pickMonth" data-v="${k}" class="${k===S.month?"sel":""} ${k===cur?"now":""}">${n}</button>`}).join("")}</div>
  <div class="actions" style="margin-top:10px"><button class="btn ghost" data-act="pickMonth" data-v="${cur}">กลับไปเดือนปัจจุบัน</button><button class="btn ghost" data-act="pick">ปิด</button></div></div>`}
function owed(id){const cur=bill(id,mKey(todayISO()))||bill(id,addMonth(mKey(todayISO()),-1));if(!cur)return null;const t=roomInfo(id).tenantKey;if(cur.tenantKey!==t)return null;
  if(cur.paid==null)return{amt:calc(cur).total,txt:`ยังไม่จ่ายบิลเดือน ${mLabel(cur.month)}`};const o=r2(cur.expected-cur.paid+(+cur.lateFee||0));return o>0?{amt:o,txt:`ค้างจากบิลเดือน ${mLabel(cur.month)} (รวมค่าปรับ)`}:null}
function owedHTML(id){const o=owed(id);return o?`<div class="banner warn">${o.txt} ${fmt(o.amt)} บาท · ยอดนี้จะไม่ยกไปให้ผู้เช่าคนใหม่ ให้หักจากมัดจำหรือเก็บก่อนย้ายออก</div>`:""}
function vHome(){
  const occ=occupied("ALL");const bs=occ.map(r=>bill(r.id)).filter(Boolean);
  const paid=bs.filter(b=>b.paid!=null);const got=paid.reduce((s,b)=>s+b.paid,0);
  const due=bs.reduce((s,b)=>s+calc(b).total,0);
  const warns=[];bs.forEach(b=>anomaly(b).forEach(a=>warns.push({b,a})));
  const pm=addMonth(S.month,-1);const prevUnpaid=occ.filter(r=>{const p=bill(r.id,pm);return p&&p.paid==null&&p.tenantKey===roomInfo(r.id).tenantKey});
  const tiles=[["meter","1","จดเลขมิเตอร์","กรอกเลขน้ำ-ไฟ ทีละชั้น ระบบคิดเงินให้"],["bills","2","พิมพ์ใบแจ้งค่าเช่า","6 ห้องต่อกระดาษ A4 ตัดแปะหน้าห้อง"],
    ["overview","3","บันทึกวันจ่าย","พิมพ์ใบไปจด แล้วกรอกวันที่จ่ายเข้าระบบ"],["pay","4","รับเงิน / ใบเสร็จ","บันทึกการจ่ายเงิน ทำใบเสร็จพร้อมต้นขั้ว"]];
  const tiles2=[["rooms","ห","ห้องและผู้เช่า","ชื่อผู้เช่า ห้องแอร์ ย้ายเข้า-ออก ดูประวัติ"],["report","ร","รายงานหน่วยน้ำ-ไฟ","หน่วยที่ใช้ทุกห้อง ทุกเดือน พร้อมยอดรวม พิมพ์ได้"],["rates","฿","ตั้งค่าราคา","ค่าน้ำ ค่าไฟ ค่าเช่า และเกณฑ์แจ้งเตือน"]];
  const t=(a,alt)=>`<button class="tile" data-act="go" data-v="${a[0]}"><span class="n ${alt?"alt":""}">${a[1]}</span><span><h3>${a[2]}</h3><p>${a[3]}</p></span></button>`;
  return `<div class="stats">
    <div class="stat"><b>${bs.length}/${occ.length}</b><span>ห้องที่จดมิเตอร์แล้ว</span></div>
    <div class="stat"><b>${paid.length}/${occ.length}</b><span>ห้องที่จ่ายแล้ว</span></div>
    <div class="stat"><b class="num">${fmt(got)}</b><span>รับเงินแล้ว (บาท)</span></div>
    <div class="stat"><b class="num">${fmt(due)}</b><span>ยอดบิลทั้งหมด (บาท)</span></div></div>
    ${prevUnpaid.length?`<div class="banner warn">ยังไม่ได้บันทึกการจ่ายบิลเดือน ${mLabel(pm)} ${prevUnpaid.length} ห้อง: ${prevUnpaid.slice(0,15).map(r=>r.label).join(", ")}${prevUnpaid.length>15?" …":""} (ยอดจะยังไม่ยกมาเดือนนี้จนกว่าจะบันทึก)</div>`:""}
    ${warns.length?`<div class="sect" style="margin-top:0;margin-bottom:18px"><button class="warnhead" data-act="warnToggle" aria-expanded="${!!S.warnOpen}"><span>⚠ ค่าน้ำ-ไฟผิดปกติ ${new Set(warns.map(w=>w.b.room)).size} ห้อง</span><span>${S.warnOpen?"ย่อ ▲":"ดูรายการ ▼"}</span></button><div class="warnlist" ${S.warnOpen?"":"hidden"}>${warns.map(w=>
      `<button class="warnitem" data-act="go" data-v="room-${w.b.room}"><span>${RBY[w.b.room].label}: ${w.a.k}ใช้ ${fmt(w.a.c)} หน่วย (เดือนก่อน ${fmt(w.a.o)})</span><span>${w.a.pct>0?"เพิ่ม":"ลด"} ${Math.abs(w.a.pct).toFixed(0)}% ›</span></button>`).join("")}</div></div>`:""}
    <h2 style="font-size:1.15rem;margin-bottom:10px">งานประจำเดือน ทำตามลำดับ</h2>
    <div class="tiles">${tiles.map(a=>t(a)).join("")}</div>
    <div class="sect"><h2>ข้อมูลห้อง</h2><div class="tiles">${tiles2.map(a=>t(a,true)).join("")}</div></div>`;
}

/* meter */
function vMeter(){
  const rs=ROOMS.filter(r=>r.b===S.bld);const rt=rates(S.month);
  const occ=rs.filter(r=>!roomInfo(r.id).vacant||bill(r.id));const done=occ.filter(r=>bill(r.id)).length;
  return `${backBtn()}<h2 class="vtitle">จดเลขมิเตอร์</h2>${isPast()?`<div class="banner warn">🔒 ${mLabelFull(S.month)} เป็นเดือนที่ผ่านมาแล้ว ดูได้อย่างเดียว แก้ไขไม่ได้</div>`:""}
  <p class="lead">กรอกเลข <b>"หลัง"</b> ที่จดมาให้ครบทั้งตึก กดปุ่ม <b>ถัดไป</b> บนแป้นพิมพ์เพื่อไปช่องต่อไป เสร็จแล้วกด <b>บันทึกทั้งหมด</b> ด้านล่างครั้งเดียว<br>
  เลข "ก่อน" ระบบเติมจากเดือนที่แล้วให้ ถ้าต้องแก้ แตะที่ตัวเลข "ก่อน" · อัตรา: น้ำหน่วยละ ${fmt(rt.waterRate)} · ไฟหน่วยละ ${fmt(rt.elecRate)}</p>
  ${seg("bld",[["A","ตึก A"],["B","ตึก B"]],S.bld)}
  <div class="seg" role="group">${FLOORS[S.bld].map(f=>`<button data-act="jumpFloor" data-v="${f}">ไปชั้น ${f}</button>`).join("")}</div>
  <p class="lead" style="margin:4px 0 10px">ตึก ${S.bld} จดแล้ว <b>${done}</b> จาก ${occ.length} ห้อง</p>
  <div class="mt">
  ${FLOORS[S.bld].map(f=>`<div class="mfloor" id="fl-${f}">ชั้น ${f}</div>${rs.filter(r=>r.f===f).map(meterRow).join("")}`).join("")}</div>
  ${isPast()?"":`<div class="savebar"><button class="btn big" data-act="saveAllMeters" ${S.canWrite?"":"disabled"}>บันทึกทั้งหมด <span id="dirtyN"></span></button></div>`}`;
}
function meterRow(r){
  const info=roomInfo(r.id),b=bill(r.id),p=bill(r.id,addMonth(S.month,-1));
  if(info.vacant&&!b)return `<div class="mr vac"><div class="mrn"><b>${r.label}</b></div><span class="mvac">ห้องว่าง ไม่ต้องจด</span></div>`;
  const val=(k,pk)=>b?(b[k]??""):(pk&&p?(p[pk]??""):"");
  const ro=isPast()?"disabled":"";const cell=(pk,ck,lab,kind)=>{const nm=kind==="w"?"น้ำ":"ไฟ";const pv=val(pk,ck);const need=S.showPrev.has(r.id)||pv==="";
    return `<div class="mc"><span class="mlab ${kind}">${kind==="w"?"💧 น้ำ":"⚡ ไฟ"}${lab?" "+lab:""}</span>
     <input type="number" inputmode="decimal" class="mprev ${kind}" placeholder="${nm} เลขก่อน" aria-label="${r.label} เลขก่อน" id="in-${r.id}-${pk}" data-keep data-room="${r.id}" value="${esc(pv)}" ${need?"":"hidden"} ${ro}>
     ${need?"":`<button class="pvb" data-act="editPrev" data-v="${r.id}" ${ro}>ก่อน ${fmt(pv)}</button>`}
     <input type="number" inputmode="decimal" enterkeyhint="next" class="mcur ${kind}" placeholder="${nm} เลขหลัง" aria-label="${r.label} เลขหลัง" id="in-${r.id}-${ck}" data-keep data-room="${r.id}" value="${esc(val(ck))}" ${ro}></div>`};
  return `<div class="mr ${b?"saved":""}" data-room="${r.id}"><div class="mrn"><b>${r.label}</b>${info.aircon?`<i class="air2">แอร์</i>`:""}</div>
   <div class="mcol">${cell("wPrev","wCur",r.sup?"มิเตอร์ 1":"","w")}${r.sup?cell("w2Prev","w2Cur","มิเตอร์ 2","w"):""}</div><div class="mcol">${cell("ePrev","eCur","","e")}</div>
   <div class="msum" id="pv-${r.id}" data-compact="1"></div></div>`;
}
function meterCard(r){
  const info=roomInfo(r.id),b=bill(r.id),p=bill(r.id,addMonth(S.month,-1));
  if(info.vacant&&!b)return `<div class="card vac"><div class="rhead"><b>${r.label}</b><span class="tag mute">ห้องว่าง</span><span class="who">ไม่ต้องจด</span></div></div>`;
  const val=(k,pk)=>b?(b[k]??""):(pk&&p?(p[pk]??""):"");
  const inp=(k,lab,pk)=>`<div class="fld"><label for="in-${r.id}-${k}">${lab}</label><input type="number" inputmode="decimal" id="in-${r.id}-${k}" data-keep data-room="${r.id}" value="${esc(val(k,pk))}"></div>`;
  const paid=b&&b.paid!=null;
  return `<div class="card ${b?"done":""}" data-room="${r.id}">
   <div class="rhead"><b>${r.label}</b>${r.sub?`<span class="tag mute">${r.sub}</span>`:""}${info.aircon?`<span class="tag">แอร์</span>`:""}<span class="who">${esc(info.tenant)||"—"}</span>${b?`<span class="saved">✓ บันทึกแล้ว</span>`:""}</div>
   <div class="mrow"><span class="lbl">น้ำ${r.sup?" 1":""}</span>${inp("wPrev","เลขก่อน","wCur")}${inp("wCur","เลขหลัง")}</div>
   ${r.sup?`<div class="mrow"><span class="lbl">น้ำ 2</span>${inp("w2Prev","เลขก่อน","w2Cur")}${inp("w2Cur","เลขหลัง")}</div>`:""}
   <div class="mrow"><span class="lbl">ไฟ</span>${inp("ePrev","เลขก่อน","eCur")}${inp("eCur","เลขหลัง")}</div>
   <div class="calc" id="pv-${r.id}"></div>
   <div class="actions"><button class="btn" data-act="saveMeter" data-v="${r.id}" ${S.canWrite?"":"disabled"}>บันทึก ${r.label}</button>${paid?`<span class="tag warn">ห้องนี้จ่ายเงินแล้ว แก้เลขจะไม่เปลี่ยนยอดที่รับไป</span>`:""}</div></div>`;
}
function draftFrom(id){const g=k=>{const el=document.getElementById(`in-${id}-${k}`);return el?numv(el.value):null};
  const info=roomInfo(id),old=bill(id);
  return{month:S.month,room:id,tenant:old?.paid!=null?old.tenant:info.tenant,tenantKey:old?.paid!=null?old.tenantKey:info.tenantKey,
    rent:old?.paid!=null?old.rent:(info.aircon?S.settings.rentAir:S.settings.rentNormal),
    wPrev:g("wPrev"),wCur:g("wCur"),w2Prev:g("w2Prev"),w2Cur:g("w2Cur"),ePrev:g("ePrev"),eCur:g("eCur"),extra:old?.extra,extraNote:old?.extraNote,extraItems:old?.extraItems}}
function checkDraft(d){const sup=RBY[d.room].sup;const need=["wPrev","wCur","ePrev","eCur"].concat(sup?["w2Prev","w2Cur"]:[]);
  if(need.some(k=>d[k]==null))return"กรอกเลขให้ครบทุกช่อง";
  if(d.wCur<d.wPrev||(sup&&d.w2Cur<d.w2Prev))return"เลขน้ำ \"หลัง\" น้อยกว่า \"ก่อน\" กรุณาตรวจอีกครั้ง";
  if(d.eCur<d.ePrev)return"เลขไฟ \"หลัง\" น้อยกว่า \"ก่อน\" กรุณาตรวจอีกครั้ง";return null}
function dirtyRooms(){return[...new Set([...document.querySelectorAll("input[data-room][data-dirty]")].map(i=>i.dataset.room))]}
function updatePreview(id){const el=document.getElementById("pv-"+id);if(!el)return;const d=draftFrom(id);const err=checkDraft(d);
  if(el.dataset.compact){const row=el.closest(".mr");const dirty=!!row.querySelector("input[data-dirty]");row.classList.toggle("chg",dirty);const b=bill(id);
    const n=document.getElementById("dirtyN");if(n){const k=dirtyRooms().length;n.textContent=k?`(${k} ห้อง)`:""}
    if(d.wCur==null&&d.eCur==null&&d.w2Cur==null){el.innerHTML="";return}
    if(err){el.innerHTML=`<span class="err">${err}</span>`;return}
    if(b?.paid!=null){d.wRate=b.wRate;d.eRate=b.eRate;d.paid=b.paid;d.carry=b.carry}
    const c=calc(d),an=anomaly(d);
    el.innerHTML=`${!dirty&&b?`<span class="saved">✓</span> `:""}น้ำ ${fmt(c.wu)} หน่วย · ไฟ ${fmt(c.eu)} หน่วย · <b>รวม ${fmt(c.total)}</b>${an.map(a=>` <span class="tag warn">⚠ ${a.k}${a.pct>0?"+":"−"}${Math.abs(a.pct).toFixed(0)}%</span>`).join("")}${b?.paid!=null?` <span class="tag mute">จ่ายแล้ว</span>`:""}`;return}
  if(err){el.innerHTML=`<span class="${d.wCur==null&&d.eCur==null?"":"err"}">${d.wCur==null&&d.eCur==null?"ยังไม่ได้กรอกเลขหลัง":err}</span>`;return}
  const old=bill(id);if(old?.paid!=null){d.wRate=old.wRate;d.eRate=old.eRate;d.paid=old.paid;d.carry=old.carry}
  const c=calc(d),an=anomaly(d);
  el.innerHTML=`น้ำ ${fmt(c.wu)} หน่วย = <b>${fmt(c.wc)}</b> · ไฟ ${fmt(c.eu)} หน่วย = <b>${fmt(c.ec)}</b> · ค่าเช่า ${fmt(d.rent)}${c.carry?` · ยกมา ${fmt(c.carry)}`:""}<br><span class="tot">รวม ${fmt(c.total)} บาท</span>
   ${an.map(a=>`<br><span class="tag warn">⚠ ${a.k}${a.pct>0?"เพิ่ม":"ลด"} ${Math.abs(a.pct).toFixed(0)}% จากเดือนก่อน (${fmt(a.o)} → ${fmt(a.c)} หน่วย)</span>`).join("")}`}
async function saveMeter(id){if(isPast()){toast("เดือนที่ผ่านมาแล้ว แก้ไขไม่ได้");return}const d=draftFrom(id);const err=checkDraft(d);if(err){toast(err);return}
  const old=bill(id)||{};const doc={...old,...d,updatedAt:new Date().toISOString()};
  if(!RBY[id].sup){delete doc.w2Prev;delete doc.w2Cur}const pr=withPending(doc,bill(id),id);
  await write(async()=>{await ensureMonth(S.month);await S.db.doc("bills/"+billId(S.month,id)).set(doc);if(pr)await clearPending([pr])},"บันทึก "+RBY[id].label+" แล้ว");
  document.querySelectorAll(`[data-room="${id}"][data-keep]`).forEach(i=>delete i.dataset.dirty);
}

/* invoices */
function invoiceRooms(bld){return ROOMS.filter(r=>(bld==="ALL"||r.b===bld)).filter(r=>bill(r.id))}
function vBills(){
  const rs=invoiceRooms(S.invBld);const missing=occupied(S.invBld).filter(r=>!bill(r.id));const pages=Math.ceil(rs.length/6);
  return `${backBtn()}<h2 class="vtitle">พิมพ์ใบแจ้งค่าเช่า</h2>
  <p class="lead">ระบบจะสร้างไฟล์ PDF ขนาด A4 หน้าละ 6 ห้อง มีเส้นประให้ตัด เปิดไฟล์แล้วกดพิมพ์ได้เลย</p>
  ${seg("invBld",[["ALL","ทั้งหมด"],["A","ตึก A"],["B","ตึก B"]],S.invBld)}
  ${missing.length?`<div class="banner warn">ยังไม่ได้จดมิเตอร์ ${missing.length} ห้อง จะยังไม่มีใบแจ้ง: ${missing.slice(0,12).map(r=>r.label).join(", ")}${missing.length>12?" …":""}</div>`:""}
  <button class="btn big" data-act="pdfInv" ${rs.length&&S.dl?"":"disabled"}>สร้างไฟล์ใบแจ้ง ${rs.length} ห้อง (${pages} แผ่น)</button>
  ${S.dl?"":`<p class="lead" style="margin-top:8px">การบันทึกไฟล์ต้องเปิดหน้านี้ในแอป Claude</p>`}
  ${rs.length?`<div class="sect"><h2>ตัวอย่างใบแจ้ง</h2><div class="preview"><div style="width:794px;height:auto;transform-origin:0 0" class="pp" id="invprev"><div class="inv-grid" style="grid-template-rows:auto">${rs.slice(0,2).map(r=>invHTML(r.id)).join("")}</div></div></div></div>`:""}`;
}
function invHTML(id){const b=bill(id),r=RBY[id],c=calc(b);const sup=r.sup;
  return `<div class="inv"><div class="h"><div><b>ใบแจ้งค่าเช่าห้อง</b><br><i>งามเจริญ กรีนวิลล์</i></div><div style="text-align:right"><div class="rm">${r.label}</div><i>ประจำเดือน ${mLabelFull(b.month)}</i></div></div>
   <div class="sm" style="margin-bottom:4px">ผู้เช่า: ${esc(b.tenant)||"-"}</div>
   <table><tr><td>ค่าเช่าห้อง</td><td class="a">${fmt(b.rent)}</td></tr>
   <tr><td>ค่าน้ำ ${sup?"(2 มิเตอร์)":""}<br><span class="sm">${sup?`${fmt(b.wPrev)}→${fmt(b.wCur)} และ ${fmt(b.w2Prev)}→${fmt(b.w2Cur)}`:`มิเตอร์ ${fmt(b.wPrev)} → ${fmt(b.wCur)}`} = ${fmt(c.wu)} หน่วย × ${fmt(c.r.waterRate)}</span></td><td class="a">${fmt(c.wc)}</td></tr>
   <tr><td>ค่าไฟ<br><span class="sm">มิเตอร์ ${fmt(b.ePrev)} → ${fmt(b.eCur)} = ${fmt(c.eu)} หน่วย × ${fmt(c.r.elecRate)}</span></td><td class="a">${fmt(c.ec)}</td></tr>
   ${c.carryDue?`<tr><td>${c.carryDue>0?`ค้างชำระจากเดือน ${mLabel(addMonth(b.month,-1))}`:`หักเงินจ่ายเกินเดือน ${mLabel(addMonth(b.month,-1))}`}</td><td class="a">${fmt(c.carryDue)}</td></tr>`:""}
   ${c.carryFee?`<tr><td>ค่าปรับจ่ายช้า (บิลเดือน ${mLabel(addMonth(b.month,-1))})</td><td class="a">${fmt(c.carryFee)}</td></tr>`:""}
   ${extraItems(b).map(x=>`<tr><td>${esc(x.note)}</td><td class="a">${fmt(x.amt)}</td></tr>`).join("")}
   <tr class="total"><td>รวมที่ต้องชำระ</td><td class="a">${fmt(c.total)} บาท</td></tr></table>
   <div class="foot"><b>กรุณาชำระภายในวันที่ 5 ของทุกเดือน</b><br>โอนเข้า ${esc(bankInfo().bank)} เลขบัญชี <b>${esc(bankInfo().no)}</b><br>ชื่อบัญชี ${esc(bankInfo().name)}</div></div>`}
async function pdfInv(){const rs=invoiceRooms(S.invBld);const pages=[];for(let i=0;i<rs.length;i+=6)pages.push(`<div class="inv-grid">${rs.slice(i,i+6).map(r=>invHTML(r.id)).join("")}</div>`);
  await makePdf(pages,`ใบแจ้งค่าเช่า-${mLabel(S.month).replace(" ","")}${S.invBld==="ALL"?"":"-ตึก"+S.invBld}.pdf`)}

/* pay */
function vPay(){
  const rs=ROOMS.filter(r=>r.b===S.payBld);const withBill=rs.filter(r=>bill(r.id));
  return `${backBtn()}<h2 class="vtitle">รับเงิน / ใบเสร็จ</h2>
  <p class="lead">แตะห้องที่มาจ่ายเงิน ระบบคิดค่าปรับตามวันที่จ่ายให้ (${lateText(S.month)})</p>
  ${seg("payBld",[["A","ตึก A"],["B","ตึก B"]],S.payBld)}
  <div class="actions" style="margin-bottom:14px"><button class="btn ghost" data-act="pdfRcAll" ${withBill.length&&S.dl?"":"disabled"}>พิมพ์ใบเสร็จทั้งตึก ${S.payBld} (เว้นวันที่ไว้เขียน)</button></div>
  <div class="list">${rs.map(payRow).join("")}</div>`;
}
function payRow(r){const info=roomInfo(r.id),b=bill(r.id);
  if(!b)return `<div class="prow" style="opacity:.65"><span><span class="r">${r.label}</span> <span class="w">${info.vacant?"ห้องว่าง":esc(info.tenant)||"—"}</span></span><span class="tag mute">${info.vacant?"ว่าง":"ยังไม่จดมิเตอร์"}</span></div>`;
  const c=calc(b);const paid=b.paid!=null;const open=S.payOpen===r.id;
  const st=paid?`<span class="tag">จ่ายแล้ว ${dLabel(b.payDate)}</span>`:`<span class="tag warn">ยังไม่จ่าย</span>`;
  return `<div><button class="prow" data-act="payOpen" data-v="${r.id}" aria-expanded="${open}"><span><span class="r">${r.label}</span> <span class="w">${esc(b.tenant)||"—"}</span><br>${st}</span><span class="amt">${fmt(paid?b.paid:c.total)}</span></button>${open?payPanel(r,b,c):""}</div>`}
function payPanel(r,b,c){
  if(b.paid!=null){const diff=Math.round((b.expected-b.paid)*100)/100;
    return `<div class="panel"><dl class="kv"><dt>วันที่จ่าย</dt><dd>${dLabel(b.payDate)}</dd><dt>ผู้จ่าย</dt><dd>${esc(b.payer)}</dd><dt>ยอดที่ต้องจ่าย</dt><dd>${fmt(b.expected)} บาท</dd><dt>รับเงินจริง</dt><dd>${fmt(b.paid)} บาท</dd></dl>
      ${diff>0?`<div class="banner warn" style="margin-top:10px">จ่ายไม่ครบ ยังค้าง ${fmt(diff)} บาท จะยกไปรวมในบิลเดือนหน้า</div>`:diff<0?`<div class="banner ok" style="margin-top:10px">จ่ายเกิน ${fmt(-diff)} บาท จะหักออกในบิลเดือนหน้า</div>`:""}
      ${b.lateFee?`<div class="banner warn" style="margin-top:10px">จ่ายช้า ค่าปรับ ${fmt(b.lateFee)} บาท จะไปรวมในบิลเดือนหน้า</div>`:""}
      <div class="actions" style="margin-top:12px"><button class="btn" data-act="pdfRc" data-v="${r.id}" ${S.dl?"":"disabled"}>ทำใบเสร็จห้องนี้ (PDF)</button>
      ${S.confirmUnpay===r.id?`<button class="btn danger" data-act="unpay" data-v="${r.id}">ยืนยัน ลบการรับเงิน</button><button class="btn ghost" data-act="unpayNo">ไม่ลบ</button>`:`<button class="btn danger" data-act="unpayAsk" data-v="${r.id}" ${S.canWrite?"":"disabled"}>ลบการรับเงิน (บันทึกผิด)</button>`}</div></div>`}
  const t=todayISO();const lf=lateFee(b.month,t);
  return `<div class="panel">
   <table class="sum"><tr><td>ค่าเช่า</td><td>${fmt(b.rent)}</td></tr><tr><td>ค่าน้ำ (${fmt(c.wu)} หน่วย)</td><td>${fmt(c.wc)}</td></tr><tr><td>ค่าไฟ (${fmt(c.eu)} หน่วย)</td><td>${fmt(c.ec)}</td></tr>
   ${c.carryDue?`<tr><td>${c.carryDue>0?"ค้างชำระจากเดือนก่อน":"หักจ่ายเกินเดือนก่อน"}</td><td>${fmt(c.carryDue)}</td></tr>`:""}
   ${c.carryFee?`<tr><td>ค่าปรับจ่ายช้า (เดือนก่อน)</td><td>${fmt(c.carryFee)}</td></tr>`:""}
   ${extraItems(b).map(x=>`<tr><td>${esc(x.note)}</td><td>${fmt(x.amt)}</td></tr>`).join("")}
   <tr class="t"><td>ต้องจ่ายทั้งหมด</td><td>${fmt(c.total)} บาท</td></tr></table>
   <div id="pf-lf" class="banner ${lf?"warn":"ok"}">${lfNote(lf)}</div>
   <div class="grid2"><div class="fld"><label for="pf-date">วันที่จ่าย</label><input type="date" id="pf-date" data-keep value="${t}"></div>
   <div class="fld"><label for="pf-payer">ชื่อผู้จ่าย</label><input type="text" id="pf-payer" data-keep value="${esc(b.tenant)}"></div>
   <div class="fld"><label for="pf-amt">รับเงินมา (บาท)</label><input type="number" inputmode="decimal" id="pf-amt" data-keep value="${c.total}"></div></div>
   <button class="btn big" data-act="pay" data-v="${r.id}" ${S.canWrite?"":"disabled"}>บันทึกการรับเงิน ${r.label}</button></div>`}
function lfNote(lf){return lf?`จ่ายช้า ค่าปรับ ${fmt(lf)} บาท จะไปรวมในบิลเดือนหน้า`:"จ่ายตรงเวลา ไม่มีค่าปรับ"}
function payLive(){const id=S.payOpen;const b=bill(id);if(!b||b.paid!=null)return;const d=$("#pf-date")?.value;const lf=lateFee(b.month,d);
  const e=$("#pf-lf");if(e){e.textContent=lfNote(lf);e.className="banner "+(lf?"warn":"ok")}}
async function pay(id){const date=$("#pf-date").value,payer=$("#pf-payer").value.trim(),amt=numv($("#pf-amt").value);
  const ok=await payBill(id,date,payer,amt);
  if(ok)["pf-date","pf-payer","pf-amt"].forEach(k=>{const e=document.getElementById(k);if(e)delete e.dataset.dirty})}
async function payBill(id,date,payer,amt,silent){const b=bill(id);const c=calc(b);
  if(!date){toast("กรุณาใส่วันที่จ่าย");return false}if(amt==null||amt<0){toast("กรุณาใส่จำนวนเงินที่รับมา");return false}
  const lf=lateFee(b.month,date);
  return write(()=>S.db.doc("bills/"+billId(b.month,id)).update({paid:amt,payDate:date,payer:payer||b.tenant,lateFee:lf,carry:c.carry,carryFee:c.carryFee,expected:c.total,wRate:c.r.waterRate,eRate:c.r.elecRate}),silent?null:"บันทึกการรับเงิน "+RBY[id].label+" แล้ว")}
async function qsaveAll(){const ids=ROOMS.filter(r=>r.b===S.ovBld&&bill(r.id)&&bill(r.id).paid==null&&document.getElementById(`q-${r.id}-d`)?.value).map(r=>r.id);
  if(!ids.length){toast("ยังไม่มีห้องที่กรอกวันที่ไว้");return}const bad=ids.filter(id=>!qDate(id));
  if(bad.length){toast("วันที่ไม่ถูกต้อง: "+bad.map(id=>RBY[id].label).join(", "));return}
  let n=0;for(let k=0;k<ids.length;k++){const id=ids[k];busy(`กำลังบันทึก ${k+1} จาก ${ids.length} ห้อง`);
    const ok=await payBill(id,qDate(id),bill(id).tenant,numv(document.getElementById(`q-${id}-a`).value),true);if(!ok)break;n++;
    ["d","m","a"].forEach(x=>{const e=document.getElementById(`q-${id}-${x}`);if(e)delete e.dataset.dirty});if(S.fromPhoto)delete S.fromPhoto[id]}
  busy(null);toast(`บันทึกแล้ว ${n} ห้อง`);render()}
async function readPhotos(files){if(!files||!files.length||!S.sample)return;const B=S.ovBld;
  const open=ROOMS.filter(r=>r.b===B&&bill(r.id)&&bill(r.id).paid==null);if(!open.length){toast("ตึกนี้ไม่มีห้องที่รอบันทึก");return}
  const list=open.map(r=>`${r.sup?"ซุปเปอร์":r.label}=${calc(bill(r.id)).total}`).join(", ");
  const prompt=`รูปที่แนบคือใบภาพรวมค่าเช่า ตึก ${B} เดือน ${mLabelFull(S.month)} ของหอพัก เป็นตารางพิมพ์แยกตามชั้น คอลัมน์: ห้อง, ค่าเช่า, ยอดรวม, วันที่จ่าย, หมายเหตุ
ผู้ดูแลเขียนด้วยลายมือว่าแต่ละห้องจ่ายวันไหน เช่น "5", "5/11", "5 พ.ย." บางห้องอาจเขียนจำนวนเงินที่รับจริงไว้ด้วยถ้าไม่เท่ายอดรวม
ห้องที่ยังไม่จ่ายในระบบ (ห้อง=ยอดรวม): ${list}
อ่านเฉพาะห้องในรายการนี้ที่มีลายมือเขียนวันที่จ่าย ห้ามเดา ห้องที่ไม่มีลายมือไม่ต้องใส่
ตอบเป็น JSON เท่านั้น: {"items":[{"room":"A201","day":5,"month":11,"amount":null,"unsure":false}]}
room ใช้ชื่อตามรายการด้านบน (ห้องซุปเปอร์ใช้ "ซุปเปอร์"), day = วันที่ 1-31, month = เลขเดือน 1-12 ถ้าเขียนไว้ ไม่งั้น null, amount = ตัวเลขเฉพาะเมื่อเขียนจำนวนเงินไว้ ไม่งั้น null, unsure = true ถ้าอ่านลายมือไม่ชัด`;
  busy("กำลังอ่านรูป… อาจใช้เวลาสักครู่");
  try{const res=await S.sample.json(prompt,{images:Array.from(files),modelTier:"complex"});busy(null);
    const nextM=+addMonth(S.month,1).slice(5);S.fromPhoto=S.fromPhoto||{};let n=0;
    (res?.items||[]).forEach(x=>{const r=x.room==="ซุปเปอร์"?RBY.ASUP:RBY[String(x.room||"").toUpperCase().trim()];if(!r||!open.includes(r))return;
      const d=document.getElementById(`q-${r.id}-d`),a=document.getElementById(`q-${r.id}-a`);if(!d||!(+x.day>=1&&+x.day<=31))return;
      d.value=(x.month&&+x.month!==+S.month.slice(5))?`${+x.day}.${+x.month}`:String(+x.day);d.dataset.dirty="1";
      if(x.amount!=null&&!isNaN(+x.amount)){a.value=+x.amount;a.dataset.dirty="1"}else{delete a.dataset.dirty}
      S.fromPhoto[r.id]={unsure:!!x.unsure};n++});
    render();open.forEach(r=>qLive(r.id));toast(n?`อ่านได้ ${n} ห้อง ตรวจให้ถูกแล้วกด "บันทึกทั้งหมด"`:"ไม่พบวันที่จ่ายในรูป ลองถ่ายให้ชัดขึ้น")}
  catch(e){busy(null);toast(e?.code==="not_granted"?"ยังไม่ได้อนุญาตให้ส่งรูปให้ Claude อ่าน":e?.code==="rate_limited"?"ใช้บ่อยเกินไป รอสักครู่แล้วลองใหม่":"อ่านรูปไม่สำเร็จ ลองถ่ายให้ชัดและตรงขึ้น")}}
/* quick entry from paper */
function qDate(id){const raw=(document.getElementById(`q-${id}-d`)?.value||"").trim();const m=raw.match(/^(\d{1,2})(?:\s*[.\/-]\s*(\d{1,2})(?:\s*[.\/-]\s*\d{2,4})?)?$/);if(!m)return null;
  const d=+m[1];let mk=S.month;if(m[2]){const mo=+m[2];if(mo<1||mo>12)return null;const by=+S.month.slice(0,4),bm=+S.month.slice(5);const y=mo<bm-6?by+1:mo>bm+6?by-1:by;mk=y+"-"+String(mo).padStart(2,"0")}
  const[y,mm]=mk.split("-").map(Number);if(d<1||d>new Date(y,mm,0).getDate())return null;return mk+"-"+String(d).padStart(2,"0")}
/* หน้ากรอกวันจ่าย: ตารางแยกชั้น เหมือนใบจดวันจ่ายที่พิมพ์ออกมา */
function quickRow(r){const b=bill(r.id);if(!b)return `<tr class="qx"><td><b>${r.label}</b></td><td class="n qrent">-</td><td class="n">-</td><td colspan="3" class="qmute">${roomInfo(r.id).vacant?"ห้องว่าง":"ยังไม่จดมิเตอร์"}</td></tr>`;
  const ed=b.paid!=null&&S.qEdit.has(r.id);const c=calc(b);
  if(b.paid!=null&&!ed)return `<tr class="qd"><td><b>${r.label}</b></td><td class="n qrent">${fmt(b.rent)}</td><td class="n">${fmt(b.expected??c.total)}</td>
    <td class="qdate">✓ ${dLabel(b.payDate)}</td><td class="n">${fmt(b.paid)}${b.expected-b.paid>0?`<br><span class="tag warn">ค้าง ${fmt(b.expected-b.paid)}</span>`:""}${b.lateFee?`<br><span class="tag warn">ปรับ ${fmt(b.lateFee)}</span>`:""}</td>
    <td>${S.qSaving.has(r.id)?`<span class="qsv">กำลังบันทึก…</span>`:`<button class="qedit" data-act="qedit" data-v="${r.id}" ${S.canWrite?"":"disabled"}>แก้ไข</button>`}</td></tr>`;
  const pd=ed?b.payDate:"";const dv=pd?(mKey(pd)===b.month?String(+pd.slice(8,10)):`${+pd.slice(8,10)}.${+pd.slice(5,7)}`):"";const av=ed?b.paid:c.total;
  const ph=S.fromPhoto?.[r.id];
  return `<tr class="qe ${ph?(ph.unsure?"phx":"ph"):""} ${ed?"qedrow":""}"><td><b>${r.label}</b></td><td class="n qrent">${fmt(b.rent)}</td><td class="n">${fmt(c.total)}</td>
   <td><input type="text" inputmode="decimal" autocomplete="off" placeholder="วันที่" enterkeyhint="next" aria-label="${r.label} วันที่จ่าย" id="q-${r.id}-d" data-keep data-q="${r.id}" value="${esc(dv)}"></td>
   <td><input type="number" inputmode="decimal" enterkeyhint="next" aria-label="${r.label} รับเงิน" id="q-${r.id}-a" data-keep data-q="${r.id}" value="${av}"></td>
   <td><button class="qok" data-act="qsave" data-v="${r.id}" ${S.canWrite?"":"disabled"} aria-label="บันทึก ${r.label}">บันทึก</button></td></tr>
   <tr class="qsub ${ed||ph?"":"qsub0"}"><td colspan="6"><span id="q-${r.id}-n"></span>${ph?` <span class="tag ${ph.unsure?"bad":"warn"}">${ph.unsure?"อ่านจากรูปไม่ชัด ตรวจให้ดี":"จากรูป ตรวจด้วย"}</span>`:""}
   ${ed?` <button class="qedit" data-act="qcancel" data-v="${r.id}">ไม่แก้ไข</button> <button class="qedit qdel" data-act="qunpay" data-v="${r.id}">ลบการจ่ายห้องนี้</button>`:""}</td></tr>`}
function qLive(id){const b=bill(id);if(!b||(b.paid!=null&&!S.qEdit.has(id)))return;const c=calc(b);const n=document.getElementById(`q-${id}-n`);const a=document.getElementById(`q-${id}-a`);
  const el=document.getElementById(`q-${id}-d`);const raw=(el?.value||"").trim();const iso=qDate(id);const sub=n?.closest("tr");
  let h="";if(raw&&!iso)h=`<span class="err">วันที่ไม่ถูกต้อง พิมพ์เช่น 5 หรือ 5.12</span>`;else if(iso){const lf=lateFee(b.month,iso);h=`จ่ายวันที่ <b>${dLabel(iso)}</b>`+(lf?` · <span class="tag warn">จ่ายช้า ปรับ ${lf} ไปบิลหน้า</span>`:" · ตรงเวลา")}
  if(n)n.innerHTML=h;if(sub)sub.classList.toggle("qsub0",!h&&!S.fromPhoto?.[id]&&!S.qEdit.has(id));if(a&&!a.dataset.dirty&&b.paid==null)a.value=c.total}

/* บันทึกทันทีบนหน้าจอ แล้วส่งไปเก็บใน Sheet ตามหลัง (ถ้าส่งไม่สำเร็จจะย้อนกลับและแจ้งเตือน) */
async function qsave(id){const iso=qDate(id);if(!iso){toast("กรุณาใส่วันที่ให้ถูกต้อง (1–31)");return}
  const amt=numv(document.getElementById(`q-${id}-a`).value);if(amt==null||amt<0){toast("กรุณาใส่จำนวนเงินที่รับมา");return}
  if(!S.canWrite){toast("บัญชีนี้ดูได้อย่างเดียว บันทึกไม่ได้");return}
  const b=bill(id),old={...b},c=calc(b),lf=lateFee(b.month,iso),key=billId(b.month,id);
  const f={paid:amt,payDate:iso,payer:b.payer||b.tenant,lateFee:lf,carry:c.carry,carryFee:c.carryFee,expected:c.total,wRate:c.r.waterRate,eRate:c.r.elecRate};
  ["d","m","a"].forEach(k=>{const e=document.getElementById(`q-${id}-${k}`);if(e)delete e.dataset.dirty});
  localSet("bills",key,f,true);S.qEdit.delete(id);S.qSaving.add(id);S.pending=(S.pending||0)+1;
  const order=ROOMS.filter(r=>r.b===S.ovBld).map(r=>r.id);const next=order.slice(order.indexOf(id)+1).find(x=>{const nb=bill(x);return nb&&(nb.paid==null||S.qEdit.has(x))});
  render();if(next){const n=document.getElementById(`q-${next}-d`);if(n){n.focus();n.scrollIntoView({block:"center"})}}
  toast(`${RBY[id].label} จ่ายแล้ว ${dLabel(iso)}`+(lf?` · ปรับ ${lf} ไปบิลหน้า`:""));
  try{await API.call("updateDoc",S.pin,"bills",key,JSON.stringify(f))}
  catch(e){localSet("bills",key,old,false);toast(String(e&&e.message).includes("BAD_PIN")?"รหัสไม่ถูกต้อง":`บันทึก ${RBY[id].label} ไม่สำเร็จ ตรวจอินเทอร์เน็ตแล้วลองอีกครั้ง`)}
  finally{S.qSaving.delete(id);S.pending--;render()}}
async function unpay(id){const b=bill(id);const doc={...b};["paid","payDate","payer","lateFee","carry","carryFee","expected","wRate","eRate"].forEach(k=>delete doc[k]);S.confirmUnpay=null;
  await write(()=>S.db.doc("bills/"+billId(b.month,id)).set(doc),"ลบการรับเงินแล้ว")}
function rcItem(id,blank){const b=bill(id),r=RBY[id];const amt=blank?calc(b).total:b.paid;
  return{room:r.label,month:mLabel(b.month),payer:blank?b.tenant:b.payer,amt,date:blank?"":dLabel(b.payDate)}}
function rcHTML(x){return `<div class="rc"><div class="stub"><span style="color:#555">ต้นขั้ว</span><div class="big">${esc(x.room)}</div><div>เดือน ${x.month}</div><div class="big">${fmt(x.amt)}</div><div>วันที่ ${x.date||"............"}</div><div style="font-size:12px;color:#444">${esc(x.payer)}</div></div>
  <div class="main"><h4>ใบเสร็จรับเงิน <small>งามเจริญ กรีนวิลล์</small></h4>
  <div class="line"><span>วันที่</span><b>${x.date||"&nbsp;"}</b><span style="width:auto">เดือน</span><b style="flex:none;width:110px">${x.month}</b></div>
  <div class="line"><span>ได้รับเงินจาก</span><b>${esc(x.payer)||"&nbsp;"}</b></div>
  <div class="line"><span>ชำระค่าเช่าห้อง</span><b>${esc(x.room)}</b></div>
  <div class="line"><span>จำนวนเงิน</span><b>${fmt(x.amt)} บาท</b></div>
  <div class="line"><span>(ตัวอักษร)</span><b>${bahtText(x.amt)}</b></div>
  <div class="sig">ผู้รับเงิน <span></span></div></div></div>`}
async function pdfRc(items,name){const pages=[];for(let i=0;i<items.length;i+=3)pages.push(`<div class="rc-wrap">${items.slice(i,i+3).map(rcHTML).join("")}</div>`);await makePdf(pages,name)}

/* overview */
function vOverview(){const B=S.ovBld;let grand=0;ROOMS.filter(r=>r.b===B).forEach(r=>{const b=bill(r.id);if(b)grand+=calc(b).total});
const qb=`<div class="qgrid">${FLOORS[B].map(f=>`<div class="qfl"><div class="floorh">ตึก ${B} ชั้น ${f}</div><div class="tbl-wrap"><table class="qt"><thead><tr><th>ห้อง</th><th class="qrent">ค่าเช่า</th><th>ยอดรวม</th><th>วันที่จ่าย</th><th>รับเงิน</th><th></th></tr></thead><tbody>${ROOMS.filter(r=>r.b===B&&r.f===f).map(quickRow).join("")}</tbody></table></div></div>`).join("")}</div>`;
    return `${backBtn()}<h2 class="vtitle">บันทึกวันจ่าย</h2>${seg("ovBld",[["A","ตึก A"],["B","ตึก B"]],B)}
    <div class="actions" style="margin-bottom:12px"><button class="btn ghost" data-act="pdfOv" ${S.dl?"":"disabled"}>🖨 พิมพ์ใบจดวันจ่าย ตึก ${B} (1 แผ่น)</button><span class="lead" style="margin:0">ยอดรวมทั้งตึก ${B}: <b class="num">${fmt(grand)}</b> บาท</span></div>
    <p class="lead">ดูจากกระดาษที่จดไว้ ช่อง <b>วันที่จ่าย</b> ใส่แค่ตัวเลขวันที่ เช่น <b>5</b> (ถ้าจ่ายข้ามเดือน ใส่ <b>3.12</b> = 3 ธ.ค.) แล้วกด <b>Enter</b> บันทึกทันที และไปห้องถัดไปเอง<br>ถ้าจ่ายไม่ครบ ให้แก้ช่อง "รับเงิน" ก่อนกดบันทึก</p>
    ${S.sampleImg?`<div class="card" style="margin-bottom:12px"><h3 style="margin-bottom:4px">ให้ระบบอ่านจากรูปถ่าย</h3><p class="lead" style="margin-bottom:10px">ถ่ายรูปใบจดวันจ่ายตึก ${B} ที่จดไว้ ระบบจะกรอกวันที่ให้ แต่<b>ยังไม่บันทึก</b> ต้องตรวจก่อน ถ่ายให้ตรงและชัด ถ่ายทีละครึ่งแผ่นได้ (เลือกหลายรูปพร้อมกันได้)</p>
    <div class="actions"><div class="filebtn btn"><span>📷 ถ่ายรูปใหม่</span><input type="file" id="ph-cam" accept="image/*" capture="environment" aria-label="ถ่ายรูปใบจดวันจ่าย"></div><div class="filebtn btn ghost"><span>🖼 เลือกจากคลังรูป</span><input type="file" id="ph-in" accept="image/*" multiple aria-label="เลือกรูปใบจดวันจ่าย"></div></div>
    <p class="lead" style="margin:10px 0 0;font-size:.9rem">ถ้าเปิดหน้าเลือกรูปแล้วไม่อยากเลือก กดปุ่ม "ย้อนกลับ" ของมือถือเพื่อปิด</p></div>`:""}
    <button class="btn big" data-act="qsaveAll" ${S.canWrite?"":"disabled"} style="margin-bottom:6px">บันทึกทั้งหมดที่กรอกวันที่ไว้</button>${qb||`<p class="lead">ยังไม่มีบิลเดือนนี้ ต้องจดมิเตอร์ก่อน</p>`}`}
function ovHTML(B){let grand=0;const tabs=FLOORS[B].map(f=>{const rs=ROOMS.filter(r=>r.b===B&&r.f===f);let sum=0;
  const rows=rs.map(r=>{const b=bill(r.id);const tot=b?calc(b).total:null;if(tot)sum+=tot;return `<tr><td><b>${r.label}</b></td><td class="n">${b?fmt(b.rent):""}</td><td class="n">${tot!=null?fmt(tot):"-"}</td><td>${b?.paid!=null?dLabel(b.payDate):""}</td><td></td></tr>`}).join("");
  grand+=sum;return `<table><thead><tr><th>ห้อง</th><th>ค่าเช่า</th><th>ยอดรวม</th><th>วันที่จ่าย</th><th style="width:70px">หมายเหตุ</th></tr></thead><tbody>${rows}<tr><td colspan="2"><b>รวมชั้น ${f}</b></td><td class="n"><b>${fmt(sum)}</b></td><td></td><td></td></tr></tbody></table>`});
  return `<div class="ov"><h4>ใบจดวันจ่าย ตึก ${B} · เดือน ${mLabelFull(S.month)}</h4><div class="meta">ยอดรวมทั้งตึก ${B}: <b>${fmt(grand)}</b> บาท</div><div class="ov-grid">${tabs.join("")}</div></div>`}

/* rooms */
/* ค่าปรับ / ค่าใช้จ่ายอื่นๆ ที่กรอกเอง (เช่น ค่าย้ายห้อง) พร้อมเหตุผล */
function extraItems(b){if(!b)return[];if(b.extraItems){try{return JSON.parse(b.extraItems)}catch(e){}}return +b.extra?[{amt:+b.extra,note:b.extraNote||"ค่าปรับ / อื่นๆ"}]:[]}
function pendingItems(id){try{return JSON.parse(roomInfo(id).pendingItems||"[]")}catch(e){return[]}}
function extraTarget(id){const b=bill(id);if(b&&b.paid==null&&!isPast()&&b.tenantKey===roomInfo(id).tenantKey)return{kind:"bill",b,label:`บิลเดือน ${mLabel(b.month)}`};return{kind:"room",label:"บิลเดือนถัดไป (เพิ่มให้อัตโนมัติตอนจดมิเตอร์)"}}
function extraHTML(id){const t=extraTarget(id);const items=t.kind==="bill"?extraItems(t.b):pendingItems(id);const pend=t.kind==="bill"?pendingItems(id):[];
  return `<div class="card xcard"><h3 style="margin-bottom:4px">ค่าปรับ / ค่าใช้จ่ายอื่นๆ</h3><p class="lead" style="margin-bottom:8px">เช่น ค่าย้ายห้อง ค่ากุญแจหาย · จะรวมใน <b>${t.label}</b></p>
  ${items.length?`<table class="sum">${items.map((x,i)=>`<tr><td>${esc(x.note)}</td><td>${fmt(x.amt)} <button class="xdel" data-act="xdel" data-v="${id}" data-i="${i}" aria-label="ลบ ${esc(x.note)}">ลบ</button></td></tr>`).join("")}</table>`:`<p class="qmute" style="margin:0 0 8px">ยังไม่มีรายการ</p>`}
  ${pend.length?`<p class="lead">รอรวมในบิลเดือนถัดไป: ${pend.map(x=>`${esc(x.note)} ${fmt(x.amt)}`).join(", ")}</p>`:""}
  <div class="grid2"><div class="fld"><label for="x-${id}-n">เหตุผล</label><input type="text" id="x-${id}-n" placeholder="เช่น ค่าย้ายห้อง" data-keep></div>
  <div class="fld"><label for="x-${id}-a">จำนวนเงิน (บาท)</label><input type="number" inputmode="decimal" id="x-${id}-a" placeholder="เช่น 200" data-keep></div></div>
  <button class="btn" data-act="xadd" data-v="${id}" ${S.canWrite?"":"disabled"}>+ เพิ่มรายการ</button></div>`}
async function saveExtra(id,items){const t=extraTarget(id);const sum=r2(items.reduce((a,x)=>a+x.amt,0));
  if(t.kind==="bill"){const doc={...t.b,extra:sum,extraItems:JSON.stringify(items)};delete doc.extraNote;return write(()=>S.db.doc("bills/"+billId(t.b.month,id)).set(doc))}
  const doc={...(S.rooms[id]||roomInfo(id)),pendingItems:JSON.stringify(items)};return write(()=>S.db.doc("rooms/"+id).set(doc))}
async function xadd(id){const n=$(`#x-${id}-n`).value.trim(),a=numv($(`#x-${id}-a`).value);if(!n){toast("กรุณาใส่เหตุผล");return}if(a==null||a<=0){toast("กรุณาใส่จำนวนเงิน");return}
  const t=extraTarget(id);const items=[...(t.kind==="bill"?extraItems(t.b):pendingItems(id)),{amt:a,note:n}];
  if(await saveExtra(id,items)){[`x-${id}-n`,`x-${id}-a`].forEach(k=>{const e=document.getElementById(k);if(e){e.value="";delete e.dataset.dirty}});render();toast(`เพิ่ม "${n}" ${fmt(a)} บาท แล้ว (รวมใน${t.kind==="bill"?t.label:"บิลเดือนถัดไป"})`)}}
async function xdel(id,i){const t=extraTarget(id);const items=(t.kind==="bill"?extraItems(t.b):pendingItems(id)).filter((x,k)=>k!==+i);if(await saveExtra(id,items)){render();toast("ลบรายการแล้ว")}}
/* ตอนจดมิเตอร์บิลใหม่: ดึงรายการที่รอไว้ของห้องมารวม */
function withPending(doc,old,id){if(old&&old.month)return null;const p=pendingItems(id);if(!p.length||doc.tenantKey!==roomInfo(id).tenantKey)return null;
  const items=[...extraItems(doc),...p];doc.extraItems=JSON.stringify(items);doc.extra=r2(items.reduce((a,x)=>a+x.amt,0));delete doc.extraNote;return id}
async function clearPending(ids){for(const id of ids){const d={...(S.rooms[id]||{})};delete d.pendingItems;await S.db.doc("rooms/"+id).set(d)}}
const keyOf=i=>i.keyFee!=null&&i.keyFee!==""?+i.keyFee:S.settings.keyFee;
function dShortBE(iso){if(!iso)return"";const[y,m,d]=iso.split("-").map(Number);return `${d}-${m}-${String(y+543).slice(2)}`}
/* ใบสรุปผู้เช่า: ห้อง วันที่เข้า ชื่อ มัดจำ กุญแจ ค่าเช่า เบอร์โทร (A4 แนวตั้ง แผ่นละ 36 ห้อง) */
function rosterPages(B){const st=S.settings;const rs=ROOMS.filter(r=>r.b===B);const per=36;const pages=[];let tDep=0,tKey=0,tRent=0;
  const rows=rs.map(r=>{const i=roomInfo(r.id);if(i.vacant)return `<tr class="rv"><td><b>${r.label}</b></td><td></td><td>(ว่าง)</td><td></td><td></td><td class="n">${fmt(i.aircon?st.rentAir:st.rentNormal)}</td><td></td></tr>`;
    const dep=i.deposit??(i.aircon?st.depAir:st.depNormal),k=keyOf(i),rent=i.aircon?st.rentAir:st.rentNormal;tDep+=+dep||0;tKey+=+k||0;tRent+=rent;
    return `<tr><td><b>${r.label}</b></td><td>${dShortBE(i.moveIn)}</td><td>${esc(i.tenant)}</td><td class="n">${fmt(dep)}</td><td class="n">${fmt(k)}</td><td class="n">${fmt(rent)}${i.aircon?" (แอร์)":""}</td><td>${esc(i.phone||"")}</td></tr>`});
  for(let p=0;p<rows.length;p+=per){const last=p+per>=rows.length;
    pages.push(`<div class="ov rs"><h4>ใบสรุปผู้เช่า ตึก ${B}</h4><div class="meta">ข้อมูล ณ วันที่ ${dLabel(todayISO())} · หน้า ${p/per+1}/${Math.ceil(rows.length/per)}</div>
    <table class="rst"><thead><tr><th style="width:62px">ห้อง</th><th style="width:72px">วันที่</th><th>ชื่อผู้พัก</th><th style="width:66px">มัดจำ</th><th style="width:54px">กุญแจ</th><th style="width:92px">ค่าเช่า</th><th style="width:110px">เบอร์โทร</th></tr></thead>
    <tbody>${rows.slice(p,p+per).join("")}${last?`<tr class="rt"><td colspan="3">รวมตึก ${B} (${rs.filter(r=>!roomInfo(r.id).vacant).length} ห้องมีผู้เช่า)</td><td class="n">${fmt(tDep)}</td><td class="n">${fmt(tKey)}</td><td class="n">${fmt(tRent)}</td><td></td></tr>`:""}</tbody></table></div>`)}
  return pages}
function vRooms(){const B=S.bld;
  return `${backBtn()}<h2 class="vtitle">ห้องและผู้เช่า</h2><p class="lead">แตะห้องเพื่อแก้ชื่อผู้เช่า ตั้งห้องแอร์ ย้ายเข้า-ออก และดูประวัติทุกเดือน</p>
  ${seg("bld",[["A","ตึก A"],["B","ตึก B"]],B)}
  ${S.airMode?"":`<div class="actions" style="margin-bottom:10px"><button class="btn ghost" data-act="pdfRoster" ${S.dl?"":"disabled"}>🖨 พิมพ์ใบสรุปผู้เช่า ตึก ${B}</button></div>`}
  ${S.airMode?`<div class="banner ok">แตะห้องเพื่อสลับ มีแอร์ / ไม่มีแอร์ ห้องที่เป็นสีเขียวคือห้องแอร์ (ใช้ตอนตั้งค่าครั้งแรก มัดจำจะตั้งตามประเภทห้อง)</div><button class="btn big" data-act="airMode">✓ ตั้งเสร็จแล้ว</button>`:`<button class="btn ghost" data-act="airMode" ${S.canWrite?"":"disabled"}>ตั้งห้องแอร์หลายห้องพร้อมกัน</button>`}
  ${FLOORS[B].map(f=>`<div class="floorh">ชั้น ${f}</div><div class="rgrid">${ROOMS.filter(r=>r.b===B&&r.f===f).map(r=>{const i=roomInfo(r.id);
    return `<button class="rbtn ${i.vacant?"vac":""} ${S.airMode&&i.aircon?"on":""}" data-act="${S.airMode?"airQuick":"go"}" data-v="${S.airMode?r.id:"room-"+r.id}" ${S.airMode?`aria-pressed="${i.aircon}"`:""}>${i.aircon?`<i class="air" style="font-style:normal">แอร์</i>`:""}<b>${r.label}</b><span>${i.vacant?"ว่าง":esc(i.tenant)||"ยังไม่ใส่ชื่อ"}</span></button>`}).join("")}</div>`).join("")}`}
function vRoom(id){const r=RBY[id];if(!r)return vRooms();const i=roomInfo(id);const st=S.settings;
  if(S.hist?.room!==id){S.hist={room:id,list:null};loadHist(id)}
  const dep=i.deposit??(i.aircon?st.depAir:st.depNormal);
  let form="";
  if(S.rmMode==="edit"||S.rmMode==="movein"){const mi=S.rmMode==="movein";
    form=`<div class="panel" style="margin-top:12px"><h3 style="margin-bottom:10px">${mi?"ผู้เช่าใหม่ย้ายเข้า":"แก้ไขข้อมูลผู้เช่า"}</h3>
    <div class="grid2"><div class="fld"><label for="rf-name">ชื่อผู้เช่า</label><input type="text" id="rf-name" value="${mi?"":esc(i.tenant)}"></div>
    <div class="fld"><label for="rf-phone">เบอร์โทร</label><input type="text" inputmode="tel" id="rf-phone" value="${mi?"":esc(i.phone)}"></div>
    <div class="fld"><label for="rf-in">วันที่เข้าอยู่</label><input type="date" id="rf-in" value="${mi?todayISO():esc(i.moveIn)}"></div>
    ${mi?"":`<div class="fld"><label for="rf-dep">มัดจำ (บาท)</label><input type="number" inputmode="numeric" id="rf-dep" value="${dep}"></div><div class="fld"><label for="rf-key">ค่ากุญแจ (บาท)</label><input type="number" inputmode="numeric" id="rf-key" value="${keyOf(i)}"></div>`}
    ${mi?`<div class="fld"><label for="rf-air">ห้องแอร์</label><select id="rf-air"><option value="0" ${!i.aircon?"selected":""}>ไม่มีแอร์ (${fmt(st.rentNormal)} บาท)</option><option value="1" ${i.aircon?"selected":""}>ติดแอร์ (${fmt(st.rentAir)} บาท)</option></select></div>`:""}</div>
    <p class="lead" id="rf-note">${mi?`เก็บค่ามัดจำ <b>${fmt(i.aircon?st.depAir:st.depNormal)}</b> + ค่ากุญแจ <b>${fmt(st.keyFee)}</b> บาท`:""}</p>
    <div class="actions"><button class="btn" data-act="saveRoom" data-v="${id}">บันทึก</button><button class="btn ghost" data-act="rmMode" data-v="">ยกเลิก</button></div></div>`}
  else if(S.rmMode==="moveout")form=`<div class="panel" style="margin-top:12px"><p style="margin-top:0">ยืนยันว่า <b>${esc(i.tenant)||"ผู้เช่า"}</b> ย้ายออกจากห้อง ${r.label}? ประวัติเดิมยังเก็บไว้ครบ</p>${owedHTML(id)}
    <div class="actions"><button class="btn danger" data-act="moveOut" data-v="${id}">ยืนยันย้ายออก</button><button class="btn ghost" data-act="rmMode" data-v="">ยกเลิก</button></div></div>`;
  const h=S.hist.list;
  return `
  <h2 class="vtitle">ห้อง ${r.label}${r.sub?` <span class="tag mute">${r.sub}</span>`:""}</h2>
  <div class="card"><dl class="kv"><dt>สถานะ</dt><dd>${i.vacant?"ห้องว่าง":"มีผู้เช่า"}</dd>${i.vacant?"":`<dt>ผู้เช่า</dt><dd>${esc(i.tenant)||"ยังไม่ใส่ชื่อ"}</dd><dt>เบอร์โทร</dt><dd>${esc(i.phone)||"-"}</dd><dt>เข้าอยู่</dt><dd>${dLabel(i.moveIn)||"-"}</dd>`}
    <dt>ประเภท</dt><dd>${i.aircon?"ห้องแอร์":"ห้องธรรมดา"} · ค่าเช่า ${fmt(i.aircon?st.rentAir:st.rentNormal)}</dd>${i.vacant?"":`<dt>มัดจำ</dt><dd>${fmt(dep)} + กุญแจ ${fmt(keyOf(i))}</dd>`}</dl>
    ${S.rmMode==="air"?`<div class="panel" style="margin-top:12px"><p style="margin-top:0">${i.aircon?`เอาแอร์ออกจากห้อง ${r.label}? ค่าเช่าจะเป็น <b>${fmt(st.rentNormal)}</b> บาท${i.vacant?"":` และคืนมัดจำ <b>${fmt(st.depAirUpgrade)}</b> บาท`}`:`ติดแอร์ห้อง ${r.label}? ค่าเช่าจะเป็น <b>${fmt(st.rentAir)}</b> บาท${i.vacant?"":` และเก็บมัดจำเพิ่ม <b>${fmt(st.depAirUpgrade)}</b> บาท`}`}</p>
      <div class="actions"><button class="btn" data-act="toggleAir" data-v="${id}">ยืนยัน</button><button class="btn ghost" data-act="rmMode" data-v="">ยกเลิก</button></div></div>`:
    `<button class="airsw" data-act="rmMode" data-v="air" aria-pressed="${i.aircon}" ${S.canWrite?"":"disabled"}><span>ห้องแอร์: ${i.aircon?"มีแอร์":"ไม่มีแอร์"}<small>แตะเพื่อ${i.aircon?"เอาแอร์ออก":"เปลี่ยนเป็นห้องแอร์"}</small></span><span class="k" aria-hidden="true"></span></button>`}
    <div class="actions" style="margin-top:12px">${i.vacant?`<button class="btn" data-act="rmMode" data-v="movein" ${S.canWrite?"":"disabled"}>ผู้เช่าใหม่ย้ายเข้า</button>`:
      `<button class="btn" data-act="rmMode" data-v="edit" ${S.canWrite?"":"disabled"}>แก้ไขข้อมูล</button><button class="btn danger" data-act="rmMode" data-v="moveout" ${S.canWrite?"":"disabled"}>ย้ายออก</button>`}</div>${form}</div>
  ${i.vacant?"":extraHTML(id)}
  <div class="sect"><h2>ประวัติรายเดือน</h2>${h==null?`<p class="lead">กำลังโหลดประวัติ…</p>`:h.length?histTable(h):`<p class="lead">ยังไม่มีประวัติ จะเริ่มมีเมื่อจดมิเตอร์ห้องนี้ครั้งแรก</p>`}</div>`}
async function loadHist(id){try{const s=await S.db.collection("bills").where("room","==",id).get();const list=s.docs.map(d=>d.data()).sort((a,b)=>b.month.localeCompare(a.month));
  if(S.hist?.room===id){S.hist.list=list;render()}}catch(e){if(S.hist?.room===id){S.hist.list=[];render()}}}
/* ประวัติรายเดือน: 5 คอลัมน์ พอดีจอ ไม่ต้องเลื่อนซ้ายขวา · ตัวเลขหลักตัวใหญ่ รายละเอียดตัวเล็กข้างใต้ */
function histTable(list){const map={};list.forEach(x=>map[billId(x.month,x.room)]=x);const get=(m,r)=>map[billId(m,r)]||getLive(m,r);const sup=RBY[list[0].room].sup;
  let lastT=null;const rows=list.map(b=>{const c=calc(b,get),an=anomaly(b,get);const aw=an.find(a=>a.k==="น้ำ"),ae=an.find(a=>a.k==="ไฟ");
    const tk=(b.tenantKey||"")+"|"+(b.tenant||"");let head="";if(tk!==lastT){head=`<tr class="hten"><td colspan="5">ผู้เช่า: <b>${esc(b.tenant)||"ไม่ทราบชื่อ (ผู้เช่าเดิม)"}</b></td></tr>`;lastT=tk}
    const extra=[`ค่าห้อง ${fmt(b.rent)}`,c.carryDue>0?`ค้างยกมา ${fmt(c.carryDue)}`:c.carryDue<0?`หักจ่ายเกิน ${fmt(-c.carryDue)}`:"",c.carryFee?`ปรับเดือนก่อน ${fmt(c.carryFee)}`:"",...extraItems(b).map(x=>`${esc(x.note)} ${fmt(x.amt)}`)].filter(Boolean);
    const total=b.paid!=null?b.expected:c.total;
    const pay=b.paid!=null?`<b>${dLabel(b.payDate)}</b>${b.paid!==total?`<small>รับ ${fmt(b.paid)}</small>`:""}${b.expected-b.paid>0?`<span class="tag warn">ค้าง ${fmt(b.expected-b.paid)}</span>`:""}${b.lateFee?`<span class="tag warn">ช้า ปรับ ${fmt(b.lateFee)}</span>`:""}`:`<span class="tag warn">ยังไม่จ่าย</span>`;
    return head+`<tr class="hm"><td><b>${mLabel(b.month)}</b></td>
     <td class="${aw?"hw":""}"><b>${fmt(c.wu)}</b> <span class="hu">หน่วย</span>${aw?" ⚠":""}<small>${fmt(c.wc)} บาท</small><small class="mt2">${fmt(b.wPrev)}→<wbr>${fmt(b.wCur)}${sup?`<br>${fmt(b.w2Prev)}→<wbr>${fmt(b.w2Cur)}`:""}</small></td>
     <td class="${ae?"hw":""}"><b>${fmt(c.eu)}</b> <span class="hu">หน่วย</span>${ae?" ⚠":""}<small>${fmt(c.ec)} บาท</small><small class="mt2">${fmt(b.ePrev)}→<wbr>${fmt(b.eCur)}</small></td>
     <td><b class="htot">${fmt(total)}</b>${extra.map(x=>`<small>${x}</small>`).join("")}</td><td class="hpay">${pay}</td></tr>
     ${b.payNote?`<tr class="hnote"><td></td><td colspan="4">📝 ${esc(b.payNote)}</td></tr>`:""}`}).join("");
  return `<p class="lead" style="margin-bottom:8px">⚠ = ใช้ต่างจากเดือนก่อนเกิน ${S.settings.threshold}% · ตัวเลขเล็กใต้หน่วย คือ เลขมิเตอร์ก่อน→หลัง</p>
  <div class="tbl-wrap"><table class="hx"><thead><tr><th>เดือน</th><th>💧 น้ำ</th><th>⚡ ไฟ</th><th>ยอดรวม</th><th>จ่ายเมื่อ</th></tr></thead><tbody>${rows}</tbody></table></div>`}
function histRow(b){const map={};S.hist.list.forEach(x=>map[billId(x.month,x.room)]=x);const get=(m,r)=>map[billId(m,r)]||getLive(m,r);
  const c=calc(b,get),open=S.histOpen===b.month,an=anomaly(b,get),sup=RBY[b.room].sup;
  return `<div><button class="hrow" data-act="histOpen" data-v="${b.month}" aria-expanded="${open}"><span><b>${mLabelFull(b.month)}</b> · ${esc(b.tenant)||"—"}${an.length?` <span class="tag warn">⚠ ผิดปกติ</span>`:""}</span>
   <span>${b.paid!=null?`<span class="tag">จ่าย ${dLabel(b.payDate)}</span>`:`<span class="tag warn">ยังไม่จ่าย</span>`} <b class="num">${fmt(b.paid??c.total)}</b> ${open?"▲":"▼"}</span></button>
   ${open?`<div class="panel"><div class="tbl-wrap"><table class="t"><tbody>
   <tr><td>ผู้เช่า</td><td>${esc(b.tenant)||"-"}</td></tr><tr><td>ค่าเช่าห้อง</td><td class="n">${fmt(b.rent)}</td></tr>
   <tr><td>มิเตอร์น้ำ${sup?" 1":""}</td><td class="n">${fmt(b.wPrev)} → ${fmt(b.wCur)}</td></tr>${sup?`<tr><td>มิเตอร์น้ำ 2</td><td class="n">${fmt(b.w2Prev)} → ${fmt(b.w2Cur)}</td></tr>`:""}
   <tr><td>ค่าน้ำ</td><td class="n">${fmt(c.wu)} หน่วย × ${fmt(c.r.waterRate)} = ${fmt(c.wc)}</td></tr>
   <tr><td>มิเตอร์ไฟ</td><td class="n">${fmt(b.ePrev)} → ${fmt(b.eCur)}</td></tr><tr><td>ค่าไฟ</td><td class="n">${fmt(c.eu)} หน่วย × ${fmt(c.r.elecRate)} = ${fmt(c.ec)}</td></tr>
   ${c.carry?`<tr><td>ยกมาจากเดือนก่อน</td><td class="n">${fmt(c.carry)}</td></tr>`:""}<tr><td><b>ยอดบิล</b></td><td class="n"><b>${fmt(c.total)}</b></td></tr>
   ${b.paid!=null?`<tr><td>ค่าปรับจ่ายช้า (ไปบิลเดือนหน้า)</td><td class="n">${fmt(b.lateFee)}</td></tr><tr><td>วันที่จ่าย</td><td class="n">${dLabel(b.payDate)}</td></tr><tr><td>ผู้จ่าย</td><td class="n">${esc(b.payer)}</td></tr><tr><td><b>รับเงินจริง</b></td><td class="n"><b>${fmt(b.paid)}</b></td></tr>`:""}
   ${an.map(a=>`<tr><td colspan="2"><span class="tag warn">⚠ ${a.k}${a.pct>0?"เพิ่ม":"ลด"} ${Math.abs(a.pct).toFixed(0)}% จากเดือนก่อน (${fmt(a.o)} → ${fmt(a.c)} หน่วย)</span></td></tr>`).join("")}
   </tbody></table></div></div>`:""}</div>`}
async function saveRoom(id){const i=roomInfo(id),st=S.settings;const mi=S.rmMode==="movein";const air=mi?$("#rf-air").value==="1":i.aircon;
  const doc={...(S.rooms[id]||{}),tenant:$("#rf-name").value.trim(),phone:$("#rf-phone").value.trim(),moveIn:$("#rf-in").value,aircon:air,vacant:false};
  let msg="บันทึกข้อมูลห้องแล้ว";
  if(mi){doc.tenantKey="k-"+id+"-"+Date.now().toString(36);doc.deposit=air?st.depAir:st.depNormal;doc.keyFee=st.keyFee}
  else{doc.tenantKey=i.tenantKey;const dep=numv($("#rf-dep")?.value)??i.deposit??(i.aircon?st.depAir:st.depNormal);doc.deposit=dep;const kf=numv($("#rf-key")?.value);if(kf!=null)doc.keyFee=kf;
    if(air&&!i.aircon){doc.deposit=dep+st.depAirUpgrade;msg=`เปลี่ยนเป็นห้องแอร์แล้ว เก็บมัดจำเพิ่ม ${fmt(st.depAirUpgrade)} บาท`}}
  if(await write(()=>S.db.doc("rooms/"+id).set(doc),msg)){S.rmMode=null;render()}}
/* เปลี่ยนบนหน้าจอทันที แล้วส่งไปเก็บใน Sheet ตามหลัง (ถ้าไม่สำเร็จจะย้อนกลับและแจ้งเตือน) */
async function setAir(id,on,doc,msg){if(!S.canWrite){toast("บัญชีนี้ดูได้อย่างเดียว บันทึกไม่ได้");return false}
  const b=S.month===mKey(todayISO())?bill(id):null;const rent=on?S.settings.rentAir:S.settings.rentNormal;const oldRoom=S.rooms[id],oldBill=b?{...b}:null;
  const fixBill=b&&b.paid==null&&b.rent!==rent;
  S.rooms[id]=doc;if(fixBill)localSet("bills",billId(S.month,id),{...b,rent},false);S.pending++;render();if(msg)toast(msg);
  try{await API.call("setDoc",S.pin,"rooms",id,JSON.stringify(doc));if(fixBill)await API.call("setDoc",S.pin,"bills",billId(S.month,id),JSON.stringify({...oldBill,rent}));return true}
  catch(e){if(oldRoom)S.rooms[id]=oldRoom;else delete S.rooms[id];if(fixBill)localSet("bills",billId(S.month,id),oldBill,false);toast(`บันทึก ${RBY[id].label} ไม่สำเร็จ ตรวจอินเทอร์เน็ตแล้วลองอีกครั้ง`);return false}
  finally{S.pending--;render()}}
async function toggleAir(id){const i=roomInfo(id),st=S.settings;const on=!i.aircon;const doc={...i,...(S.rooms[id]||{}),aircon:on};let msg;
  if(!i.vacant){const dep=i.deposit??(i.aircon?st.depAir:st.depNormal);doc.deposit=on?dep+st.depAirUpgrade:Math.max(0,dep-st.depAirUpgrade);
    msg=on?`เปลี่ยนเป็นห้องแอร์แล้ว เก็บมัดจำเพิ่ม ${fmt(st.depAirUpgrade)} บาท`:`เอาแอร์ออกแล้ว คืนมัดจำ ${fmt(st.depAirUpgrade)} บาท`}
  else msg=on?"ตั้งเป็นห้องแอร์แล้ว":"ตั้งเป็นห้องไม่มีแอร์แล้ว";
  S.rmMode=null;await setAir(id,on,doc,msg)}
async function airQuick(id){const i=roomInfo(id),st=S.settings;const on=!i.aircon;const doc={...i,...(S.rooms[id]||{}),aircon:on};
  if(!i.vacant)doc.deposit=on?st.depAir:st.depNormal;await setAir(id,on,doc,`${RBY[id].label}: ${on?"ห้องแอร์":"ไม่มีแอร์"}`)}
async function moveOut(id){const doc={...(S.rooms[id]||{}),...roomInfo(id),vacant:true,aircon:false,tenant:"",phone:"",moveIn:"",deposit:null};
  if(await write(()=>S.db.doc("rooms/"+id).set(doc),"บันทึกย้ายออกแล้ว")){S.rmMode=null;render()}}

/* rates */
function vRates(){const r=rates(S.month),st=S.settings;const f=(id,lab,v,step)=>`<div class="fld"><label for="${id}">${lab}</label><input type="number" inputmode="decimal" step="${step||"any"}" id="${id}" value="${v}"></div>`;
  return `${backBtn()}<h2 class="vtitle">ตั้งค่าราคา</h2>${isPast()?`<div class="banner warn">🔒 ${mLabelFull(S.month)} เป็นเดือนที่ผ่านมาแล้ว ดูได้อย่างเดียว แก้ไขไม่ได้</div>`:""}
  <div class="card"><h3 style="margin-bottom:6px">ค่าน้ำ-ค่าไฟ ของเดือน ${mLabelFull(S.month)}</h3><p class="lead">เปลี่ยนแล้วมีผลเฉพาะเดือนนี้และเดือนถัดไป เดือนที่ผ่านมาใช้ราคาเดิมของเดือนนั้น ไม่เปลี่ยน<br>ห้องที่จ่ายเงินแล้ว ยอดจะไม่เปลี่ยน</p>
  <fieldset class="fs" ${isPast()?"disabled":""}><div class="grid2">${f("st-w","ค่าน้ำ บาท/หน่วย",r.waterRate)}${f("st-e","ค่าไฟ บาท/หน่วย",r.elecRate)}</div>
  ${isPast()?"":`<button class="btn" data-act="saveRates" ${S.canWrite?"":"disabled"}>บันทึกราคาน้ำ-ไฟ</button>`}</fieldset></div>
  <div class="card" style="margin-top:14px"><h3 style="margin-bottom:6px">ค่าปรับจ่ายช้า ของบิลเดือน ${mLabelFull(S.month)}</h3><p class="lead">ตอนนี้: ${lateText(S.month)} บาท · ค่าปรับจะไปรวมในบิลเดือนถัดไป<br>เปลี่ยนแล้วมีผลกับบิลเดือนนี้และเดือนถัดไป เดือนที่ผ่านมาไม่เปลี่ยน</p>
  <fieldset class="fs" ${isPast()?"disabled":""}><div class="grid2">${(()=>{const lr=lateRule(S.month);return f("lt-d1","จ่ายตรงเวลาได้ถึงวันที่",lr.lateDay1,1)+f("lt-d2","ปรับขั้นที่ 1 ถึงวันที่",lr.lateDay2,1)+f("lt-f1","ค่าปรับขั้นที่ 1 (บาท)",lr.lateFee1,1)+f("lt-f2","ค่าปรับหลังจากนั้น (บาท)",lr.lateFee2,1)})()}</div>
  ${isPast()?"":`<button class="btn" data-act="saveLate" ${S.canWrite?"":"disabled"}>บันทึกค่าปรับ</button>`}</fieldset></div>
  <div class="card" style="margin-top:14px"><h3 style="margin-bottom:6px">ค่าเช่าและมัดจำ</h3><p class="lead">ค่าเช่าใหม่จะใช้กับบิลที่จดมิเตอร์หลังจากนี้</p>
  <div class="grid2">${f("st-rn","ค่าเช่าห้องธรรมดา",st.rentNormal,1)}${f("st-ra","ค่าเช่าห้องแอร์",st.rentAir,1)}${f("st-dn","มัดจำห้องธรรมดา",st.depNormal,1)}${f("st-da","มัดจำห้องแอร์",st.depAir,1)}${f("st-du","มัดจำเพิ่มเมื่อเปลี่ยนเป็นแอร์",st.depAirUpgrade,1)}${f("st-k","ค่ากุญแจ",st.keyFee,1)}</div>
  <h3 style="margin:8px 0 6px">การแจ้งเตือนค่าน้ำ-ไฟผิดปกติ</h3><p class="lead">เตือนเมื่อหน่วยที่ใช้ต่างจากเดือนก่อนเกินกี่เปอร์เซ็นต์ (เทียบเฉพาะผู้เช่าคนเดิม)</p>
  <div class="grid2">${f("st-th","เกณฑ์แจ้งเตือน (%)",st.threshold,1)}</div>
  <button class="btn" data-act="saveSettings" ${S.canWrite?"":"disabled"}>บันทึก</button></div>
  <div class="card" style="margin-top:14px"><h3 style="margin-bottom:6px">บัญชีรับโอน (แสดงในใบแจ้ง)</h3><p class="lead">แก้แล้วจะใช้กับใบแจ้งที่พิมพ์ครั้งต่อไป ตรวจเลขบัญชีให้ถูกก่อนกดบันทึก</p>
  <div class="grid2"><div class="fld"><label for="bk-bank">ธนาคาร</label><input type="text" id="bk-bank" value="${esc(bankInfo().bank)}"></div><div class="fld"><label for="bk-no">เลขบัญชี</label><input type="text" inputmode="numeric" id="bk-no" value="${esc(bankInfo().no)}"></div></div>
  <div class="fld" style="margin-bottom:10px"><label for="bk-name">ชื่อบัญชี</label><input type="text" id="bk-name" value="${esc(bankInfo().name)}"></div>
  <button class="btn" data-act="saveBank" ${S.canWrite?"":"disabled"}>บันทึกบัญชีรับโอน</button></div>`}
/* ขยายแถวกลาง (และลดแถวบน/ล่าง) เพื่อชดเชยการที่เครื่องพิมพ์ย่อหน้ากระดาษ — ค่า cutAdjust = ใบบนสูงกว่าใบกลางกี่ มม. (สะสม) */
async function saveBank(){const b=$("#bk-bank").value.trim(),n=$("#bk-name").value.trim(),no=$("#bk-no").value.trim();
  if(!b||!n||!no){toast("กรุณากรอกให้ครบทั้ง 3 ช่อง");return}
  await write(()=>S.db.doc("config/settings").set({...S.settings,bank:b,bankName:n,bankNo:no}),"บันทึกบัญชีรับโอนแล้ว")}
async function saveLate(){if(isPast()){toast("เดือนที่ผ่านมาแล้ว แก้ไขไม่ได้");return}const g=k=>numv($("#"+k).value);
  const v={lateDay1:g("lt-d1"),lateDay2:g("lt-d2"),lateFee1:g("lt-f1"),lateFee2:g("lt-f2")};
  if(Object.values(v).some(x=>x==null||x<0)){toast("กรุณากรอกให้ครบทุกช่อง");return}
  if(v.lateDay1<1||v.lateDay1>=v.lateDay2||v.lateDay2>31){toast("วันที่ต้องเรียงกัน เช่น ตรงเวลาถึงวันที่ 8 และขั้นที่ 1 ถึงวันที่ 15");return}
  const r=rates(S.month);await write(async()=>{await S.db.doc("months/"+S.month).set({waterRate:r.waterRate,elecRate:r.elecRate,...(S.months[S.month]||{}),...v});await S.db.doc("config/settings").set({...S.settings,...v})},"บันทึกค่าปรับแล้ว")}
async function saveRates(){if(isPast()){toast("เดือนที่ผ่านมาแล้ว แก้ไขไม่ได้");return}const w=numv($("#st-w").value),e=numv($("#st-e").value);if(w==null||e==null||w<0||e<0){toast("กรุณาใส่ราคาให้ถูกต้อง");return}
  await write(async()=>{await S.db.doc("months/"+S.month).set({...lateRule(S.month),...(S.months[S.month]||{}),waterRate:w,elecRate:e});await S.db.doc("config/settings").set({...S.settings,waterRate:w,elecRate:e})},"บันทึกราคาน้ำ-ไฟแล้ว")}
async function saveSettings(){const g=id=>numv($("#"+id).value);const v={rentNormal:g("st-rn"),rentAir:g("st-ra"),depNormal:g("st-dn"),depAir:g("st-da"),depAirUpgrade:g("st-du"),keyFee:g("st-k"),threshold:g("st-th")};
  if(Object.values(v).some(x=>x==null||x<0)){toast("กรุณากรอกให้ครบทุกช่อง");return}
  await write(()=>S.db.doc("config/settings").set({...S.settings,...v}),"บันทึกแล้ว")}

/* ---------- pdf ---------- */
/* ---------- units report ---------- */
/* คอลัมน์ "ม.ค." = หน่วยที่ใช้ในเดือน ม.ค. ซึ่งจดและเก็บเงินในบิลวันที่ 1 ก.พ. (เหมือนตาราง Excel เดิม) */
function repMonths(y){const out=[];for(let i=1;i<=12;i++)out.push(addMonth(y+"-"+String(i).padStart(2,"0"),1));return out}
async function loadReport(y){S.rep=S.rep||{};if(S.rep[y]?.loading||S.rep[y]?.bills)return;S.rep[y]={loading:true};render();
  try{const r=JSON.parse(await API.call("getBills",S.pin,JSON.stringify(repMonths(y))));S.rep[y]={bills:r}}catch(e){S.rep[y]={error:true}}render()}
function repUnits(y,room,kind){const B=S.rep[y].bills;return repMonths(y).map(m=>{const b=B[billId(m,room)];if(!b||b.wCur==null)return null;
  if(kind==="w"){return(b.wCur-b.wPrev)+(RBY[room].sup?((b.w2Cur??0)-(b.w2Prev??0)):0)}return b.eCur-b.ePrev})}
function repTable(y,B,f,kind,paper){const rs=ROOMS.filter(r=>r.b===B&&r.f===f);const tot=Array(12).fill(0);let grand=0;const has=Array(12).fill(false);
  const rows=rs.map(r=>{const u=repUnits(y,r.id,kind);let s=0;u.forEach((x,i)=>{if(x!=null){tot[i]+=x;s+=x;has[i]=true}});grand+=s;
    return `<tr><td><b>${r.label}</b></td>${u.map(x=>`<td class="n">${x==null?"":fmt(x)}</td>`).join("")}<td class="n"><b>${fmt(s)}</b></td></tr>`}).join("");
  const cap=`${kind==="w"?"💧 น้ำ":"⚡ ไฟ"} · ตึก ${B} ชั้น ${f}`;
  return `${paper?`<div class="rp-cap">${cap.replace(/💧 |⚡ /,"")} (หน่วย)</div>`:`<div class="floorh">${cap}</div>`}<div class="${paper?"":"tbl-wrap"}"><table class="${paper?"rp":"t ht rt"}"><thead><tr><th>ห้อง</th>${TM.map(m=>`<th>${m}</th>`).join("")}<th>รวม</th></tr></thead>
  <tbody>${rows}<tr class="foot"><td>รวมชั้น ${f}</td>${tot.map((x,i)=>`<td class="n">${has[i]?fmt(x):""}</td>`).join("")}<td class="n">${fmt(grand)}</td></tr></tbody></table></div>`}
function vReport(){const y=S.repYear||(S.repYear=+mKey(todayISO()).slice(0,4));const B=S.repBld||"A",K=S.repKind||"w";loadReport(y);const st=S.rep?.[y];
  let body;if(!st||st.loading)body=`<p class="lead">กำลังโหลดข้อมูลปี ${y+543}…</p>`;else if(st.error)body=`<div class="banner bad">โหลดข้อมูลไม่สำเร็จ <button class="btn ghost" data-act="repReload">ลองอีกครั้ง</button></div>`;
  else body=FLOORS[B].map(f=>repTable(y,B,f,K,false)).join("");
  return `${backBtn()}<h2 class="vtitle">รายงานหน่วยน้ำ-ไฟ</h2><p class="lead">หน่วยที่แต่ละห้องใช้ในแต่ละเดือน (เช่น ช่อง ม.ค. = หน่วยที่ใช้ในเดือน ม.ค. ซึ่งจดมิเตอร์และเก็บเงินในบิลวันที่ 1 ก.พ.)</p>
  <div class="pyear" style="justify-content:flex-start;margin-bottom:10px"><button data-act="repYear" data-v="-1" aria-label="ปีก่อน">‹</button><b>ปี ${y+543}</b><button data-act="repYear" data-v="1" aria-label="ปีถัดไป">›</button></div>
  ${seg("repBld",[["A","ตึก A"],["B","ตึก B"]],B)}${seg("repKind",[["w","💧 น้ำ"],["e","⚡ ไฟ"]],K)}
  <button class="btn big" data-act="pdfRep" ${st?.bills?"":"disabled"}>สร้างไฟล์รายงานตึก ${B} ปี ${y+543} (น้ำ + ไฟ, ${FLOORS[B].length} แผ่น)</button>${body}`}
function repPages(y,B){return FLOORS[B].map(f=>`<div class="ov"><h4>รายงานหน่วยน้ำ-ไฟ · ตึก ${B} ชั้น ${f} · ปี ${y+543}</h4><div class="meta">หน่วยที่ใช้ในแต่ละเดือน (จดและเก็บเงินในบิลเดือนถัดไป)</div>${repTable(y,B,f,"w",true)}<div style="height:14px"></div>${repTable(y,B,f,"e",true)}</div>`)}
async function makePdf(pages,filename){
    if(!window.jspdf||!window.html2canvas){toast("โหลดเครื่องมือสร้างไฟล์ไม่สำเร็จ ลองเปิดหน้านี้ใหม่");return}
  const host=document.createElement("div");host.className="print-host";document.body.appendChild(host);
  try{busy("กำลังเตรียมไฟล์…");try{await document.fonts.ready}catch(e){}
    const pdf=new window.jspdf.jsPDF({unit:"mm",format:"a4",compress:true});try{pdf.viewerPreferences({PrintScaling:"None"},true)}catch(e){}
    for(let i=0;i<pages.length;i++){busy(`กำลังสร้างไฟล์ หน้า ${i+1} จาก ${pages.length}`);host.innerHTML=`<div class="pp">${pages[i]}</div>`;
      const c=await window.html2canvas(host.firstChild,{scale:2,backgroundColor:"#ffffff",logging:false});if(i)pdf.addPage();pdf.addImage(c.toDataURL("image/jpeg",0.9),"JPEG",0,0,210,297)}
    busy(null);showDownload(pdf.output("blob"),filename)}
  catch(e){busy(null);toast(e?.code==="declined"?"ยกเลิกการบันทึกไฟล์":"สร้างไฟล์ไม่สำเร็จ ลองอีกครั้ง")}
  finally{busy(null);host.remove()}}

function showDownload(blob,name){busy(null);const url=URL.createObjectURL(blob);document.querySelector(".dlbox")?.remove();const o=document.createElement("div");o.className="busy dlbox";o.dataset.url=url;
  o.innerHTML=`<div><p style="margin:0 0 14px">ไฟล์พร้อมแล้ว</p><a class="btn big" style="display:flex;align-items:center;justify-content:center;text-decoration:none" href="${url}" download="${esc(name)}">⬇ ดาวน์โหลด PDF</a>
  <a class="btn ghost big" style="display:flex;align-items:center;justify-content:center;text-decoration:none;margin-top:10px" href="${url}" target="_blank" rel="noopener">เปิดดูไฟล์</a>
  <button class="btn ghost big" style="margin-top:10px" data-act="closeDl">ปิด</button><p style="font-weight:400;font-size:.9rem;margin:12px 0 0;text-align:left">ตอนสั่งพิมพ์ ให้เลือกขนาด <b>"ขนาดจริง" / "Actual size" / "100%"</b> (ไม่ใช่ "Fit" หรือ "พอดีหน้า") ใบที่ตัดจะได้เท่ากันทุกใบ</p></div>`;document.body.appendChild(o)}
async function saveAllMeters(after){if(isPast()){toast("เดือนที่ผ่านมาแล้ว แก้ไขไม่ได้");return}const ids=dirtyRooms();
  if(!ids.length){toast("ยังไม่มีห้องที่กรอกเพิ่ม");if(after)after();return}
  const docs=[],bad=[],pend=[];ids.forEach(id=>{const d=draftFrom(id);if(d.wCur==null&&d.eCur==null&&d.w2Cur==null)return;const e=checkDraft(d);if(e){bad.push(RBY[id].label);return}
    const old=bill(id)||{};const doc={...old,...d,updatedAt:new Date().toISOString()};if(!RBY[id].sup){delete doc.w2Prev;delete doc.w2Cur}const pr=withPending(doc,bill(id),id);if(pr)pend.push(pr);docs.push({id:billId(S.month,id),doc})});
  if(!docs.length){toast("ตรวจเลขห้อง: "+bad.join(", "));return}
  busy(`กำลังบันทึก ${docs.length} ห้อง…`);
  const ok=await write(async()=>{await ensureMonth(S.month);await API.call("setMany",S.pin,"bills",JSON.stringify(docs));docs.forEach(x=>localSet("bills",x.id,x.doc,false));await clearPending(pend)});
  busy(null);
  if(ok){docs.forEach(x=>document.querySelectorAll(`[data-room="${x.doc.room}"][data-keep]`).forEach(i=>delete i.dataset.dirty));render();
    toast(`บันทึกแล้ว ${docs.length} ห้อง`+(bad.length?` · ยังไม่บันทึก ${bad.join(", ")} (เลขไม่ถูกต้อง)`:""));if(after&&!bad.length)after()}}
let leaveFn=null;
function guard(fn){if(S.view!=="meter"||!dirtyRooms().length){fn();return true}leaveFn=fn;busy("");const o=$(".busy");
  o.innerHTML=`<div><p style="margin:0 0 14px">ยังไม่ได้บันทึกเลขมิเตอร์ ${dirtyRooms().length} ห้อง</p><button class="btn big" data-act="leaveSave">บันทึกก่อน</button>
  <button class="btn danger big" style="margin-top:10px" data-act="leaveDrop">ไม่บันทึก</button><button class="btn ghost big" style="margin-top:10px" data-act="leaveStay">อยู่หน้านี้ต่อ</button></div>`;return false}
/* ---------- events ---------- */
const SCROLL={};
function switchTo(v){SCROLL[S.view]=window.scrollY;S.view=v;S.hist=null;S.airMode=false;S.payOpen=null;S.rmMode=null;S.histOpen=null;S.confirmUnpay=null;render();
  const y=v.startsWith("room-")?0:(SCROLL[v]||0);window.scrollTo(0,y);requestAnimationFrame(()=>window.scrollTo(0,y))}
function go(v){if(v===S.view)return;guard(()=>{switchTo(v);if(location.hash!=="#"+v)location.hash=v})}
window.addEventListener("hashchange",()=>{const h=location.hash.slice(1)||"home";if(h===S.view)return;if(!guard(()=>{switchTo(h);if(location.hash!=="#"+h)location.hash=h}))location.replace("#"+S.view)});
document.addEventListener("click",e=>{const t=e.target.closest("[data-act]");if(!t)return;const a=t.dataset.act,v=t.dataset.v;
  if(a==="go")go(v);
  else if(a==="pick"){S.pick=!S.pick;S.pickYear=+S.month.slice(0,4);render()}
  else if(a==="pickYear"){S.pickYear+=+v;render()}
  else if(a==="pickMonth")guard(()=>{S.pick=false;S.month=v;S.payOpen=null;S.hist=null;if(S.db)subBills();render()});
  else if(a==="month")guard(()=>{S.pick=false;S.month=addMonth(S.month,+v);S.payOpen=null;S.hist=null;if(S.db)subBills();render()});
  else if(a==="saveAllMeters")saveAllMeters();
  else if(a==="editPrev"){S.showPrev.add(v);render();document.getElementById(`in-${v}-wPrev`)?.focus()}
  else if(a==="jumpFloor")document.getElementById("fl-"+v)?.scrollIntoView({block:"start"});
  else if(a==="leaveSave"){busy(null);const f=leaveFn;leaveFn=null;saveAllMeters(f)}
  else if(a==="leaveDrop"){busy(null);document.querySelectorAll("input[data-dirty]").forEach(i=>delete i.dataset.dirty);const f=leaveFn;leaveFn=null;f&&f()}
  else if(a==="leaveStay"){busy(null);leaveFn=null}
  else if(a==="seg"&&S.view==="meter"&&t.dataset.k==="bld"){guard(()=>{S.bld=v;store("gv_bld",v);render();window.scrollTo(0,0)})}
  else if(a==="seg"){const k=t.dataset.k;S[k]=k==="floor"?+v:v;if(k==="bld"){S.floor=1;store("gv_bld",v)}if(k==="floor")store("gv_floor",v);S.payOpen=null;render()}
  else if(a==="saveMeter")saveMeter(v);
  else if(a==="pdfInv")pdfInv();
  else if(a==="payOpen"){S.payOpen=S.payOpen===v?null:v;S.confirmUnpay=null;render()}
  else if(a==="pay")pay(v);else if(a==="qsave")qsave(v);else if(a==="qedit"){S.qEdit.add(v);render();const e=document.getElementById(`q-${v}-d`);if(e){e.focus();e.select?.()}}else if(a==="qcancel"){S.qEdit.delete(v);render()}else if(a==="qunpay"){S.qEdit.delete(v);unpay(v)}else if(a==="qsaveAll")qsaveAll();else if(a==="ovMode"){S.quick=!!v;render()}
  else if(a==="unpayAsk"){S.confirmUnpay=v;render()}else if(a==="unpayNo"){S.confirmUnpay=null;render()}else if(a==="unpay")unpay(v);
  else if(a==="pdfRc")pdfRc([rcItem(v,false)],`ใบเสร็จ-${RBY[v].label}-${mLabel(S.month).replace(" ","")}.pdf`);
  else if(a==="pdfRcAll"){const rs=ROOMS.filter(r=>r.b===S.payBld&&bill(r.id));pdfRc(rs.map(r=>rcItem(r.id,true)),`ใบเสร็จ-ตึก${S.payBld}-${mLabel(S.month).replace(" ","")}.pdf`)}
  else if(a==="pdfOv")makePdf([ovHTML(S.ovBld)],`ใบจดวันจ่าย-ตึก${S.ovBld}-${mLabel(S.month).replace(" ","")}.pdf`);
  else if(a==="rmMode"){S.rmMode=v||null;render()}
  else if(a==="saveRoom")saveRoom(v);else if(a==="toggleAir")toggleAir(v);else if(a==="airQuick")airQuick(v);else if(a==="airMode"){S.airMode=!S.airMode;render()}else if(a==="moveOut")moveOut(v);
  else if(a==="histOpen"){S.histOpen=S.histOpen===v?null:v;render()}
  else if(a==="pin"){S.pin=$("#pin-in").value.trim();store("gv_pin",S.pin);S.needPin=false;render();refresh()}
  else if(a==="closeDl"){const o=$(".dlbox");if(o){const u=o.dataset.url;o.remove();if(u)setTimeout(()=>URL.revokeObjectURL(u),1000)}}
  else if(a==="repYear"){S.repYear+=+v;render()}else if(a==="repReload"){delete S.rep[S.repYear];render()}
  else if(a==="pdfRep")makePdf(repPages(S.repYear,S.repBld||"A"),`รายงานน้ำไฟ-ตึก${S.repBld||"A"}-${S.repYear+543}.pdf`);
  else if(a==="warnToggle"){S.warnOpen=!S.warnOpen;store("gv_warn",S.warnOpen?"1":"");render()}
  else if(a==="saveLate")saveLate();else if(a==="pdfRoster")makePdf(rosterPages(S.bld),`ใบสรุปผู้เช่า-ตึก${S.bld}-${dShortBE(todayISO())}.pdf`);else if(a==="xadd")xadd(v);else if(a==="xdel")xdel(v,t.dataset.i);
  else if(a==="saveRates")saveRates();else if(a==="saveBank")saveBank();else if(a==="saveSettings")saveSettings();
});
document.addEventListener("input",e=>{const t=e.target;if(t.dataset&&"keep" in t.dataset)t.dataset.dirty="1";
  if(t.dataset?.room)updatePreview(t.dataset.room);if(t.id==="pf-date")payLive();if(t.dataset?.q)qLive(t.dataset.q);
  if(t.id==="rf-air"&&S.rmMode==="movein"){const air=t.value==="1";$("#rf-note").innerHTML=`เก็บค่ามัดจำ <b>${fmt(air?S.settings.depAir:S.settings.depNormal)}</b> + ค่ากุญแจ <b>${fmt(S.settings.keyFee)}</b> บาท`}});
document.addEventListener("keydown",e=>{if(e.key==="Enter"&&e.target.id==="pin-in")document.querySelector('[data-act="pin"]')?.click();
  if(e.key==="Enter"&&e.target.dataset?.q&&e.target.tagName==="INPUT"){e.preventDefault();qsave(e.target.dataset.q);return}
  if(e.key==="Enter"&&e.target.matches?.("input.mcur,input.mprev")){e.preventDefault();const all=[...document.querySelectorAll("input.mcur,input.mprev")].filter(i=>!i.hidden);const k=all.indexOf(e.target);if(all[k+1]){all[k+1].focus();all[k+1].select?.()}else e.target.blur()}});
document.addEventListener("change",e=>{if(e.target.id==="ph-in"||e.target.id==="ph-cam"){const f=e.target.files;readPhotos(f).finally(()=>{e.target.value=""});return}if(e.target.id==="rf-air")e.target.dispatchEvent(new Event("input",{bubbles:true}));if(e.target.id==="pf-date")payLive()});

S.view=location.hash.slice(1)||"home";
boot();
