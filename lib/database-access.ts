import path from "node:path";
import { Database } from "jsr:@db/sqlite";

let db: Database | undefined;

function getDb() {
  if (db) {
    return db;
  }
  const envVarName = "VOI__SQLITE_LOCATION";
  const sqliteLocation = Deno.env.get(envVarName);

  if (!sqliteLocation) {
    throw new Error(`${envVarName} is not set, it must be set to a usable path for sqlite`);
  }
  if (!sqliteLocation.endsWith(".sqlite")) {
    throw new Error(`${envVarName} must end with .sqlite`);
  }
  if (path.relative(path.join(Deno.cwd(), '.persistence'), sqliteLocation).startsWith("..")) {
    throw new Error(`${envVarName} must be in persistence directory (which can be symlinked if you want the actual file somewhere else).`);
  }
  console.log('creating db at', sqliteLocation);
  Deno.mkdirSync(path.dirname(sqliteLocation), { recursive: true });
  db = new Database(sqliteLocation);
  return db;
}

export function ensureDbExists() {
  const db = getDb();
  db.exec(`CREATE TABLE IF NOT EXISTS sessions
           (
               id
               INTEGER
               PRIMARY
               KEY
               AUTOINCREMENT,
               
               key
               TEXT,
               
               username
               TEXT
           );
    `,
  );
}

export function setSession(key: string, username: string) {
  getDb().prepare(
    `
    INSERT INTO sessions (key, username) VALUES (?, ?);
    `,
  ).run(key, username);
}

type SessionRow = {
  username: string;
};

export function getSession(key: string): string | null {
  const db = getDb();
  const row = db.prepare(
    `
    SELECT username FROM sessions WHERE key = ?;
    `,
  ).get<SessionRow>(key);
  if (!row) {
    return null;
  }
  return row.username;
}

// db.prepare(
//   `
// 	INSERT INTO people (name, age) VALUES (?, ?);
//   `,
// ).run("Bob", 40);
// const rows = db.prepare("SELECT id, name, age FROM people").all();
// console.log("People:");
// for (const row of rows) {
//   console.log(row);
// }
// db.close();
