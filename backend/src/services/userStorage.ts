import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

const DATA_DIR = join(process.cwd(), "data");
const USERS_FILE = join(DATA_DIR, "users.json");

export interface StoredUser {
  id: string;
  email: string;
  password: string;
  role: string;
  did?: string;
  organizationName?: string;
  createdAt: string;
}

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function loadUsers(): StoredUser[] {
  try {
    ensureDataDir();
    if (existsSync(USERS_FILE)) {
      const data = readFileSync(USERS_FILE, "utf8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("[UserStorage] Failed to load users:", err);
  }
  return [];
}

export function saveUsers(users: StoredUser[]): void {
  try {
    ensureDataDir();
    writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf8");
  } catch (err) {
    console.error("[UserStorage] Failed to save users:", err);
  }
}
