// Read-only checks; never reset accounts, reports, messages, or browser storage.
const frame=document.querySelector('#app'), output=document.querySelector('#results');
frame.src='/#/login';
try {
  await new Promise(resolve => frame.addEventListener('load',resolve,{once:true}));
  for (let attempt=0;attempt<100 && !frame.contentDocument.querySelector('#auth-form,.profile-page');attempt++) await new Promise(resolve => setTimeout(resolve,50));
  const doc=frame.contentDocument;
  if (!doc.querySelector('#auth-form,.profile-page')) throw Error('Account page did not load.');
  if (doc.documentElement.scrollWidth > frame.clientWidth+1) throw Error('Account page overflows at 390px.');
  document.body.dataset.testStatus='passed'; output.textContent='PASS: account route loads without horizontal overflow at 390px.';
} catch (error) { document.body.dataset.testStatus='failed'; output.textContent=error.message; }
