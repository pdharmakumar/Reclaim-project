import { service } from '../service.js';
import { icon } from '../icons.js';
import { esc, photo, empty } from '../components/ui.js';
const time = value => new Date(value).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'});
export function messages(conversationId) {
  const conversations = service.conversations().sort((a,b) => {
    const am=service.messages(a.id).at(-1)?.timestamp || a.createdAt, bm=service.messages(b.id).at(-1)?.timestamp || b.createdAt; return bm.localeCompare(am);
  });
  const active=conversations.find(c => c.id===conversationId);
  const user=service.currentUser();
  return `<section class="wrap messages-page"><div class="page-heading"><div class="eyebrow">A CONVERSATION AWAY FROM REUNITED</div><h1>Good news goes here<span class="lime-period">.</span></h1><p>Private conversations. Happier endings.</p></div><div class="message-demo">${icon('message')} ${service.isDemo() ? 'Demo messages stay in this browser. Switch sample identities in Profile to try the other side.' : 'Messages are private to you and the other participant. New replies appear here automatically.'}</div><div class="messenger ${active ? 'has-active' : ''}"><aside class="conversation-sidebar"><div class="sidebar-heading"><h2>Inbox</h2><span>${conversations.length}</span></div>${conversations.length ? conversations.map(c => {
    const item=service.item(c.itemId), other=service.user(c.participantIds.find(id => id!==user.id)), msgs=service.messages(c.id), last=msgs.at(-1), unread=msgs.filter(m => m.senderId!==user.id && !m.readBy.includes(user.id)).length;
    return `<a href="#/messages/${esc(c.id)}" class="conversation-preview ${c.id===active?.id?'active':''}"><span class="avatar">${esc(other.initials)}</span><div><div class="conversation-name"><strong>${esc(other.name)}</strong>${unread ? `<span class="unread-count">${unread}</span>` : ''}</div><span class="conversation-item">${esc(item.title)}</span><p>${esc(last?.text || 'Start the conversation')}</p></div></a>`;
  }).join('') : '<div class="inbox-empty">No conversations yet.<br>Contact someone from a listing to get started.</div>'}</aside><div class="conversation-main">${active ? (() => {
    const item=service.item(active.itemId), other=service.user(active.participantIds.find(id => id!==user.id));
    return `<div class="conversation-heading"><a class="mobile-back icon-button" href="#/messages" aria-label="Back to inbox">${icon('back')}</a><span class="avatar">${esc(other.initials)}</span><div><h2>${esc(other.name)}</h2><span>Private conversation</span></div></div><a class="message-item" href="#/item/${esc(item.id)}">${photo(item)}<div><span class="eyebrow">YOU’RE TALKING ABOUT</span><strong>${esc(item.title)}</strong></div>${icon('arrow')}</a><div class="message-history" id="message-history" role="log" aria-label="Conversation messages" aria-live="polite"></div><form id="message-form" class="message-composer"><label class="sr-only" for="message-text">Your message</label><textarea id="message-text" rows="1" maxlength="2000" placeholder="A little closer to a reunion..." required></textarea><button class="btn primary" aria-label="Send message">${icon('send')}</button><p class="form-error" id="message-error" role="alert"></p></form>`;
  })() : empty(conversationId ? 'This conversation is private.' : 'A good conversation starts here.', conversationId ? 'Choose a conversation you participate in.' : 'Select a conversation, or find an item and contact its reporter.', '<a href="#/browse" class="btn secondary">Browse items '+icon('arrow')+'</a>')}</div></div></section>`;
}
export async function mountMessages(conversationId, updateNav) {
  const history=document.querySelector('#message-history'); if (!history) return;
  const user=service.currentUser();
  function renderHistory() {
    const messages=service.messages(conversationId); let lastDate='';
    history.innerHTML=messages.length ? messages.map(m => { const date=new Date(m.timestamp).toLocaleDateString([], {month:'long',day:'numeric'}); const label=date!==lastDate ? `<div class="message-date">${date}</div>` : ''; lastDate=date; return `${label}<div class="message ${m.senderId===user.id?'outgoing':'incoming'}"><div class="bubble">${esc(m.text)}</div><span>${time(m.timestamp)}${m.senderId===user.id ? ` · ${m.readBy.length>1?'Read':'Sent'}` : ''}</span></div>`; }).join('') : `<div class="conversation-welcome">${icon('heart')}<h3>Start with a hello.</h3><p>Ask about the item or share a helpful detail. Keep personal information private.</p></div>`;
    history.scrollTop=history.scrollHeight;
  }
  try { await service.markRead(conversationId); updateNav(); document.querySelector('.conversation-preview.active .unread-count')?.remove(); renderHistory(); } catch { return; }
  const form=document.querySelector('#message-form'), input=document.querySelector('#message-text');
  form.onsubmit=async e => { e.preventDefault(); try { await service.sendMessage(conversationId,input.value); input.value=''; document.querySelector('#message-error').textContent=''; renderHistory(); input.focus(); } catch(e) { document.querySelector('#message-error').textContent=e.message; } };
  input.onkeydown=e => { if (e.key==='Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); form.requestSubmit(); } };
}
