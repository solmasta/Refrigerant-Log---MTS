const RETENTION_DAYS = 90;
const KEY_PATTERN = /^\d{4}-\d{2}-\d{2}-\d+\.json$/;

export async function createBackup(env) {
  const [technicians, logs, purchases] = await Promise.all([
    env.DB.prepare('SELECT * FROM technicians').all(),
    env.DB.prepare('SELECT * FROM logs').all(),
    env.DB.prepare('SELECT * FROM purchases').all(),
  ]);

  const createdAt = new Date().toISOString();
  const snapshot = {
    createdAt,
    technicians: technicians.results,
    logs: logs.results,
    purchases: purchases.results,
  };

  const key = `${createdAt.slice(0, 10)}-${Date.now()}.json`;
  await env.BACKUPS.put(key, JSON.stringify(snapshot, null, 2), {
    httpMetadata: { contentType: 'application/json' },
  });

  return {
    key,
    createdAt,
    technicianCount: snapshot.technicians.length,
    logCount: snapshot.logs.length,
    purchaseCount: snapshot.purchases.length,
  };
}

export async function listBackups(env) {
  const listed = await env.BACKUPS.list();
  return listed.objects
    .map((obj) => ({ key: obj.key, size: obj.size, uploaded: obj.uploaded.toISOString() }))
    .sort((a, b) => new Date(b.uploaded) - new Date(a.uploaded));
}

export async function getBackup(env, key) {
  if (!KEY_PATTERN.test(key)) return null;
  return env.BACKUPS.get(key);
}

export async function pruneOldBackups(env) {
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const listed = await env.BACKUPS.list();
  const stale = listed.objects.filter((obj) => obj.uploaded.getTime() < cutoff);
  await Promise.all(stale.map((obj) => env.BACKUPS.delete(obj.key)));
  return stale.length;
}
