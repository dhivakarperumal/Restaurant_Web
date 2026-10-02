const db = require('../config/db');

const initializeSettingsSchema = async () => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS app_settings (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      setting_key VARCHAR(40) NOT NULL UNIQUE,
      setting_value LONGTEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
};

const getSettings = async (section) => {
  const [rows] = await db.execute(
    'SELECT setting_value FROM app_settings WHERE setting_key = ? LIMIT 1',
    [section]
  );
  if (!rows[0]) return {};

  try {
    const settings = JSON.parse(rows[0].setting_value);
    return settings && typeof settings === 'object' && !Array.isArray(settings) ? settings : {};
  } catch {
    return {};
  }
};

const saveSettings = async (section, settings) => {
  await db.execute(
    `INSERT INTO app_settings (setting_key, setting_value)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
    [section, JSON.stringify(settings)]
  );
  return getSettings(section);
};

module.exports = { getSettings, initializeSettingsSchema, saveSettings };