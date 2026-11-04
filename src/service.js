import { seedItems, users, pickupLocations, categories } from './data.js';
const KEY = 'found.demo.v1';
const initial = () => ({ version: 1, userId: 'alex', items: structuredClone(seedItems), claims: [], conversations: [], messages: [] });
let db;
try { db = JSON.parse(localStorage.getItem(KEY)) || initial(); if (db.version !== 1 || !Array.isArray(db.items) || !users.some(u => u.id === db.userId)) throw Error(); }
catch { db = initial(); }
const id = () => crypto.randomUUID();
const requireValue = (ok, message) => { if (!ok) throw new Error(message); };
const save = mutation => {
  const next = structuredClone(db);
  const result = mutation(next);
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { throw new Error('Your browser storage is full or unavailable. Remove a few photos, or enable browser storage, and try again.'); }
  db = next;
  window.dispatchEvent(new Event('found:change'));
  return result;
};
const itemIn = (d, itemId) => { const item = d.items.find(i => i.id === itemId); requireValue(item, 'This listing is no longer available.'); return item; };
const conversationIn = (d, conversationId) => { const c = d.conversations.find(c => c.id === conversationId); requireValue(c?.participantIds.includes(d.userId), 'This conversation is private.'); return c; };
const claimIn = (d, claimId) => { const c = d.claims.find(c => c.id === claimId); requireValue(c && [c.claimantId, itemIn(d, c.itemId).creatorId].includes(d.userId), 'This claim is private.'); return c; };
function validateItem(data) {
  requireValue(data.title?.trim().length >= 3 && data.title.length <= 100, 'Add an item title between 3 and 100 characters.');
  requireValue(data.description?.trim().length >= 20 && data.description.length <= 3000, 'Add a description between 20 and 3,000 characters.');
  requireValue(categories.includes(data.category), 'Choose a category.');
  requireValue(['lost', 'found'].includes(data.type), 'Choose lost or found.');
  requireValue(data.location?.trim() && data.location.length <= 150, 'Add a campus location (up to 150 characters).');
  requireValue(/^\d{4}-\d{2}-\d{2}$/.test(data.date) && Number.isFinite(Date.parse(data.date)) && new Date(data.date).toISOString().slice(0,10) === data.date && data.date <= new Date().toLocaleDateString('en-CA'), 'Choose a valid date that is not in the future.');
  requireValue((data.color || '').length <= 60 && (data.brand || '').length <= 80 && (data.additional || '').length <= 1500, 'Some of the extra details are too long.');
  requireValue(data.photos.length <= 6 && data.photos.every(p => /^data:image\/(jpeg|png|webp);base64,/.test(p) || /^\/public\/[a-z]+\.jpg$/.test(p)), 'Use up to six supported photos.');
}
const publicFields = data => Object.fromEntries(['title','description','category','color','brand','location','date','type','photos','additional'].map(key => [key, typeof data[key] === 'string' ? data[key].trim() : data[key] ?? '']));
export const service = {
  currentUser: () => users.find(u => u.id === db.userId),
  switchUser: userId => save(d => { requireValue(users.some(u => u.id === userId), 'Unknown demo account.'); d.userId = userId; }),
  items: () => structuredClone(db.items),
  item: itemId => structuredClone(db.items.find(i => i.id === itemId)),
  createItem: data => save(d => { validateItem(data); const item = { ...publicFields(data), id: id(), creatorId: d.userId, status: data.type === 'found' ? 'Available' : 'Open' }; d.items.unshift(item); return item.id; }),
  updateItem: (itemId, data) => save(d => { const item = itemIn(d, itemId); requireValue(item.creatorId === d.userId, 'Only the reporter can edit this listing.'); validateItem(data); if (item.type !== data.type) { requireValue(!d.claims.some(c => c.itemId===itemId && !['Declined','Completed'].includes(c.status)), 'A listing with active claims cannot change its lost/found type.'); if (!['Returned','Closed'].includes(item.status)) item.status=data.type==='found'?'Available':'Open'; } Object.assign(item, publicFields(data)); }),
  setItemStatus: (itemId, status) => save(d => { const item = itemIn(d, itemId); requireValue(item.creatorId === d.userId, 'Only the reporter can change this listing.'); requireValue(['Open', 'Available', 'Found', 'Returned', 'Closed'].includes(status), 'Invalid status.'); item.status = status; }),
  deleteItem: itemId => save(d => { requireValue(itemIn(d, itemId).creatorId === d.userId, 'Only the reporter can remove this listing.'); const conversationIds = d.conversations.filter(c => c.itemId === itemId).map(c => c.id); d.items = d.items.filter(i => i.id !== itemId); d.claims = d.claims.filter(c => c.itemId !== itemId); d.conversations = d.conversations.filter(c => c.itemId !== itemId); d.messages = d.messages.filter(m => !conversationIds.includes(m.conversationId)); }),
  conversations: () => structuredClone(db.conversations.filter(c => c.participantIds.includes(db.userId))),
  messages: conversationId => { conversationIn(db, conversationId); return structuredClone(db.messages.filter(m => m.conversationId === conversationId)); },
  unread: () => db.messages.filter(m => m.senderId !== db.userId && !m.readBy.includes(db.userId) && db.conversations.some(c => c.id === m.conversationId && c.participantIds.includes(db.userId))).length,
  contact: itemId => save(d => {
    const item = itemIn(d, itemId); requireValue(item.creatorId !== d.userId, 'This is your listing.');
    requireValue(!['Returned', 'Closed'].includes(item.status), 'This listing is closed.');
    let c = d.conversations.find(c => c.itemId === itemId && c.participantIds.includes(d.userId));
    if (!c) { c = { id: id(), itemId, participantIds: [d.userId, item.creatorId], createdAt: new Date().toISOString() }; d.conversations.push(c); }
    return c.id;
  }),
  sendMessage: (conversationId, text) => save(d => { conversationIn(d, conversationId); requireValue(text.trim().length > 0 && text.length <= 2000, 'Write a message of up to 2,000 characters.'); d.messages.push({ id: id(), conversationId, senderId: d.userId, text: text.trim(), timestamp: new Date().toISOString(), readBy: [d.userId] }); }),
  markRead: conversationId => save(d => { conversationIn(d, conversationId); d.messages.filter(m => m.conversationId === conversationId).forEach(m => { if (!m.readBy.includes(d.userId)) m.readBy.push(d.userId); }); }),
  claims: () => structuredClone(db.claims.filter(c => [c.claimantId, itemIn(db, c.itemId).creatorId].includes(db.userId))),
  requestClaim: (itemId, verification) => save(d => {
    const item = itemIn(d, itemId);
    requireValue(item.type === 'found' && item.status === 'Available' && item.creatorId !== d.userId, 'This item cannot be claimed.');
    requireValue(!d.claims.some(c => c.itemId === itemId && c.claimantId === d.userId && c.status !== 'Declined'), 'You already have an active claim for this item.');
    requireValue(verification.trim().length >= 20 && verification.length <= 2000, 'Explain ownership in 20–2,000 characters.');
    let conversation = d.conversations.find(c => c.itemId === itemId && c.participantIds.includes(d.userId));
    if (!conversation) { conversation = { id: id(), itemId, participantIds: [d.userId, item.creatorId], createdAt: new Date().toISOString() }; d.conversations.push(conversation); }
    const claim = { id: id(), itemId, claimantId: d.userId, status: 'Request Submitted', verification: verification.trim(), conversationId: conversation.id, createdAt: new Date().toISOString(), pickup: null };
    d.claims.push(claim); return claim.id;
  }),
  changeClaim: (claimId, status) => save(d => {
    const c = claimIn(d, claimId), item = itemIn(d, c.itemId);
    requireValue(item.creatorId === d.userId, 'Only the finder can review or complete this claim.');
    const next = { 'Request Submitted': ['Under Review', 'Declined'], 'Under Review': ['Approved', 'Declined'], 'Ready for Pickup': ['Completed'] };
    requireValue(next[c.status]?.includes(status), 'This status change is not available.');
    if (status === 'Approved') { requireValue(item.status==='Available', 'This listing is no longer available to claim.'); requireValue(!d.claims.some(other => other.itemId === c.itemId && other.id !== c.id && ['Approved', 'Ready for Pickup', 'Completed'].includes(other.status)), 'Another claim has already been approved.'); }
    c.status = status;
    if (status === 'Completed') { item.status = 'Returned'; d.claims.filter(other => other.itemId === c.itemId && other.id !== c.id && !['Completed', 'Declined'].includes(other.status)).forEach(other => { other.status = 'Declined'; }); }
  }),
  arrangePickup: (claimId, location, time) => save(d => {
    const c = claimIn(d, claimId); requireValue(c.status === 'Approved', 'Pickup can be arranged after approval.');
    requireValue(pickupLocations.includes(location), 'Choose an approved demo pickup location.');
    requireValue(Number.isFinite(Date.parse(time)) && new Date(time) > new Date(), 'Choose a future pickup time.');
    c.pickup = { location, time, confirmedBy: [d.userId] };
  }),
  confirmPickup: claimId => save(d => { const c = claimIn(d, claimId); requireValue(c.status === 'Approved' && c.pickup, 'No pickup arrangement is awaiting confirmation.'); if (!c.pickup.confirmedBy.includes(d.userId)) c.pickup.confirmedBy.push(d.userId); if (c.pickup.confirmedBy.length === 2) c.status = 'Ready for Pickup'; }),
};
window.addEventListener('storage', e => { if (e.key === KEY && e.newValue) { try { const next = JSON.parse(e.newValue); if (next.version === 1) { db = next; window.dispatchEvent(new Event('found:external-change')); } } catch { /* Keep the last valid state. */ } } });
