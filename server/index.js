import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { getDb, persist } from './db.js';
import { signToken, requireAuth, requireAdmin } from './auth.js';
import { toCsv } from './csv.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_DIST = path.join(__dirname, '..', 'client', 'dist');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

function normalizeName(s) {
  return s.trim().replace(/\s+/g, ' ');
}

// ---------- Auth ----------

app.post('/api/auth/technician-login', (req, res) => {
  const { firstName, lastName } = req.body || {};
  if (!firstName || !lastName) {
    return res.status(400).json({ error: 'First and last name are required' });
  }
  const first = normalizeName(firstName);
  const last = normalizeName(lastName);
  const db = getDb();

  let tech = db.technicians.find(
    (t) =>
      t.firstName.toLowerCase() === first.toLowerCase() &&
      t.lastName.toLowerCase() === last.toLowerCase()
  );

  if (!tech) {
    tech = {
      id: crypto.randomUUID(),
      firstName: first,
      lastName: last,
      createdAt: new Date().toISOString(),
    };
    db.technicians.push(tech);
    persist();
  }

  const token = signToken({
    role: 'technician',
    technicianId: tech.id,
    name: `${tech.firstName} ${tech.lastName}`,
  });

  res.json({ token, technician: tech });
});

app.post('/api/auth/admin-login', (req, res) => {
  const { password } = req.body || {};
  const db = getDb();
  if (!password || !bcrypt.compareSync(password, db.admin.passwordHash)) {
    return res.status(401).json({ error: 'Incorrect admin password' });
  }
  const token = signToken({ role: 'admin' });
  res.json({ token });
});

app.post('/api/auth/admin-change-password', requireAdmin, (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  const db = getDb();
  if (!currentPassword || !bcrypt.compareSync(currentPassword, db.admin.passwordHash)) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }
  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters' });
  }
  db.admin.passwordHash = bcrypt.hashSync(newPassword, 10);
  persist();
  res.json({ ok: true });
});

