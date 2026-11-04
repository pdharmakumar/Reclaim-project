// Run only on a throwaway origin/profile: these checks reset local demo data.
localStorage.removeItem('found.demo.v1');
const {service:s}=await import('/src/service.js');
const results=[];
function check(name, fn) { try { fn(); results.push('PASS '+name); } catch(e) { results.push('FAIL '+name+': '+e.message); } }
function assert(ok,message='Assertion failed') { if (!ok) throw Error(message); }
function denied(fn) { let threw=false; try { fn(); } catch { threw=true; } assert(threw,'Expected permission or validation error'); }
const originalCount=s.items().length;
check('Sample listings are available',()=>assert(originalCount===6));
check('Users cannot edit another student’s report',()=>denied(()=>s.updateItem('headphones',s.item('headphones'))));
check('Users cannot delete another student’s report',()=>denied(()=>s.deleteItem('headphones')));
check('Users cannot claim their own item',()=>denied(()=>s.requestClaim('keys','These are my keys, with my unique keychain.')));
check('Claim verification requires detail',()=>denied(()=>s.requestClaim('headphones','mine')));
let claimId, conversationId;
check('Claim creates a private conversation',()=>{ claimId=s.requestClaim('headphones','The left ear cushion has a small mark on the inside.'); const c=s.claims().find(c=>c.id===claimId); conversationId=c.conversationId; assert(s.conversations().length===1); });
check('Duplicate active claims are prevented',()=>denied(()=>s.requestClaim('headphones','The left ear cushion has a small mark on the inside.')));
check('Claimants cannot approve their own claims',()=>denied(()=>s.changeClaim(claimId,'Under Review')));
check('Messages persist with sender and unread state',()=>{ s.sendMessage(conversationId,'Hello! I think these are mine.'); assert(s.messages(conversationId).length===1); });
s.switchUser('sam');
check('Non-participants cannot see conversations or claims',()=>{ assert(s.conversations().length===0&&s.claims().length===0); denied(()=>s.messages(conversationId)); denied(()=>s.sendMessage(conversationId,'intrusion')); denied(()=>s.changeClaim(claimId,'Under Review')); });
s.switchUser('jamie');
check('Finder receives unread messages',()=>assert(s.unread()===1));
check('Read status clears unread count',()=>{s.markRead(conversationId);assert(s.unread()===0);});
check('Finder replies in the same conversation',()=>{s.sendMessage(conversationId,'Thanks, that detail matches.');assert(s.messages(conversationId).length===2);});
check('Claims cannot skip review',()=>denied(()=>s.changeClaim(claimId,'Approved')));
check('Finder reviews and approves',()=>{s.changeClaim(claimId,'Under Review');s.changeClaim(claimId,'Approved');assert(s.claims()[0].status==='Approved');});
check('Pickup locations must be approved examples',()=>denied(()=>s.arrangePickup(claimId,'My home',new Date(Date.now()+86400000).toISOString())));
check('Pickup time must be in the future',()=>denied(()=>s.arrangePickup(claimId,'Main office','2020-01-01T12:00')));
check('Finder proposes pickup',()=>{s.arrangePickup(claimId,'Library front desk',new Date(Date.now()+86400000).toISOString());assert(s.claims()[0].pickup.confirmedBy.length===1);});
check('Finder cannot complete before both confirm',()=>denied(()=>s.changeClaim(claimId,'Completed')));
s.switchUser('alex');
check('Claimant sees the reply and can confirm pickup',()=>{assert(s.unread()===1);s.confirmPickup(claimId);assert(s.claims()[0].status==='Ready for Pickup');});
check('Claimant cannot mark item collected',()=>denied(()=>s.changeClaim(claimId,'Completed')));
s.switchUser('jamie');
check('Collection completes claim and returns listing',()=>{s.changeClaim(claimId,'Completed');assert(s.item('headphones').status==='Returned');});
s.switchUser('alex');
check('Closed items cannot be claimed',()=>denied(()=>s.requestClaim('headphones','I have enough detail, but this is already returned.')));
const data={title:'Test notebook',description:'A purple notebook with a small star on its front cover.',category:'School supplies',color:'Purple',brand:'',date:new Date().toLocaleDateString('en-CA'),location:'Library',type:'lost',photos:[],additional:''};
let reportId;
check('Invalid reports fail validation',()=>denied(()=>s.createItem({...data,title:'x'})));
check('Reports reject unsafe photo sources',()=>denied(()=>s.createItem({...data,photos:['javascript:alert(1)']})));
check('Reports create, edit, and change status',()=>{reportId=s.createItem(data);s.updateItem(reportId,{...data,title:'Updated notebook'});s.setItemStatus(reportId,'Found');assert(s.item(reportId).title==='Updated notebook'&&s.item(reportId).status==='Found');});
check('Public items never include claim verification',()=>assert(s.items().every(i=>!('verification' in i))));
check('Storage failures do not mutate in-memory state',()=>{const set=Storage.prototype.setItem;Storage.prototype.setItem=()=>{throw Error('quota')};try{denied(()=>s.createItem(data));assert(s.items().length===originalCount+1)}finally{Storage.prototype.setItem=set}});
check('Deleting a listing removes linked private data',()=>{s.deleteItem(reportId);s.switchUser('jamie');s.deleteItem('headphones');assert(s.claims().length===0&&s.conversations().length===0);});
const failures=results.filter(r=>r.startsWith('FAIL'));
document.querySelector('#results').textContent=results.join('\n')+`\n\n${results.length-failures.length}/${results.length} passed`;
document.body.dataset.testStatus=failures.length?'failed':'passed';
localStorage.removeItem('found.demo.v1');
