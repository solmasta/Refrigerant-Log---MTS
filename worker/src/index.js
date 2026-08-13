import { Hono } from 'hono';
import { cors } from 'hono/cors';
import bcrypt from 'bcryptjs';

import {
  findOrCreateTechnician,
  listTechniciansWithCounts,
  ensureAdminPasswordHash,
  setAdminPasswordHash,
  insertLog,
  listLogs,
  deleteLog,
  insertPurchase,
  listPurchases,
  deletePurchase,
  getSummary,
} from './db.js';
import { signToken, requireAuth, requireAdmin } from './auth.js';
import { toCsv } from './csv.js';

const app = new Hono();

app.use('/api/*', cors());

// ---------- Auth ----------

app.post('/api/auth/technician-login', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { firstName, lastName } = body;
  if (!firstName || !lastName) {
    return c.json({ error: 'First and last name are required' }, 400);
  }

  const tech = await findOrCreateTechnician(c.env.DB, firstName, lastName);
  const token = await signToken(
    { role: 'technician', technicianId: tech.id, name: `${tech.firstName} ${tech.lastName}` },
    c.env.JWT_SECRET
  );

  return c.json({ token, technician: tech });
});

app.post('/api/auth/admin-login', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { password } = body;

  const hash = await ensureAdminPasswordHash(c.env.DB, c.env.ADMIN_PASSWORD || 'ChangeMe123!');
  if (!password || !bcrypt.compareSync(password, hash)) {
    return c.json({ error: 'Incorrect admin password' }, 401);
  }

  const token = await signToken({ role: 'admin' }, c.env.JWT_SECRET);
  return c.json({ token });
});

app.post('/api/auth/admin-change-password', requireAdmin, async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { currentPassword, newPassword } = body;

  const hash = await ensureAdminPasswordHash(c.env.DB, c.env.ADMIN_PASSWORD || 'ChangeMe123!');
  if (!currentPassword || !bcrypt.compareSync(currentPassword, hash)) {
    return c.json({ error: 'Current password is incorrect' }, 401);
  }
  if (!newPassword || newPassword.length < 8) {
    return c.json({ error: 'New password must be at least 8 characters' }, 400);
  }

  await setAdminPasswordHash(c.env.DB, bcrypt.hashSync(newPassword, 10));
  return c.json({ ok: true });
});

app.get('/api/me', requireAuth, (c) => c.json({ user: c.get('user') }));

// ---------- Reference data ----------

app.get('/api/reference-data', (c) =>
  c.json({
    refrigerantTypes: [
      'R-22 (HCFC)',
      'R-410A',
      'R-134a',
      'R-404A',
      'R-407C',
      'R-32',
      'R-454B',
      'R-449A',
      'R-513A',
      'R-744 (CO2)',
      'Other',
    ],
    serviceTypes: [
      'Installation',
      'Leak Repair',
      'Routine Maintenance',
      'Recovery / Decommission',
      'Retrofit / Conversion',
      'Inspection',
      'Other',
    ],
    units: ['lbs', 'oz'],
  })
);

// ---------- Technicians / roster ----------

app.get('/api/technicians', requireAdmin, async (c) => {
  const technicians = await listTechniciansWithCounts(c.env.DB);
  return c.json({ technicians });
});

// ---------- Refrigerant usage logs ----------

app.post('/api/logs', requireAuth, async (c) => {
  const user = c.get('user');
  if (user.role !== 'technician') {
    return c.json({ error: 'Only technicians can submit log entries' }, 403);
  }

  const body = await c.req.json().catch(() => ({}));
  const {
    date,
    equipmentId,
    location,
    refrigerantType,
    serviceType,
    amountAdded,
    amountRecovered,
    unit,
    notes,
  } = body;

  if (!date || !equipmentId || !refrigerantType || !serviceType) {
    return c.json(
      { error: 'Date, equipment ID, refrigerant type, and service type are required' },
      400
    );
  }

  const entry = {
    id: crypto.randomUUID(),
    technicianId: user.technicianId,
    technicianName: user.name,
    date,
    equipmentId: equipmentId.trim(),
    location: (location || '').trim(),
    refrigerantType,
    serviceType,
    amountAdded: amountAdded === '' || amountAdded === undefined ? null : Number(amountAdded),
    amountRecovered:
      amountRecovered === '' || amountRecovered === undefined ? null : Number(amountRecovered),
    unit: unit || 'lbs',
    notes: (notes || '').trim(),
    createdAt: new Date().toISOString(),
  };

  await insertLog(c.env.DB, entry);
  return c.json({ log: entry }, 201);
});

