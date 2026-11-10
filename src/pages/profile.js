import { service } from '../service.js';
import { icon } from '../icons.js';
import { esc, toast } from '../components/ui.js';
export function profile() {
  const user = service.currentUser();
  return `<section class="wrap page-section profile-page"><div class="page-heading"><div class="eyebrow">YOUR CAMPUS CONNECTION</div><h1>Hey, ${esc(user.name.split(' ')[0])}<span class="lime-period">.</span></h1><p>A little less lost. A little more connected.</p></div><div class="profile-layout"><div class="profile-card"><span class="avatar big">${esc(user.initials)}</span><h2>${esc(user.name)}</h2><p>${esc(user.email)}</p><span class="badge">Your Reclaim account</span><div class="profile-stats"><a href="#/my-reports"><strong>${service.items().filter(i => i.creatorId===user.id).length}</strong>Reports</a><a href="#/claims"><strong>${service.claims().length}</strong>Claims</a><a href="#/messages"><strong>${service.unread()}</strong>Unread messages</a></div></div><div class="profile-demo"><h2>Your corner of campus.</h2><p>Your reports, claims, and conversations stay connected to this account when you sign in on another device.</p><div class="notice">${icon('shield')} Your email stays private. Other people see your display name on your reports and conversations.</div><div class="profile-account-links"><a class="btn primary" href="#/my-reports">My reports ${icon('arrow')}</a><a class="btn secondary" href="#/messages">${icon('message')} Open messages</a></div><h3>Keep your account close.</h3><p>Keep the recovery code from sign-up somewhere safe. You can use it to reset your password if you forget it.</p><button class="btn secondary" id="logout">Log out ${icon('right')}</button><p id="logout-error" role="alert" class="form-error"></p></div></div></section>`;
}
export function mountProfile() {
  const button = document.querySelector('#logout');
  button.onclick = async () => {
    button.disabled = true;
    try { await service.logout(); location.hash = '/login'; toast('You’re logged out.'); }
    catch (error) { document.querySelector('#logout-error').textContent = error.message; button.disabled = false; }
  };
}
