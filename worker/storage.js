const collections = ['items', 'claims', 'conversations', 'messages'];

export async function readState(db) {
  const [meta, records] = await db.batch([
    db.prepare('SELECT revision FROM app_meta WHERE id = 1'),
    db.prepare('SELECT collection, data FROM records ORDER BY rowid DESC'),
  ]);
  const state = Object.fromEntries(collections.map(key => [key, []]));
  for (const row of records.results) state[row.collection].push(JSON.parse(row.data));
  // Messages retain chronological order, regardless of insertion order in the snapshot.
  state.messages.sort((a,b) => a.timestamp.localeCompare(b.timestamp));
  return { revision: meta.results[0].revision, state };
}

export async function writeState(db, revision, before, after) {
  // The trigger rejects stale revisions. D1 rolls back the entire batch on conflict,
  // including every record change. Callers re-read and revalidate before retrying.
  const statements = [db.prepare('UPDATE app_meta SET revision = ? WHERE id = 1').bind(revision + 1)];
  for (const collection of collections) {
    const previous = new Map(before[collection].map(record => [record.id, JSON.stringify(record)]));
    for (const record of after[collection]) {
      const data = JSON.stringify(record);
      if (previous.get(record.id) !== data) statements.push(db.prepare(
        'INSERT INTO records (collection,id,data) VALUES (?,?,?) ON CONFLICT(collection,id) DO UPDATE SET data=excluded.data',
      ).bind(collection, record.id, data));
      previous.delete(record.id);
    }
    for (const id of previous.keys()) statements.push(db.prepare('DELETE FROM records WHERE collection=? AND id=?').bind(collection,id));
  }
  if (statements.length > 1) await db.batch(statements);
}

export async function snapshot(db, user) {
  const { state } = await readState(db);
  const userId = user?.id;
  const conversations = state.conversations.filter(c => c.participantIds.includes(userId));
  const conversationIds = new Set(conversations.map(c => c.id));
  const claims = state.claims.filter(c => c.claimantId === userId || state.items.some(i => i.id === c.itemId && i.creatorId === userId));
  const visibleIds = new Set([...state.items.map(i => i.creatorId), ...conversations.flatMap(c => c.participantIds)]);
  const { results } = await db.prepare('SELECT id, name FROM users').all();
  return {
    user,
    users: results.filter(u => visibleIds.has(u.id) || u.id === userId).map(publicUser),
    items: state.items,
    conversations,
    claims,
    messages: state.messages.filter(m => conversationIds.has(m.conversationId)),
  };
}

export function publicUser(user) {
  return { id: user.id, name: user.name, initials: [...user.name.trim().split(/\s+/)].slice(0,2).map(n => Array.from(n)[0]).join('').toUpperCase(), description: 'Campus community member' };
}
