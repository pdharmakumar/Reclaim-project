import { authenticate, currentUser, HttpError, jsonBody, rateLimit } from './auth.js';
import { readState, writeState, snapshot } from './storage.js';
import { mutate } from './domain.js';

const operations = { createItem:1, updateItem:2, setItemStatus:2, deleteItem:1, contact:1,
  sendMessage:2, markRead:1, requestClaim:2, changeClaim:2, arrangePickup:3, confirmPickup:1 };
const json = (body,status = 200,headers = {}) => Response.json(body,{status,headers:{
  'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff', 'Referrer-Policy':'same-origin', ...headers,
}});

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
    try {
      if (!env.DB) throw new HttpError(503,'Account storage has not been configured yet.');
      if (request.method === 'GET' && url.pathname === '/api/state') {
        return json(await snapshot(env.DB, await currentUser(request,env.DB)));
      }
      if (request.method !== 'POST') throw new HttpError(405,'Use POST for this action.');
      if (request.headers.get('Origin') !== url.origin || request.headers.get('Sec-Fetch-Site') === 'cross-site') {
        throw new HttpError(403,'Please submit this action from the Reclaim website.');
      }
      if (url.pathname.startsWith('/api/auth/')) {
        const body = await jsonBody(request,4096);
        const { cookie, recoveryCode } = await authenticate(request,env.DB,url.pathname.slice(10),body);
        ctx.waitUntil(env.DB.prepare('DELETE FROM rate_limits WHERE expires_at<?').bind(Date.now()).run());
        return json({ ok:true, ...(recoveryCode ? { recoveryCode } : {}) },200,{ 'Set-Cookie':cookie });
      }
      if (url.pathname !== '/api/action') throw new HttpError(404,'This endpoint does not exist.');
      const user = await currentUser(request,env.DB);
      if (!user) throw new HttpError(401,'Please log in to continue.');
      await rateLimit(env.DB,`action:${user.id}`,120);
      const body = await jsonBody(request);
      if (!Object.hasOwn(operations,body.operation) || !Array.isArray(body.args) || body.args.length !== operations[body.operation]) {
        throw new HttpError(400,'This action is not supported.');
      }
      for (let attempt = 0; attempt < 4; attempt++) {
        const { state, revision } = await readState(env.DB);
        let change;
        try { change = mutate(state,user.id,body.operation,body.args); }
        catch (error) { throw new HttpError(400,error instanceof TypeError ? 'Some details are missing or invalid.' : error.message); }
        try { await writeState(env.DB,revision,state,change.next); }
        catch (error) {
          if (String(error).includes('state_conflict')) continue;
          throw error;
        }
        return json({ result:change.result ?? null, state:await snapshot(env.DB,user) });
      }
      throw new HttpError(409,'Someone updated this item at the same time. Please try again.');
    } catch (error) {
      if (error instanceof HttpError) return json({ error:error.message },error.status,error.status===429 ? {'Retry-After':'60'} : {});
      // Never log credentials, request bodies, email addresses, or private record data.
      console.error(JSON.stringify({ event:'request_failed', path:url.pathname }));
      return json({ error:'Reclaim could not complete this request. Please try again.' },500);
    }
  },
};
