const { createHash, randomBytes, randomUUID, scrypt, timingSafeEqual } = require('crypto');
const { promisify } = require('util');
const db = require('../config/db');

const scryptAsync = promisify(scrypt);

const isNumericColumn = (column) => /^(tinyint|smallint|mediumint|int|bigint)/i.test(column?.Type || '');

async function migrateSessionUserKey() {
  const [sessionTables] = await db.query("SHOW TABLES LIKE 'user_sessions'");
  if (sessionTables.length === 0) return;

  const [sessionColumns] = await db.query('SHOW COLUMNS FROM user_sessions');
  if (!sessionColumns.some((column) => column.Field === 'user_id')) return;

  const [foreignKeys] = await db.execute(
    `SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_sessions'
       AND COLUMN_NAME = 'user_id' AND REFERENCED_TABLE_NAME = 'users'`
  );
  for (const foreignKey of foreignKeys) {
    const name = foreignKey.CONSTRAINT_NAME.replace(/`/g, '``');
    await db.query(`ALTER TABLE user_sessions DROP FOREIGN KEY \`${name}\``);
  }

  const [indexes] = await db.query('SHOW INDEX FROM user_sessions');
  const oldIndexes = [...new Set(indexes
    .filter((index) => index.Column_name === 'user_id' && index.Key_name !== 'PRIMARY')
    .map((index) => index.Key_name))];
  for (const indexName of oldIndexes) {
    const name = indexName.replace(/`/g, '``');
    await db.query(`ALTER TABLE user_sessions DROP INDEX \`${name}\``);
  }

  await db.query('ALTER TABLE user_sessions CHANGE COLUMN user_id user_pk BIGINT UNSIGNED NOT NULL');
  await db.query('ALTER TABLE user_sessions ADD INDEX user_sessions_user_pk_idx (user_pk)');
}

async function migrateUserIdentifiers() {
  const [columns] = await db.query('SHOW COLUMNS FROM users');
  const userIdColumn = columns.find((column) => column.Field === 'user_id');
  let idColumn = columns.find((column) => column.Field === 'id');
  let [legacyColumn] = await db.query("SHOW COLUMNS FROM users LIKE 'legacy_user_key'");

  if (!userIdColumn) throw new Error('The users table is missing its user_id column');
  if (!isNumericColumn(userIdColumn) && isNumericColumn(idColumn)) {
    const [columnOrder] = await db.execute(
      `SELECT COLUMN_NAME, ORDINAL_POSITION FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'
         AND COLUMN_NAME IN ('user_id', 'id')`
    );
    const userIdPosition = columnOrder.find((column) => column.COLUMN_NAME === 'user_id')?.ORDINAL_POSITION;
    const idPosition = columnOrder.find((column) => column.COLUMN_NAME === 'id')?.ORDINAL_POSITION;
    if (userIdPosition > idPosition) {
      await db.query('ALTER TABLE users MODIFY user_id VARCHAR(255) NOT NULL FIRST');
      await db.query('ALTER TABLE users MODIFY id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT AFTER user_id');
    }
    return;
  }

  if (!idColumn) {
    await db.query('ALTER TABLE users ADD COLUMN id BIGINT UNSIGNED NULL AFTER user_id');
    await db.query('UPDATE users SET id = user_id');
    idColumn = { Type: 'bigint unsigned' };
  }

  if (!isNumericColumn(userIdColumn) && !legacyColumn.length) {
    throw new Error('Unsupported users identifier schema; refusing to rewrite account IDs');
  }

  await migrateSessionUserKey();

  if (!legacyColumn.length) {
    await db.query('ALTER TABLE users ADD COLUMN legacy_user_key BIGINT UNSIGNED NULL');
    await db.query('UPDATE users SET legacy_user_key = user_id');
  }

  await db.query('ALTER TABLE users MODIFY user_id VARCHAR(255) NOT NULL');

  if (!isNumericColumn(idColumn)) {
    await db.query('UPDATE users SET user_id = id');
  } else {
    const [users] = await db.query('SELECT legacy_user_key, user_id FROM users');
    for (const user of users) {
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.user_id)) {
        await db.execute('UPDATE users SET user_id = ? WHERE legacy_user_key = ?', [randomUUID(), user.legacy_user_key]);
      }
    }
  }

  await db.query('UPDATE users SET id = CAST(legacy_user_key AS CHAR)');
  await db.query('ALTER TABLE users MODIFY id BIGINT UNSIGNED NOT NULL');

  const [indexes] = await db.query('SHOW INDEX FROM users');
  const oldIdIndexes = [...new Set(indexes
    .filter((index) => index.Column_name === 'id' && index.Key_name !== 'PRIMARY')
    .map((index) => index.Key_name))];
  for (const indexName of oldIdIndexes) {
    const name = indexName.replace(/`/g, '``');
    await db.query(`ALTER TABLE users DROP INDEX \`${name}\``);
  }

  await db.query(`
    ALTER TABLE users
      DROP PRIMARY KEY,
      MODIFY id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      ADD PRIMARY KEY (id),
      ADD UNIQUE KEY users_user_id_unique (user_id),
      DROP COLUMN legacy_user_key
  `);
}

