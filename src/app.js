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
import { auth, mountAuth, loginLink, safeNext } from './pages/auth.js';
let currentPage='';
function navigation(page=currentPage) {
  const links=[['','Home'],['browse','Browse'],['report','Report'],['my-reports','My Reports'],['claims','Claims'],['messages','Messages']];
  const user=service.currentUser(), unread=service.unread();
  document.querySelector('#header').innerHTML=`<div class="demo-banner"><span class="live-dot"></span> A little less lost. A little more connected. <span>Your campus lost-and-found.</span><a href="#/profile">Your account ${icon('arrow')}</a></div><div class="navbar wrap"><a href="#/" class="logo" aria-label="Reclaim. home">Reclaim<span>.</span><span class="logo-mark">✳</span></a><nav aria-label="Main navigation" id="main-nav">${links.map(([path,label]) => `<a href="#/${path}" ${page===path?'aria-current="page"':''}>${label}${path==='messages'&&unread?`<span class="nav-count" aria-label="${unread} unread messages">${unread}</span>`:''}</a>`).join('')}</nav><a href="#/profile" class="profile-link ${page==='profile'?'active':''}" aria-label="${user ? `Profile for ${esc(user.name)}` : 'Log in to Reclaim'}"><span class="avatar small">${user ? esc(user.initials) : icon('user')}</span><span>${user ? 'Profile' : 'Log in'}</span></a><button id="menu-toggle" class="icon-button" aria-controls="main-nav" aria-expanded="false" aria-label="Toggle navigation">${icon('menu')}</button></div>`;
  document.querySelector('#menu-toggle').onclick=e => { const b=e.currentTarget, expanded=b.getAttribute('aria-expanded')==='true'; b.setAttribute('aria-expanded',String(!expanded)); document.querySelector('#main-nav').classList.toggle('open',!expanded); };
}
document.querySelector('#footer').innerHTML=`<div class="wrap footer-main"><div><a class="logo" href="#/">Reclaim<span>.</span></a><p>Lost it? Let’s find it.</p></div><div class="footer-note">A little less lost.<br>A little more connected.</div><nav aria-label="Footer"><a href="#/browse">Browse items ${icon('arrow')}</a><a href="#/report">Report an item ${icon('arrow')}</a><a href="#/profile">Your account ${icon('arrow')}</a></nav></div><div class="wrap footer-bottom"><span>Made for the everyday things that matter.</span><span>Your campus lost-and-found</span><span>© ${new Date().getFullYear()} Reclaim.</span></div>`;
function render({focus=false}={}) {
  const [path,query='']=(location.hash.slice(1)||'/').split('?'), [page='',itemId]=path.split('/').filter(Boolean), params=new URLSearchParams(query);
  if (['report','my-reports','claims','messages','profile','success'].includes(page) && !service.currentUser()) {
    location.replace(loginLink(location.hash.slice(1))); return;
  }
  if (['login','signup','recover'].includes(page) && service.currentUser()) {
    location.replace('#' + safeNext(params.get('next'))); return;
  }
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
      case 'profile': main.innerHTML=profile(); mountProfile(); break;
      case 'login': case 'signup': case 'recover': main.innerHTML=auth(page,params); mountAuth(page,params); break;
      default: main.innerHTML=`<section class="wrap page-section">${empty('A little lost?', 'This page isn’t here, but your next happy reunion could be.', '<a class="btn primary" href="#/">Head home</a>')}</section>`;
    }
  } catch(e) { main.innerHTML=`<section class="wrap page-section">${empty('Something needs another try.',e.message,'<a class="btn primary" href="#/">Return home</a>')}</section>`; }
  document.title=`${({'':'Home',browse:'Browse items',item:'Item details',report:'Report an item','my-reports':'My reports',claims:'Claims',messages:'Messages',profile:'Profile',success:'Report saved',login:'Log in',signup:'Create account',recover:'Reset password'})[page]||'Page not found'} — Reclaim.`;
  if(focus) { window.scrollTo(0,0); main.focus({preventScroll:true}); }
}
let loading = 0;
async function loadPage({focus=false}={}) {
  const attempt = ++loading;
  try {
    await service.refresh();
    if (attempt === loading) render({focus});
  } catch (error) {
    if (attempt !== loading) return;
    navigation();
    document.querySelector('#main').innerHTML = `<section class="wrap page-section">${empty('Let’s reconnect.',error.message,'<button class="btn primary" id="retry-page">Try again</button>')}</section>`;
    document.querySelector('#retry-page').onclick = () => loadPage({focus:true});
  }
}
window.addEventListener('hashchange',()=> { document.querySelector('#modal').close(); loadPage({focus:true}); });
window.addEventListener('beforeunload',e => { if(currentPage==='report'&&hasReportDraft()) { e.preventDefault(); e.returnValue=''; } });
window.addEventListener('reclaim:session-expired',()=> { document.querySelector('#modal').close(); location.replace(loginLink(location.hash.slice(1))); toast('Your session ended. Log in to continue.'); });
window.addEventListener('reclaim:account-change',()=> { document.querySelector('#modal').close(); document.querySelector('#main').innerHTML='<section class="wrap page-section"><p>Updating your account…</p></section>'; toast('Your account changed in another tab.'); loadPage(); });
window.addEventListener('focus',()=> { if (!['report','login','signup','recover'].includes(currentPage) && !document.querySelector('#modal').open) loadPage(); });
// Refresh incoming conversations without interrupting a message being written.
setInterval(()=> { if (currentPage==='messages' && !document.hidden && !document.querySelector('#message-text')?.value && !document.querySelector('#modal').open) loadPage(); },15000);
navigation();
document.querySelector('#main').innerHTML='<section class="wrap page-section" aria-live="polite"><p>Connecting to Reclaim…</p></section>';
loadPage();
