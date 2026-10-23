const { getSettings, saveSettings } = require('../modules/settings');

const sections = new Set(['payment', 'receipt', 'store', 'tax', 'delivery']);

const toSettingKey = (section, key) => {
  if (section === 'payment' && key === 'cardSupport') return 'credit_debit_card';
  return key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
};

const normalizeSettings = (section, settings) => Object.fromEntries(
  Object.entries(settings).map(([key, value]) => [
    toSettingKey(section, key),
    typeof value === 'boolean' ? Number(value) : value,
  ])
);

const validateDeliverySettings = (settings) => {
  const fields = [
    ['base_charge', 'Base delivery fee', false],
    ['free_minimum', 'Free-delivery minimum', false],
    ['per_km_charge', 'Delivery fee per kilometre', false],
    ['max_distance', 'Maximum delivery radius', true],
  ];
  for (const [key, label, mustBePositive] of fields) {
    const rawValue = settings[key];
    const value = Number(rawValue);
    if (rawValue === undefined || rawValue === null || String(rawValue).trim() === ''
      || !Number.isFinite(value) || value < 0 || (mustBePositive && value === 0)) {
      return `${label} must be a valid ${mustBePositive ? 'positive' : 'non-negative'} number.`;
    }
  }
  if (settings.express_charge !== undefined) {
    const expressCharge = Number(settings.express_charge);
    if (!Number.isFinite(expressCharge) || expressCharge < 0) {
      return 'Express delivery charge must be a non-negative number.';
    }
  }
  return null;
};

const get = async (req, res) => {
  if (!sections.has(req.params.section)) {
    return res.status(404).json({ success: false, message: 'Settings section not found.' });
  }

  try {
    return res.json({ success: true, data: await getSettings(req.params.section) });
  } catch (error) {
    console.error(`Failed to load ${req.params.section} settings:`, error.message);
    return res.status(500).json({ success: false, message: 'Unable to load settings.' });
  }
};

const save = async (req, res) => {
  if (!sections.has(req.params.section)) {
    return res.status(404).json({ success: false, message: 'Settings section not found.' });
  }
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).json({ success: false, message: 'Settings data must be an object.' });
  }

  try {
    const settings = normalizeSettings(req.params.section, req.body);
    if (req.params.section === 'delivery') {
      const validationError = validateDeliverySettings(settings);
      if (validationError) {
        return res.status(400).json({ success: false, message: validationError });
      }
    }
    const savedSettings = await saveSettings(req.params.section, settings);
    return res.json({ success: true, data: savedSettings });
  } catch (error) {
    console.error(`Failed to save ${req.params.section} settings:`, error.message);
    return res.status(500).json({ success: false, message: 'Unable to save settings.' });
  }
};

module.exports = { get, save };