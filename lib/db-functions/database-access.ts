import path from "node:path";
import { Database } from "jsr:@db/sqlite";
import { pathJoin, projectDir } from "../paths.ts";
import { randomUUID } from "node:crypto";
import { User } from "../AuthHandler.ts";

let db: Database | undefined;

function getDb() {
  if (db) {
    return db;
  }
  const envVarName = "VOI__SQLITE_LOCATION";
  const sqliteLocation = Deno.env.get(envVarName);

  if (!sqliteLocation) {
    throw new Error(
      `${envVarName} is not set, it must be set to a usable path for sqlite`,
    );
  }
  if (!sqliteLocation.endsWith(".sqlite")) {
    throw new Error(`${envVarName} must end with .sqlite`);
  }
  if (
    path.relative(path.join(Deno.cwd(), ".persistence"), sqliteLocation)
      .startsWith("..")
  ) {
    throw new Error(
      `${envVarName} must be in persistence directory (which can be symlinked if you want the actual file somewhere else).`,
    );
  }
  console.log("creating db at", sqliteLocation);
  Deno.mkdirSync(path.dirname(sqliteLocation), { recursive: true });
  db = new Database(sqliteLocation);
  return db;
}

export async function ensureDbExists() {
  const db = getDb();
  const creationSql = await Deno.readTextFile(
    pathJoin(projectDir, "lib", "db-create.sqlite.sql"),
  );
  creationSql.split(";").forEach((sql) => {
    if (sql.trim().length > 0) {
      db.prepare(sql).run();
    }
  });
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

export function createRoom(roomName: string, ownerUsername: string) {
  const urlName = randomUUID();
  const db = getDb();
  db.prepare(
    `
    INSERT INTO rooms (name, ownerUsername, urlName, isOpen) VALUES (?, ?, ?, ?);
    `,
  ).run(roomName, ownerUsername, urlName, false);
  return { urlName };
}

export function openRoom(roomUrlName: string, ownerUsername: string) {
  const db = getDb();
  const result = db.prepare(
    `
    UPDATE rooms SET isOpen = ? WHERE urlName = ? AND ownerUsername = ?;
    `,
  ).run(true, roomUrlName, ownerUsername);
  return result !== 0;
}

export function roomNameByUrlName(urlName: string) {
  const db = getDb();
  const query = `
  SELECT name FROM rooms WHERE urlName = ?;
  `;
  const row = db.prepare(query).get<{ name: string }>(urlName);
  if (!row) {
    return null;
  }
  return row.name;
}

export function isRoomOpenByUrlName(urlName: string) {
  const db = getDb();
  const row = db.prepare(
    `
    SELECT isOpen FROM rooms WHERE urlName = ?;
    `,
  ).get<{ isOpen: boolean }>(urlName);
  if (!row) {
    return null;
  }
  return row.isOpen;
}

export function getLatestRoomNameForOwnerName(ownerUsername: string) {
  const db = getDb();
  const row = db.prepare(
    `
    SELECT name FROM rooms WHERE ownerUsername = ? ORDER BY createdDate DESC LIMIT 1;
    `,
  ).get<{ name: string }>(ownerUsername);
  if (!row) {
    return null;
  }
  return row.name;
}

export function getUrlForRoomNameAndOwner(
  roomName: string,
  ownerUsername: string,
) {
  const db = getDb();
  const query = `
  SELECT urlName FROM rooms WHERE name = ? AND ownerUsername = ?;
  `;
  const row = db.prepare(query).get<{ urlName: string }>(
    roomName,
    ownerUsername,
  );
  if (!row) {
    return null;
  }
  return row.urlName;
}

export function isUserOwnerOfRoom(user: User | undefined, roomUrlName: string) {
  if (!user) {
    return false;
  }
  const db = getDb();
  const row = db.prepare(
    `
    SELECT ownerUsername FROM rooms WHERE urlName = ?;
    `,
  ).get<{ ownerUsername: string }>(roomUrlName);
  if (!row) {
    console.log("No row", { roomUrlName });
    return false;
  }
  return row.ownerUsername === user.username;
}
