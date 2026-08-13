CREATE TABLE technicians (
  id TEXT PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE logs (
  id TEXT PRIMARY KEY,
  technician_id TEXT NOT NULL,
  technician_name TEXT NOT NULL,
  date TEXT NOT NULL,
  equipment_id TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT '',
  refrigerant_type TEXT NOT NULL,
  service_type TEXT NOT NULL,
  amount_added REAL,
  amount_recovered REAL,
  unit TEXT NOT NULL DEFAULT 'lbs',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE purchases (
  id TEXT PRIMARY KEY,
  technician_id TEXT NOT NULL,
  technician_name TEXT NOT NULL,
  date TEXT NOT NULL,
  refrigerant_type TEXT NOT NULL,
  quantity REAL NOT NULL,
  unit TEXT NOT NULL DEFAULT 'lbs',
  cost REAL,
  supplier TEXT NOT NULL DEFAULT '',
  invoice_number TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE admin_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  password_hash TEXT NOT NULL
);

CREATE INDEX idx_logs_technician ON logs(technician_id);
CREATE INDEX idx_logs_date ON logs(date);
CREATE INDEX idx_purchases_technician ON purchases(technician_id);
CREATE INDEX idx_purchases_date ON purchases(date);
