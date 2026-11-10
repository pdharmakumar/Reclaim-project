// Private account data is held in memory only. The server owns identity and permissions.
const blank = () => ({ user:null, users:[], items:[], claims:[], conversations:[], messages:[] });
let state = blank(), queue = Promise.resolve(), epoch = 0;
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
  async refresh() {
    const version = epoch;
    await enqueue(async () => { const next = await request('/api/state'); if (version === epoch) state = next; });
  },
  async authenticate(action, fields) {
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
    ++epoch;
    await enqueue(async () => { await request('/api/auth/logout',{}); state=blank(); channel?.postMessage('changed'); });
  },
  currentUser: () => clone(state.user),
  user: id => clone(state.users.find(u => u.id === id)),
  items: () => clone(state.items),
  item: id => clone(state.items.find(i => i.id === id)),
  claims: () => clone(state.claims),
  conversations: () => clone(state.conversations),
  messages: conversationId => clone(state.messages.filter(m => m.conversationId === conversationId)),
  unread: () => state.messages.filter(m => m.senderId !== state.user?.id && !m.readBy.includes(state.user?.id)).length,
};
for (const operation of mutations) service[operation] = (...args) => {
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
  ++epoch;
  state = blank();
  window.dispatchEvent(new Event('reclaim:account-change'));
};
