import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = process.env.DB_PATH || path.join(__dirname, 'data', 'db.json');

const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ChangeMe123!';

function defaultData() {
  return {
    technicians: [],
    logs: [],
    purchases: [],
    admin: {
      passwordHash: bcrypt.hashSync(DEFAULT_ADMIN_PASSWORD, 10),
    },
  };
}

function load() {
  if (!fs.existsSync(DATA_FILE)) {
    const data = defaultData();
    save(data);
    return data;
  }
  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  try {
    return JSON.parse(raw);
  } catch {
    return defaultData();
  }
}

function save(data) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

let db = load();

export function getDb() {
  return db;
}

export function persist() {
  save(db);
}

export function resetForTest() {
  db = defaultData();
  save(db);
}
