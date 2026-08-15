import bcrypt from 'bcryptjs';

export function normalizeName(s) {
  return s.trim().replace(/\s+/g, ' ');
}

function rowToTechnician(row) {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email || '',
    createdAt: row.created_at,
  };
}

function rowToLog(row) {
  return {
    id: row.id,
    technicianId: row.technician_id,
    technicianName: row.technician_name,
    date: row.date,
    equipmentId: row.equipment_id,
    location: row.location,
    workOrderNumber: row.work_order_number,
    refrigerantType: row.refrigerant_type,
    serviceType: row.service_type,
    amountAdded: row.amount_added,
    amountRecovered: row.amount_recovered,
    unit: row.unit,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

function rowToPurchase(row) {
  return {
    id: row.id,
    technicianId: row.technician_id,
    technicianName: row.technician_name,
    date: row.date,
    refrigerantType: row.refrigerant_type,
    quantity: row.quantity,
    unit: row.unit,
    cost: row.cost,
    supplier: row.supplier,
    invoiceNumber: row.invoice_number,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

export async function findOrCreateTechnician(db, firstName, lastName) {
  const first = normalizeName(firstName);
  const last = normalizeName(lastName);

  const existing = await db
    .prepare(
      'SELECT * FROM technicians WHERE lower(first_name) = lower(?) AND lower(last_name) = lower(?)'
    )
    .bind(first, last)
    .first();
  if (existing) return rowToTechnician(existing);

  const row = {
    id: crypto.randomUUID(),
    first_name: first,
    last_name: last,
    created_at: new Date().toISOString(),
  };
  await db
    .prepare('INSERT INTO technicians (id, first_name, last_name, created_at) VALUES (?, ?, ?, ?)')
    .bind(row.id, row.first_name, row.last_name, row.created_at)
    .run();
  return rowToTechnician(row);
}

export async function listTechniciansWithCounts(db) {
  const { results } = await db
    .prepare(
      `SELECT
         t.*,
         (SELECT COUNT(*) FROM logs l WHERE l.technician_id = t.id) AS log_count,
         (SELECT COUNT(*) FROM purchases p WHERE p.technician_id = t.id) AS purchase_count,
         (SELECT MAX(created_at) FROM logs l WHERE l.technician_id = t.id) AS last_entry_at
       FROM technicians t
       ORDER BY t.created_at ASC`
    )
    .all();

  return results.map((row) => ({
    ...rowToTechnician(row),
    logCount: row.log_count,
    purchaseCount: row.purchase_count,
    lastEntryAt: row.last_entry_at || null,
  }));
}

export async function getTechnician(db, id) {
  const row = await db.prepare('SELECT * FROM technicians WHERE id = ?').bind(id).first();
  return row ? rowToTechnician(row) : null;
}

export async function updateTechnician(db, id, { firstName, lastName, email }) {
  const first = normalizeName(firstName);
  const last = normalizeName(lastName);
  await db
    .prepare('UPDATE technicians SET first_name = ?, last_name = ?, email = ? WHERE id = ?')
    .bind(first, last, (email || '').trim(), id)
    .run();

  // Keep the denormalized technician_name on existing entries in sync so
  // historical logs/purchases display the corrected name too.
  const fullName = `${first} ${last}`;
  await db.batch([
    db.prepare('UPDATE logs SET technician_name = ? WHERE technician_id = ?').bind(fullName, id),
    db
      .prepare('UPDATE purchases SET technician_name = ? WHERE technician_id = ?')
      .bind(fullName, id),
  ]);

  return getTechnician(db, id);
}

export async function deleteTechnician(db, id) {
  const result = await db.prepare('DELETE FROM technicians WHERE id = ?').bind(id).run();
  return result.meta.changes > 0;
}

export async function ensureAdminPasswordHash(db, defaultPassword) {
  const existing = await db.prepare('SELECT password_hash FROM admin_settings WHERE id = 1').first();
  if (existing) return existing.password_hash;

  const hash = bcrypt.hashSync(defaultPassword, 10);
  await db
    .prepare('INSERT INTO admin_settings (id, password_hash) VALUES (1, ?)')
    .bind(hash)
    .run();
  return hash;
}

export async function setAdminPasswordHash(db, hash) {
  await db
    .prepare(
      'INSERT INTO admin_settings (id, password_hash) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET password_hash = excluded.password_hash'
    )
    .bind(hash)
    .run();
}

const ADMIN_LOCKOUT_THRESHOLD = 10;
const ADMIN_LOCKOUT_MINUTES = 15;

export async function getAdminLoginState(db) {
  const row = await db
    .prepare('SELECT failed_attempts, locked_until FROM admin_settings WHERE id = 1')
    .first();
  return {
    failedAttempts: row?.failed_attempts ?? 0,
    lockedUntil: row?.locked_until ?? null,
  };
}

// Locks out further attempts for ADMIN_LOCKOUT_MINUTES once
// ADMIN_LOCKOUT_THRESHOLD failures have accumulated; a failure that arrives
// after a lock has expired pushes the lock out again immediately, so
// repeated guessing can't just wait out one lockout window and resume.
export async function recordFailedAdminLogin(db) {
  const { failedAttempts } = await getAdminLoginState(db);
  const attempts = failedAttempts + 1;
  const lockedUntil =
    attempts >= ADMIN_LOCKOUT_THRESHOLD
      ? new Date(Date.now() + ADMIN_LOCKOUT_MINUTES * 60 * 1000).toISOString()
      : null;
  await db
    .prepare('UPDATE admin_settings SET failed_attempts = ?, locked_until = ? WHERE id = 1')
    .bind(attempts, lockedUntil)
    .run();
  return { failedAttempts: attempts, lockedUntil };
}

export async function resetAdminLoginAttempts(db) {
  await db
    .prepare('UPDATE admin_settings SET failed_attempts = 0, locked_until = NULL WHERE id = 1')
    .run();
}

export async function getReminderDay(db) {
  const row = await db.prepare('SELECT reminder_day FROM admin_settings WHERE id = 1').first();
  return row?.reminder_day ?? 28;
}

export async function setReminderDay(db, day) {
  await db.prepare('UPDATE admin_settings SET reminder_day = ? WHERE id = 1').bind(day).run();
}

export async function insertLog(db, entry) {
  await db
    .prepare(
      `INSERT INTO logs
        (id, technician_id, technician_name, date, equipment_id, location, work_order_number,
         refrigerant_type, service_type, amount_added, amount_recovered, unit, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      entry.id,
      entry.technicianId,
      entry.technicianName,
      entry.date,
      entry.equipmentId,
      entry.location,
      entry.workOrderNumber,
      entry.refrigerantType,
      entry.serviceType,
      entry.amountAdded,
      entry.amountRecovered,
      entry.unit,
      entry.notes,
      entry.createdAt
    )
    .run();
  return entry;
}

export async function listLogs(db, { technicianId, refrigerantType, dateFrom, dateTo } = {}) {
  const clauses = [];
  const params = [];
  if (technicianId) {
    clauses.push('technician_id = ?');
    params.push(technicianId);
  }
  if (refrigerantType) {
    clauses.push('refrigerant_type = ?');
    params.push(refrigerantType);
  }
  if (dateFrom) {
    clauses.push('date >= ?');
    params.push(dateFrom);
  }
  if (dateTo) {
    clauses.push('date <= ?');
    params.push(dateTo);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const { results } = await db
    .prepare(`SELECT * FROM logs ${where} ORDER BY date DESC, created_at DESC`)
    .bind(...params)
    .all();
  return results.map(rowToLog);
}

export async function deleteLog(db, id) {
  const result = await db.prepare('DELETE FROM logs WHERE id = ?').bind(id).run();
  return result.meta.changes > 0;
}

export async function insertPurchase(db, entry) {
  await db
    .prepare(
      `INSERT INTO purchases
        (id, technician_id, technician_name, date, refrigerant_type, quantity, unit, cost,
         supplier, invoice_number, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      entry.id,
      entry.technicianId,
      entry.technicianName,
      entry.date,
      entry.refrigerantType,
      entry.quantity,
      entry.unit,
      entry.cost,
      entry.supplier,
      entry.invoiceNumber,
      entry.notes,
      entry.createdAt
    )
    .run();
  return entry;
}

export async function listPurchases(db, { technicianId, refrigerantType, dateFrom, dateTo } = {}) {
  const clauses = [];
  const params = [];
  if (technicianId) {
    clauses.push('technician_id = ?');
    params.push(technicianId);
  }
  if (refrigerantType) {
    clauses.push('refrigerant_type = ?');
    params.push(refrigerantType);
  }
  if (dateFrom) {
    clauses.push('date >= ?');
    params.push(dateFrom);
  }
  if (dateTo) {
    clauses.push('date <= ?');
    params.push(dateTo);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const { results } = await db
    .prepare(`SELECT * FROM purchases ${where} ORDER BY date DESC, created_at DESC`)
    .bind(...params)
    .all();
  return results.map(rowToPurchase);
}

export async function deletePurchase(db, id) {
  const result = await db.prepare('DELETE FROM purchases WHERE id = ?').bind(id).run();
  return result.meta.changes > 0;
}

export async function getSummary(db) {
  const [technicianCount, logStats, purchaseStats] = await Promise.all([
    db.prepare('SELECT COUNT(*) AS n FROM technicians').first(),
    db
      .prepare(
        `SELECT COUNT(*) AS n,
                COALESCE(SUM(amount_added), 0) AS added,
                COALESCE(SUM(amount_recovered), 0) AS recovered
         FROM logs`
      )
      .first(),
    db
      .prepare(
        `SELECT COUNT(*) AS n,
                COALESCE(SUM(quantity), 0) AS quantity,
                COALESCE(SUM(cost), 0) AS cost
         FROM purchases`
      )
      .first(),
  ]);

  return {
    technicianCount: technicianCount.n,
    logCount: logStats.n,
    purchaseCount: purchaseStats.n,
    totalAddedLbs: logStats.added,
    totalRecoveredLbs: logStats.recovered,
    totalPurchasedLbs: purchaseStats.quantity,
    totalSpent: purchaseStats.cost,
  };
}