app.get('/api/logs', requireAuth, async (c) => {
  const user = c.get('user');
  const query = c.req.query();
  const filters = {
    technicianId: user.role === 'admin' ? query.technicianId : user.technicianId,
    refrigerantType: query.refrigerantType,
    dateFrom: query.dateFrom,
    dateTo: query.dateTo,
  };

  const logs = await listLogs(c.env.DB, filters);
  return c.json({ logs });
});

app.delete('/api/logs/:id', requireAdmin, async (c) => {
  const ok = await deleteLog(c.env.DB, c.req.param('id'));
  if (!ok) return c.json({ error: 'Log not found' }, 404);
  return c.json({ ok: true });
});

// ---------- Refrigerant purchases ----------

app.post('/api/purchases', requireAuth, async (c) => {
  const user = c.get('user');
  if (user.role !== 'technician') {
    return c.json({ error: 'Only technicians can submit purchase entries' }, 403);
  }

  const body = await c.req.json().catch(() => ({}));
  const { date, refrigerantType, quantity, unit, cost, supplier, invoiceNumber, notes } = body;

  if (!date || !refrigerantType || quantity === undefined || quantity === '') {
    return c.json({ error: 'Date, refrigerant type, and quantity are required' }, 400);
  }

  const entry = {
    id: crypto.randomUUID(),
    technicianId: user.technicianId,
    technicianName: user.name,
    date,
    refrigerantType,
    quantity: Number(quantity),
    unit: unit || 'lbs',
    cost: cost === '' || cost === undefined ? null : Number(cost),
    supplier: (supplier || '').trim(),
    invoiceNumber: (invoiceNumber || '').trim(),
    notes: (notes || '').trim(),
    createdAt: new Date().toISOString(),
  };

  await insertPurchase(c.env.DB, entry);
  return c.json({ purchase: entry }, 201);
});

app.get('/api/purchases', requireAuth, async (c) => {
  const user = c.get('user');
  const query = c.req.query();
  const filters = {
    technicianId: user.role === 'admin' ? query.technicianId : user.technicianId,
    refrigerantType: query.refrigerantType,
    dateFrom: query.dateFrom,
    dateTo: query.dateTo,
  };

  const purchases = await listPurchases(c.env.DB, filters);
  return c.json({ purchases });
});

app.delete('/api/purchases/:id', requireAdmin, async (c) => {
  const ok = await deletePurchase(c.env.DB, c.req.param('id'));
  if (!ok) return c.json({ error: 'Purchase not found' }, 404);
  return c.json({ ok: true });
});

// ---------- Admin dashboard summary ----------

app.get('/api/admin/summary', requireAdmin, async (c) => {
  const summary = await getSummary(c.env.DB);
  return c.json(summary);
});

// ---------- CSV export ----------

app.get('/api/export/logs.csv', requireAdmin, async (c) => {
  const logs = await listLogs(c.env.DB, {});
  const csv = toCsv(logs, [
    { key: 'date', label: 'Date' },
    { key: 'technicianName', label: 'Technician' },
    { key: 'equipmentId', label: 'Equipment ID' },
    { key: 'location', label: 'Location' },
    { key: 'refrigerantType', label: 'Refrigerant Type' },
    { key: 'serviceType', label: 'Service Type' },
    { key: 'amountAdded', label: 'Amount Added' },
    { key: 'amountRecovered', label: 'Amount Recovered' },
    { key: 'unit', label: 'Unit' },
    { key: 'notes', label: 'Notes' },
    { key: 'createdAt', label: 'Submitted At' },
  ]);
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="refrigerant_logs.csv"',
    },
  });
});

app.get('/api/export/purchases.csv', requireAdmin, async (c) => {
  const purchases = await listPurchases(c.env.DB, {});
  const csv = toCsv(purchases, [
    { key: 'date', label: 'Date' },
    { key: 'technicianName', label: 'Purchased By' },
    { key: 'refrigerantType', label: 'Refrigerant Type' },
    { key: 'quantity', label: 'Quantity' },
    { key: 'unit', label: 'Unit' },
    { key: 'cost', label: 'Cost' },
    { key: 'supplier', label: 'Supplier' },
    { key: 'invoiceNumber', label: 'Invoice #' },
    { key: 'notes', label: 'Notes' },
    { key: 'createdAt', label: 'Submitted At' },
  ]);
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="refrigerant_purchases.csv"',
    },
  });
});

app.get('/api/health', (c) => c.json({ ok: true }));

export default app;
