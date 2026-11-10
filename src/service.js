// Private account data is held in memory only. The server owns identity and permissions.
const blank = () => ({ user:null, users:[], items:[], claims:[], conversations:[], messages:[] });
let state = blank(), queue = Promise.resolve(), epoch = 0, demo = null;
let demoWanted = false;
try { demoWanted = sessionStorage.getItem('reclaim.mode') === 'demo'; } catch { /* Mode still works without browser storage. */ }
const clone = value => structuredClone(value);
const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('reclaim-session') : null;
function enqueue(action) { const task=queue.then(action); queue=task.catch(() => {}); return task; }

async function request(path, body) {
  let response;
  try {
    response = await fetch(path,{ credentials:'same-origin', cache:'no-store', ...(body ? {
      method:'POST', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify(body),
    } : {}) });
  } catch { throw new Error('Could not reach Reclaim. Check your connection and try again.'); }
  const data = await response.json().catch(() => ({ error:'Reclaim’s account service is unavailable. Please try again.' }));
  if (!response.ok) {
    if (response.status === 401 && path === '/api/action') {
      ++epoch;
      state = blank();
      window.dispatchEvent(new Event('reclaim:session-expired'));
    }
    throw new Error(data.error || 'This request could not be completed.');
  }
  return data;
}
const mutations = ['createItem','updateItem','setItemStatus','deleteItem','contact','sendMessage',
  'markRead','requestClaim','changeClaim','arrangePickup','confirmPickup'];
export const service = {
  isDemo: () => demo !== null,
  async startDemo() {
    ++epoch;
    demoWanted = true;
    demo = (await import('./demo-service.js')).demoService;
    state = blank();
    try { sessionStorage.setItem('reclaim.mode','demo'); } catch { /* In-memory mode remains usable. */ }
  },
  exitDemo() {
    ++epoch;
    demoWanted = false; demo = null; state = blank();
    try { sessionStorage.removeItem('reclaim.mode'); } catch { /* In-memory mode remains usable. */ }
  },
  switchDemoUser(id) {
    if (!demo) throw new Error('Open the demo first.');
    demo.switchUser(id);
  },
  async refresh() {
    if (demoWanted) { if (!demo) await service.startDemo(); return; }
    const version = epoch;
    await enqueue(async () => { const next = await request('/api/state'); if (version === epoch) state = next; });
  },
  async authenticate(action, fields) {
    if (demoWanted) service.exitDemo();
    const version = ++epoch;
    state=blank();
    return enqueue(async () => {
      const result = await request(`/api/auth/${action}`,fields);
      channel?.postMessage('changed');
      // Keep a new one-use recovery code visible even if the following read fails.
      let next;
      try { next = await request('/api/state'); }
      catch (error) { if (result.recoveryCode) return result; throw error; }
      if (version === epoch) state = next;
      return result;
    });
  },
  async logout() {
    if (demoWanted) { service.exitDemo(); return; }
    ++epoch;
    await enqueue(async () => { await request('/api/auth/logout',{}); state=blank(); channel?.postMessage('changed'); });
  },
  currentUser: () => demo ? clone(demo.currentUser()) : clone(state.user),
  user: id => demo ? clone(demo.user(id)) : clone(state.users.find(u => u.id === id)),
  items: () => demo ? demo.items() : clone(state.items),
  item: id => demo ? demo.item(id) : clone(state.items.find(i => i.id === id)),
  claims: () => demo ? demo.claims() : clone(state.claims),
  conversations: () => demo ? demo.conversations() : clone(state.conversations),
  messages: conversationId => demo ? demo.messages(conversationId) : clone(state.messages.filter(m => m.conversationId === conversationId)),
  unread: () => demo ? demo.unread() : state.messages.filter(m => m.senderId !== state.user?.id && !m.readBy.includes(state.user?.id)).length,
};
for (const operation of mutations) service[operation] = (...args) => {
  if (demo) {
    const selectedDemo=demo;
    return Promise.resolve().then(() => {
      if (demo !== selectedDemo) throw new Error('You left the demo. Please try again.');
      return selectedDemo[operation](...args);
    });
  }
  const version = epoch;
  return enqueue(async () => {
    if (version !== epoch) throw new Error('Your account changed. Please try again.');
    const data = await request('/api/action',{ operation,args });
    if (version !== epoch) throw new Error('Your account changed. Please try again.');
    state = data.state;
    return data.result;
  });
};
if (channel) channel.onmessage = () => {
  if (demoWanted) return;
  ++epoch;
  state = blank();
  window.dispatchEvent(new Event('reclaim:account-change'));
};
