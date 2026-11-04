import { icon } from '../icons.js';
export const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const dateLabel = date => new Date(date + (date.length === 10 ? 'T12:00:00' : '')).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
export const badge = (text, type = '') => `<span class="badge ${esc(type || text.toLowerCase().replaceAll(' ', '-'))}"><i></i>${esc(text)}</span>`;
export const photo = (item, cls = '', index = 0) => `<img class="${cls}" src="${esc(item.photos[index] || '/public/placeholder.svg')}" alt="${esc(item.title)}" loading="lazy" data-fallback="true" />`;
export const empty = (title, description, action = '') => `<div class="empty">${icon('search')}<h2>${esc(title)}</h2><p>${esc(description)}</p>${action}</div>`;
export function card(item) {
  return `<a class="item-card" href="#/item/${esc(item.id)}"><div class="card-image">${photo(item)}${badge(item.type === 'found' ? 'Found' : 'Lost', item.type)}<span class="card-arrow">${icon('arrow')}</span></div><div class="card-content"><span class="eyebrow">${esc(item.category)}</span><h3>${esc(item.title)}</h3><p class="card-description">${esc(item.description)}</p><div class="card-location">${icon('pin')}${esc(item.location)}</div><div class="card-bottom"><span>${dateLabel(item.date)}</span><span class="status-dot ${item.status === 'Returned' ? 'returned' : ''}">${esc(item.status)}</span></div></div></a>`;
}
let timer;
export function toast(message) { const el = document.querySelector('#toast'); el.textContent = message; el.classList.add('show'); clearTimeout(timer); timer = setTimeout(() => el.classList.remove('show'), 4500); }
export function modal(title, body, onMount) {
  const dialog = document.querySelector('#modal');
  dialog.innerHTML = `<div class="modal-heading"><h2 id="modal-title">${esc(title)}</h2><button class="icon-button" aria-label="Close dialog" data-close>${icon('close')}</button></div>${body}`;
  dialog.querySelector('[data-close]').onclick = () => dialog.close();
  dialog.onclick = e => { if (e.target === dialog) { const r = dialog.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close(); } };
  dialog.showModal(); onMount?.(dialog);
}
export function confirm(title, description, action) {
  modal(title, `<p>${esc(description)}</p><div class="button-row"><button class="btn secondary" id="cancel">Keep listing</button><button class="btn danger" id="confirm">Remove listing</button></div>`, d => {
    d.querySelector('#cancel').onclick = () => d.close();
    d.querySelector('#confirm').onclick = () => { try { action(); d.close(); } catch (e) { toast(e.message); } };
  });
}
document.addEventListener('error', e => { if (e.target instanceof HTMLImageElement && e.target.dataset.fallback) { delete e.target.dataset.fallback; e.target.src = '/public/placeholder.svg'; } }, true);