app.get('/api/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// ---------- Reference data ----------

app.get('/api/reference-data', (_req, res) => {
  res.json({
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
  });
});

// ---------- Technicians / roster ----------

app.get('/api/technicians', requireAdmin, (_req, res) => {
  const db = getDb();
  const roster = db.technicians.map((t) => {
    const logCount = db.logs.filter((l) => l.technicianId === t.id).length;
    const purchaseCount = db.purchases.filter((p) => p.technicianId === t.id).length;
    const lastEntry = db.logs
      .filter((l) => l.technicianId === t.id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
    return {
      ...t,
      logCount,
      purchaseCount,
      lastEntryAt: lastEntry ? lastEntry.createdAt : null,
    };
  });
  res.json({ technicians: roster });
});

// ---------- Refrigerant usage logs ----------

function logsVisibleTo(req) {
  const db = getDb();
  if (req.user.role === 'admin') return db.logs;
  return db.logs.filter((l) => l.technicianId === req.user.technicianId);
}

app.post('/api/logs', requireAuth, (req, res) => {
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
  } = req.body || {};

  if (!date || !equipmentId || !refrigerantType || !serviceType) {
    return res.status(400).json({
      error: 'Date, equipment ID, refrigerant type, and service type are required',
    });
  }
  if (req.user.role !== 'technician') {
    return res.status(403).json({ error: 'Only technicians can submit log entries' });
  }

  const db = getDb();
  const entry = {
    id: crypto.randomUUID(),
    technicianId: req.user.technicianId,
    technicianName: req.user.name,
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
  db.logs.push(entry);
  persist();
  res.status(201).json({ log: entry });
});

app.get('/api/logs', requireAuth, (req, res) => {
  const db = getDb();
  let logs = logsVisibleTo(req);

  const { technicianId, refrigerantType, dateFrom, dateTo } = req.query;
  if (req.user.role === 'admin' && technicianId) {
    logs = logs.filter((l) => l.technicianId === technicianId);
  }
  if (refrigerantType) {
    logs = logs.filter((l) => l.refrigerantType === refrigerantType);
  }
  if (dateFrom) {
    logs = logs.filter((l) => l.date >= dateFrom);
  }
  if (dateTo) {
    logs = logs.filter((l) => l.date <= dateTo);
  }

  logs = [...logs].sort((a, b) => new Date(b.date) - new Date(a.date));
  res.json({ logs });
  void db;
});

app.delete('/api/logs/:id', requireAdmin, (req, res) => {
  const db = getDb();
  const before = db.logs.length;
  db.logs = db.logs.filter((l) => l.id !== req.params.id);
  if (db.logs.length === before) return res.status(404).json({ error: 'Log not found' });
  persist();
  res.json({ ok: true });
});

// ---------- Refrigerant purchases ----------

function purchasesVisibleTo(req) {
  const db = getDb();
  if (req.user.role === 'admin') return db.purchases;
  return db.purchases.filter((p) => p.technicianId === req.user.technicianId);
}

app.post('/api/purchases', requireAuth, (req, res) => {
  const { date, refrigerantType, quantity, unit, cost, supplier, invoiceNumber, notes } =
    req.body || {};

  if (!date || !refrigerantType || quantity === undefined || quantity === '') {
    return res.status(400).json({ error: 'Date, refrigerant type, and quantity are required' });
  }
  if (req.user.role !== 'technician') {
    return res.status(403).json({ error: 'Only technicians can submit purchase entries' });
  }

  const db = getDb();
  const entry = {
    id: crypto.randomUUID(),
    technicianId: req.user.technicianId,
    technicianName: req.user.name,
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
  db.purchases.push(entry);
  persist();
  res.status(201).json({ purchase: entry });
});

app.get('/api/purchases', requireAuth, (req, res) => {
  let purchases = purchasesVisibleTo(req);
  const { technicianId, refrigerantType, dateFrom, dateTo } = req.query;
  if (req.user.role === 'admin' && technicianId) {
    purchases = purchases.filter((p) => p.technicianId === technicianId);
  }
  if (refrigerantType) {
    purchases = purchases.filter((p) => p.refrigerantType === refrigerantType);
  }
  if (dateFrom) {
    purchases = purchases.filter((p) => p.date >= dateFrom);
  }
  if (dateTo) {
    purchases = purchases.filter((p) => p.date <= dateTo);
  }
  purchases = [...purchases].sort((a, b) => new Date(b.date) - new Date(a.date));
  res.json({ purchases });
});

app.delete('/api/purchases/:id', requireAdmin, (req, res) => {
  const db = getDb();
  const before = db.purchases.length;
  db.purchases = db.purchases.filter((p) => p.id !== req.params.id);
  if (db.purchases.length === before)
    return res.status(404).json({ error: 'Purchase not found' });
  persist();
  res.json({ ok: true });
});

// ---------- Admin dashboard summary ----------

app.get('/api/admin/summary', requireAdmin, (_req, res) => {
  const db = getDb();
  const totalAdded = db.logs.reduce((sum, l) => sum + (l.amountAdded || 0), 0);
  const totalRecovered = db.logs.reduce((sum, l) => sum + (l.amountRecovered || 0), 0);
  const totalPurchased = db.purchases.reduce((sum, p) => sum + (p.quantity || 0), 0);
  const totalSpent = db.purchases.reduce((sum, p) => sum + (p.cost || 0), 0);
  res.json({
    technicianCount: db.technicians.length,
    logCount: db.logs.length,
    purchaseCount: db.purchases.length,
    totalAddedLbs: totalAdded,
    totalRecoveredLbs: totalRecovered,
    totalPurchasedLbs: totalPurchased,
    totalSpent,
  });
});

// ---------- CSV export ----------

app.get('/api/export/logs.csv', requireAdmin, (_req, res) => {
  const db = getDb();
  const csv = toCsv(db.logs, [
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
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="refrigerant_logs.csv"');
  res.send(csv);
});

app.get('/api/export/purchases.csv', requireAdmin, (_req, res) => {
  const db = getDb();
  const csv = toCsv(db.purchases, [
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
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="refrigerant_purchases.csv"');
  res.send(csv);
});

app.get('/api/health', (_req, res) => res.json({ ok: true }));

// ---------- Serve the built frontend (single-URL deployment) ----------

if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  app.get(/^(?!\/api\/).*/, (_req, res) => {
    res.sendFile(path.join(CLIENT_DIST, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Refrigerant Log API listening on http://localhost:${PORT}`);
});