async function initializeAuthSchema() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      user_id VARCHAR(255) NOT NULL UNIQUE,
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(100) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      mobile_number VARCHAR(32) NULL,
      password_hash VARCHAR(255) NULL,
      role VARCHAR(50) NOT NULL DEFAULT 'user',
      status VARCHAR(20) NOT NULL DEFAULT 'Active',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await migrateUserIdentifiers();

  await db.query(`
    CREATE TABLE IF NOT EXISTS user_sessions (
      token_hash CHAR(64) NOT NULL PRIMARY KEY,
      user_pk BIGINT UNSIGNED NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX user_sessions_user_pk_idx (user_pk),
      CONSTRAINT user_sessions_user_pk_fk FOREIGN KEY (user_pk)
        REFERENCES users (id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  const [sessionForeignKeys] = await db.execute(
    `SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_sessions'
       AND COLUMN_NAME = 'user_pk' AND REFERENCED_TABLE_NAME = 'users'
       AND REFERENCED_COLUMN_NAME = 'id'`
  );
  if (sessionForeignKeys.length === 0) {
    await db.query(`
      ALTER TABLE user_sessions ADD CONSTRAINT user_sessions_user_pk_fk
      FOREIGN KEY (user_pk) REFERENCES users (id) ON DELETE CASCADE
    `);
  }

  const adminEmail = String(process.env.BOOTSTRAP_ADMIN_EMAIL || '').trim().toLowerCase();
  const adminPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) return;

  const [admins] = await db.execute(
    "SELECT user_id FROM users WHERE LOWER(role) IN ('admin', 'super admin', 'superadmin') LIMIT 1"
  );
  if (admins.length > 0) return;

  const [existingUsers] = await db.execute('SELECT user_id FROM users WHERE email = ? LIMIT 1', [adminEmail]);
  if (existingUsers.length > 0) {
    const passwordHash = await hashPassword(adminPassword);
    await db.execute(
      "UPDATE users SET role = 'Admin', status = 'Active', password_hash = ? WHERE user_id = ?",
      [passwordHash, existingUsers[0].user_id]
    );
    return;
  }

  await createUser({
    username: String(process.env.BOOTSTRAP_ADMIN_NAME || 'Administrator').trim().slice(0, 100),
    email: adminEmail,
    phone: '',
    password: adminPassword,
    role: 'Admin',
  });
}

async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = await scryptAsync(password, salt, 64);
  return `scrypt$${salt}$${derivedKey.toString('hex')}`;
}

async function verifyPassword(password, storedHash) {
  if (!storedHash) return false;

  const [algorithm, salt, key] = storedHash.split('$');
  if (algorithm !== 'scrypt' || !salt || !key) return false;

  const expected = Buffer.from(key, 'hex');
  const actual = await scryptAsync(password, salt, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

async function createUser({ username, email, phone, password, role = 'user' }) {
  const passwordHash = password ? await hashPassword(password) : null;
  const [result] = await db.execute(
    `INSERT INTO users (user_id, username, email, mobile_number, password_hash, role)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [randomUUID(), username, email, phone || null, passwordHash, role]
  );

  return findUserById(result.insertId);
}

async function findUserById(userId) {
  const [rows] = await db.execute(
    `SELECT id, user_id, username, email, mobile_number, role, status
     FROM users WHERE id = ? LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

async function findUserByIdentifier(identifier) {
  const [rows] = await db.execute(
    `SELECT id, user_id, username, email, mobile_number, password_hash, role, status
     FROM users WHERE email = ? OR username = ? LIMIT 1`,
    [identifier, identifier]
  );
  return rows[0] || null;
}

async function createSession(userId, rememberMe = true) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + (rememberMe ? 30 : 1) * 24 * 60 * 60 * 1000);
  const tokenHash = createHash('sha256').update(token).digest('hex');

  await db.execute(
    'INSERT INTO user_sessions (token_hash, user_pk, expires_at) VALUES (?, ?, ?)',
    [tokenHash, userId, expiresAt]
  );

  return { token, expiresAt };
}

async function findUserByToken(token) {
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const [rows] = await db.execute(
    `SELECT users.id, users.user_id, users.username, users.email, users.mobile_number, users.role, users.status
     FROM user_sessions
     INNER JOIN users ON users.id = user_sessions.user_pk
     WHERE user_sessions.token_hash = ? AND user_sessions.expires_at > NOW()
     LIMIT 1`,
    [tokenHash]
  );
  return rows[0] || null;
}

module.exports = {
  createSession,
  createUser,
  findUserByIdentifier,
  findUserByToken,
  initializeAuthSchema,
  verifyPassword,
};