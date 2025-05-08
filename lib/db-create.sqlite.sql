CREATE TABLE IF NOT EXISTS sessions
(
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    key      TEXT,
    username TEXT
);

CREATE TABLE IF NOT EXISTS rooms
(
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    ownerUsername TEXT,
    name          TEXT,
    urlName       TEXT,
    isOpen        BOOLEAN,
    createdDate   DATE DEFAULT (datetime('now', 'localtime'))
);
