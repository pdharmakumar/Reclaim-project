import { service } from './service.js';
import { icon } from './icons.js';
import { esc, toast, empty } from './components/ui.js';
import { home, mountHome } from './pages/home.js';
import { browse, mountBrowse } from './pages/browse.js';
import { detail, mountDetail } from './pages/detail.js';
import { report, mountReport, myReports, mountMyReports, success, hasReportDraft } from './pages/reports.js';
import { claims, mountClaims } from './pages/claims.js';
import { messages, mountMessages } from './pages/messages.js';
import { profile, mountProfile } from './pages/profile.js';
let currentPage='';
function navigation(page=currentPage) {
  const links=[['','Home'],['browse','Browse'],['report','Report'],['my-reports','My Reports'],['claims','Claims'],['messages','Messages']];
  const user=service.currentUser(), unread=service.unread();
  document.querySelector('#header').innerHTML=`<div class="demo-banner"><span class="live-dot"></span> A campus concept, ready to explore. <span>Local demo · Your data stays in this browser.</span><a href="#/profile">Try demo accounts ${icon('arrow')}</a></div><div class="navbar wrap"><a href="#/" class="logo" aria-label="Reclaim. home">Reclaim<span>.</span><span class="logo-mark">✳</span></a><nav aria-label="Main navigation" id="main-nav">${links.map(([path,label]) => `<a href="#/${path}" ${page===path?'aria-current="page"':''}>${label}${path==='messages'&&unread?`<span class="nav-count" aria-label="${unread} unread messages">${unread}</span>`:''}</a>`).join('')}</nav><a href="#/profile" class="profile-link ${page==='profile'?'active':''}" aria-label="Profile for ${esc(user.name)}"><span class="avatar small">${user.initials}</span><span>Profile</span></a><button id="menu-toggle" class="icon-button" aria-controls="main-nav" aria-expanded="false" aria-label="Toggle navigation">${icon('menu')}</button></div>`;
  document.querySelector('#menu-toggle').onclick=e => { const b=e.currentTarget, expanded=b.getAttribute('aria-expanded')==='true'; b.setAttribute('aria-expanded',String(!expanded)); document.querySelector('#main-nav').classList.toggle('open',!expanded); };
}
document.querySelector('#footer').innerHTML=`<div class="wrap footer-main"><div><a class="logo" href="#/">Reclaim<span>.</span></a><p>Lost it? Let’s find it.</p></div><div class="footer-note">A little less lost.<br>A little more connected.</div><nav aria-label="Footer"><a href="#/browse">Browse items ${icon('arrow')}</a><a href="#/report">Report an item ${icon('arrow')}</a><a href="#/profile">About this demo ${icon('arrow')}</a></nav></div><div class="wrap footer-bottom"><span>Made for the everyday things that matter.</span><span>School-use demo · Example campus locations</span><span>© ${new Date().getFullYear()} Reclaim.</span></div>`;
function render({focus=false}={}) {
  const [path,query='']=(location.hash.slice(1)||'/').split('?'), [page='',itemId]=path.split('/').filter(Boolean), params=new URLSearchParams(query);
  currentPage=page; navigation();
  const main=document.querySelector('#main');
  try {
    switch(page) {
      case '': main.innerHTML=home(); mountHome(); break;
      case 'browse': main.innerHTML=browse(params); mountBrowse(params); break;
      case 'item': main.innerHTML=detail(itemId); mountDetail(itemId); break;
      case 'report': main.innerHTML=report(itemId,params); mountReport(); break;
      case 'my-reports': main.innerHTML=myReports(); mountMyReports(render); break;
      case 'success': main.innerHTML=success(itemId); break;
      case 'claims': main.innerHTML=claims(); mountClaims(render); break;
      case 'messages': main.innerHTML=messages(itemId); mountMessages(itemId,navigation); break;
      case 'profile': main.innerHTML=profile(); mountProfile(render); break;
      default: main.innerHTML=`<section class="wrap page-section">${empty('A little lost?', 'This page isn’t here, but your next happy reunion could be.', '<a class="btn primary" href="#/">Head home</a>')}</section>`;
    }
  } catch(e) { main.innerHTML=`<section class="wrap page-section">${empty('Something needs another try.',e.message,'<a class="btn primary" href="#/">Return home</a>')}</section>`; }
  document.title=`${({'':'Home',browse:'Browse items',item:'Item details',report:'Report an item','my-reports':'My reports',claims:'Claims',messages:'Messages',profile:'Profile',success:'Report saved'})[page]||'Page not found'} — Reclaim.`;
  if(focus) { window.scrollTo(0,0); main.focus({preventScroll:true}); }
}
window.addEventListener('hashchange',()=>render({focus:true}));
window.addEventListener('beforeunload',e => { if(currentPage==='report'&&hasReportDraft()) { e.preventDefault(); e.returnValue=''; } });
window.addEventListener('reclaim:external-change',()=> { if(currentPage==='report'&&hasReportDraft()) { toast('Demo data changed in another tab. Finish your draft before switching accounts.'); return; } render(); });
render();
