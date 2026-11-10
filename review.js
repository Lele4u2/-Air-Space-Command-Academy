
/* Command Review / Mission Inbox — local exercise simulation, no real email. */
(function(){
"use strict";
if(typeof V==="undefined"||typeof TABS==="undefined"||typeof draw!=="function")return;
const KEY="asa_command_review_v1";
let items=[];
try{const p=JSON.parse(localStorage.getItem(KEY)||"[]");if(Array.isArray(p))items=p.slice(0,80)}catch(e){}
let current=null;
let modalOpen=false;
const safe=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(items.slice(0,80)))}catch(e){}};
const now=()=>new Date().toLocaleString();
const shortTime=t=>new Date(t).toLocaleString();
const id=()=>"ASCA-"+Date.now().toString(36).toUpperCase()+"-"+Math.random().toString(36).slice(2,5).toUpperCase();
function dedupe(a){return [...new Set(a.filter(Boolean))]}
function evidence(type){
 const issues=[],notes=[],data={};
 if(type==="strike"){
   const m=PM[FP.m];data.mission=m?.t||"Strike Package";data.objective=m?.b||"";data.effect=FP.eff||"Not selected";
   data.aircraft=byId[FP.ac]?.name||"Not selected";data.weapon=W[FP.w]?.n||"Not selected";
   data.support=FP.sup.map(x=>SUP[x]?.[0]||x);data.threats=FP.thr.map(x=>THR[x]||x);
   if(!FP.eff)issues.push("Step 1: Choose the desired effect.");
   if(FP.eff&&FP.eff!==m.e)issues.push("Step 1: Recheck the requested effect against the scenario.");
   if(!FP.ac)issues.push("Step 2: Select an aircraft.");
   if(!FP.w)issues.push("Step 2: Select a weapon category.");
   if(FP.ac&&FP.w&&!W[FP.w].ac.includes(FP.ac))issues.push("Step 2: The selected exercise aircraft and weapon are not listed as compatible.");
   if(["bsu49","bsu50"].includes(FP.w))issues.push("Step 2: This entry is a component, not a complete weapon.");
   for(const x of m.thr)if(!FP.thr.includes(x))issues.push("Step 3: Review "+(THR[x]||x)+".");
   for(const x of m.crit)if(!FP.sup.includes(x))issues.push("Step 4: Missing required support: "+(SUP[x]?.[0]||x)+".");
   for(const x of m.sup)if(!FP.sup.includes(x)&&!m.crit.includes(x))notes.push("Consider additional exercise support: "+(SUP[x]?.[0]||x)+".");
   if(FP.step<3)issues.push("Finish all four packaging steps before submission.");
   notes.push("This is a fictional educational review, not a real-world operational approval.");
 }else if(type==="impact"){
   const t=Object.keys(IMPACT_TYPES);
   data.mission="Five-Day Humanitarian Airlift";data.objective="Deliver "+IP.needed.toLocaleString()+" usable lb and evacuate "+IP.needsPatients+" patients";
   data.aircraft=t.map(k=>IMPACT_TYPES[k].short+": "+IP.fleet[k]+" cargo, "+IP.med[k]+" medical").join("; ");
   data.support=["Cargo receiving crews: "+IP.teams,"Usable supply quality: "+IP.quality+"%","Airport: "+IMPACT_AIRPORTS[IP.airport]];
   data.budget=IP.budget+" exercise points";data.cargo=IP.stock+" lb remaining in inventory";
   issues.push(...impactValidation());
   const canCargo=t.reduce((n,k)=>n+(IMPACT_TYPES[k].airports.includes(IP.airport)?IP.fleet[k]*IMPACT_TYPES[k].training:0),0);
   const medSeats=t.reduce((n,k)=>n+(IMPACT_TYPES[k].airports.includes(IP.airport)?IP.med[k]*IMPACT_TYPES[k].patients:0),0);
   if(!canCargo)issues.push("No available cargo aircraft can operate at the selected airfield.");
   if(!medSeats)issues.push("No available medical evacuation aircraft can operate at this airfield.");
   if(IP.teams*60000<canCargo)notes.push("Receiving-team unload capacity may hold some cargo flights.");
   if(IP.stock<=0&&IP.rawDelivered===0)issues.push("No relief supplies available to move.");
   if(IP.quality<75)notes.push("Lower usable quality reduces the delivered mission impact.");
   if(IP.phase!=="setup")notes.push("The plan has already begun; this review reflects current settings.");
 }else{
   const m=MISSIONS[S.m];data.mission=m.t;data.objective=m.b;
   data.aircraft=S.picks.map(x=>byId[x]?.name||x).join(", ")||"None";
   data.support=m.need.map(x=>x[1]);
   const cats=new Set(S.picks.flatMap(k=>byId[k]?.tags||[]));
   for(const [k,desc] of m.need)if(!cats.has(k))issues.push("Missing capability: "+desc+".");
   if(!S.picks.length)issues.push("No assets selected.");
   if(S.picks.some(k=>byId[k]?.tags.some(t=>m.bad.includes(t))))notes.push("Consider removing aircraft that are unnecessary for this objective.");
 }
 return {data,issues:dedupe(issues),notes:dedupe(notes)};
}
function sourceName(type){return type==="strike"?"4-Step Strike Package":type==="impact"?"Operations Reality Lab":"Force Package Builder"}
function validate(type){let v=evidence(type);return v}
function makeSubmission(type){
 const v=validate(type),ticket={id:id(),type,date:new Date().toISOString(),status:v.issues.length?"Returned for Correction":"Approved — Training Simulation",data:v.data,issues:v.issues,notes:v.notes,history:[{label:"Submitted",at:now()},{label:"Under Review",at:now()},{label:v.issues.length?"Returned for Correction":"Approved (training only)",at:now()}]};
 items.unshift(ticket);items=items.slice(0,80);current=ticket.id;save();showModal(ticket);draw();
}
function status(ticket){return ticket.status.startsWith("Approved")?"approved":"returned"}
function images(ticket){const ids=[];
 if(ticket.type==="strike"&&ticket.data.aircraft){const a=A.find(a=>a.name===ticket.data.aircraft);if(a)ids.push(a.id)}
 if(ticket.type==="impact")ids.push("c5","c17","c130");
 if(ticket.type==="build"){for(const i of S.picks.slice(0,4))ids.push(i)}
 return ids.length?'<div class="review-asset-images">'+ids.map(i=>'<div>'+photo(i)+'<small>'+safe(byId[i]?.name||i)+'</small></div>').join("")+'</div>':"";
}
function details(ticket){
 const ok=status(ticket)==="approved",d=ticket.data;
 return '<div class="review-detail"><div class="review-stamp '+(ok?"approved":"returned")+'">'+(ok?"✓ TRAINING APPROVED":"⚠ RETURNED FOR CORRECTION")+'</div><div class="review-meta"><div><small>Ticket</small><strong>'+safe(ticket.id)+'</strong></div><div><small>Sent</small><strong>'+safe(shortTime(ticket.date))+'</strong></div><div><small>Source</small><strong>'+safe(sourceName(ticket.type))+'</strong></div></div><h3>'+safe(d.mission)+'</h3><p><b>Objective:</b> '+safe(d.objective||"Not stated")+'</p><p><b>Aircraft / Assets:</b> '+safe(d.aircraft)+'</p>'+(d.weapon?'<p><b>Weapon:</b> '+safe(d.weapon)+'</p>':'')+(d.effect?'<p><b>Desired effect:</b> '+safe(d.effect)+'</p>':'')+(d.support?'<p><b>Support:</b> '+safe(Array.isArray(d.support)?d.support.join("; "):d.support)+'</p>':'')+images(ticket)+(ticket.issues.length?'<div class="review-alert"><h3><span class="review-led red"></span> RED LIGHT — '+ticket.issues.length+' ISSUE(S)</h3><ul class="review-issues">'+ticket.issues.map(x=>'<li>'+safe(x)+'</li>').join('')+'</ul></div>':'<div class="review-okay"><span class="review-led"></span> All required classroom checks passed. This is not external command authorization.</div>')+(ticket.notes.length?'<h3>Reviewer notes</h3><ul>'+ticket.notes.map(x=>'<li>'+safe(x)+'</li>').join('')+'</ul>':'')+'<h3>Message timeline</h3><ol>'+ticket.history.map(h=>'<li>'+safe(h.label)+' · '+safe(h.at)+'</li>').join('')+'</ol><div class="review-actions"><button class="review-secondary" data-review-source="'+ticket.type+'">↩ Open planning board</button><button data-review-copy="'+safe(ticket.id)+'">Copy submission</button></div></div>';
}
function showModal(t){
 modalOpen=true;document.getElementById("review-overlay")?.remove();
 const e=document.createElement("div");e.id="review-overlay";e.className="review-overlay";e.setAttribute("role","dialog");e.setAttribute("aria-modal","true");e.setAttribute("aria-label","Command review response");
 e.innerHTML='<div class="review-modal"><div class="review-head"><h2>📩 Command Review Response</h2><button data-review-close="1" aria-label="Close review">✕</button></div><p class="impact-note">In-game inbox simulation. This was NOT sent as a real email.</p>'+details(t)+'<div class="review-actions"><button class="review-primary" data-review-inbox="1">📥 Open Mission Inbox</button><button data-review-close="1">Close</button></div></div>';
 document.body.appendChild(e);e.querySelector("[data-review-close]")?.focus();
}
function closeModal(){document.getElementById("review-overlay")?.remove();modalOpen=false}
const intro='<div class="review-shell"><div class="review-head"><div><span class="ac-role">COMMAND DESK · SUBMISSION CENTER</span><h2>📩 Submit your plan for review</h2></div><span class="review-pill"><span class="review-led amber"></span>TRAINING MODE</span></div><p>Send your current plan to a simulated command review inbox. The system checks the exercise requirements and returns an approval or a bright red correction notice.</p><p class="impact-note">Submissions are stored in this browser only. No real email is sent.</p>';
function panel(type){
 const v=validate(type);
 return intro+'<div class="review-meta"><div><small>Mission</small><strong>'+safe(v.data.mission)+'</strong></div><div><small>Review status</small><strong>'+ (v.issues.length?'<span style="color:#ffa7a7">⚠ '+v.issues.length+' issues</span>':'<span style="color:#8ce9bc">✓ Ready to submit</span>')+'</strong></div><div><small>Inbox messages</small><strong>'+items.length+'</strong></div></div>'+(v.issues.length?'<div class="review-alert" role="status"><span class="review-led red"></span><b>RED LIGHT — PRE-SUBMISSION ALERT</b><p>Fix these items to receive training approval:</p><ul class="review-issues">'+v.issues.slice(0,7).map(x=>'<li>'+safe(x)+'</li>').join('')+'</ul>'+(v.issues.length>7?'<p>And '+(v.issues.length-7)+' more checks.</p>':'')+'</div>':'<div class="review-okay"><span class="review-led"></span><b>GREEN LIGHT — Required checks complete</b><p>You can submit for a simulated command review.</p></div>')+'<div class="review-actions"><button class="review-primary" data-review-submit="'+type+'">📨 Submit Mission Package</button><button class="review-secondary" data-review-inbox="1">📥 Command Inbox ('+items.length+')</button></div><p class="impact-note">Even if there are errors, you can submit to receive an official-looking in-game “Returned for Correction” message and learn what to fix.</p></div>';
}
function inbox(){
 const t=items.find(x=>x.id===current)||items[0];return '<div class="review-shell"><div class="review-head"><div><span class="ac-role">CLASSROOM SIMULATION · NOT REAL EMAIL</span><h2>📥 Command Mission Inbox</h2></div><span class="review-pill">'+items.length+' messages</span></div><p>Every submitted package is logged with its status, requirements, timestamp and reviewer feedback. Select a message to inspect it.</p><div class="review-actions"><button data-review-source="strike">4-Step Planning</button><button data-review-source="impact">Impact Lab</button><button data-review-source="build">General Package Builder</button></div></div>'+(items.length?'<div class="review-inbox"><div class="review-mail-list">'+items.map(t=>'<button class="review-mail '+(t.id===current?'selected':'')+'" data-review-open="'+safe(t.id)+'"><strong>'+(status(t)==="approved"?'🟢':'🔴')+' '+safe(t.data.mission)+'</strong><small>'+safe(t.status)+'</small><small>'+safe(shortTime(t.date))+' · '+safe(t.id)+'</small></button>').join('')+'</div>'+details(t)+'</div>':'<div class="review-shell"><h3>No submissions yet</h3><p>Open the Force Package Builder or Impact Lab, create a plan, and press Submit Mission Package.</p></div>');
}
V.inbox=inbox;
TABS.splice(2,0,["inbox","📥 Command Inbox"]);
for(const [v,type] of [["pkg","strike"],["impact","impact"],["build","build"]]){
 const old=V[v];if(typeof old!=="function")continue;
 V[v]=function(){return old()+panel(type)};
}
document.addEventListener("click",e=>{
 const b=e.target.closest("[data-review-submit],[data-review-close],[data-review-inbox],[data-review-open],[data-review-source],[data-review-copy]");
 if(!b)return;
 if(b.hasAttribute("data-review-submit"))makeSubmission(b.dataset.reviewSubmit);
 else if(b.hasAttribute("data-review-close"))closeModal();
 else if(b.hasAttribute("data-review-inbox")){closeModal();S.view="inbox";draw()}
 else if(b.hasAttribute("data-review-open")){current=b.dataset.reviewOpen;draw()}
 else if(b.hasAttribute("data-review-source")){closeModal();S.view={strike:"pkg",impact:"impact",build:"build"}[b.dataset.reviewSource]||"inbox";draw()}
 else if(b.hasAttribute("data-review-copy")){
 const t=items.find(x=>x.id===b.dataset.reviewCopy);if(t){const str=JSON.stringify(t,null,2);if(navigator.clipboard?.writeText)navigator.clipboard.writeText(str).then(()=>showToast("📋 Copied training review")).catch(()=>showToast("Copy unavailable in this browser"));else showToast("Copy requires browser clipboard access")}
 }
});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&modalOpen)closeModal()});
/* Keep review accessible from any game mode. */
const floating=document.createElement("button");floating.className="review-float";floating.innerHTML="📥 Command Inbox"+(items.some(x=>x.issues.length)?'<span class="review-badge">!</span>':'');floating.setAttribute("aria-label","Open command review inbox");floating.addEventListener("click",()=>{closeModal();S.view="inbox";draw()});document.body.appendChild(floating);
})();
