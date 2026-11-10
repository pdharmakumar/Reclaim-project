// Read-only browser smoke check. Full authentication and authorization tests: npm test.
const output=document.querySelector('#results');
try {
  const response=await fetch('/api/state',{credentials:'same-origin',cache:'no-store'});
  if (!response.ok) throw Error('The account backend is unavailable. Run this page through Wrangler.');
  const state=await response.json();
  for (const field of ['items','users','claims','conversations','messages']) {
    if (!Array.isArray(state[field])) throw Error(`Missing ${field} in the account snapshot.`);
  }
  if (!state.user && (state.claims.length || state.conversations.length || state.messages.length)) throw Error('Private data was returned while signed out.');
  document.body.dataset.testStatus='passed'; output.textContent='PASS: account API snapshot and signed-out privacy. Full lifecycle checks run with npm test.';
} catch (error) { document.body.dataset.testStatus='failed'; output.textContent=error.message; }
