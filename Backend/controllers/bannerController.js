const {
  createBanner,
  deleteBanner,
  findBannerById,
  listBanners,
  updateBanner,
} = require('../modules/banners');

const asBoolean = (value) => [true, 1, '1', 'true', 'yes'].includes(
  typeof value === 'string' ? value.toLowerCase() : value
);

const normalizeBanner = (body = {}, userId = '') => ({
  title: String(body.title || '').trim(),
  subtitle: String(body.subtitle || '').trim(),
  description: String(body.description || '').trim(),
  image: String(body.image || '').trim(),
  mobile_image: String(body.mobile_image || '').trim(),
  link: String(body.link || '').trim(),
  type: String(body.type || 'hero').trim().toLowerCase(),
  active: asBoolean(body.active),
  user_id: userId,
});

const validateBanner = (banner) => {
  if (!banner.image) return 'A desktop banner image is required.';
  if (!['hero', 'offer'].includes(banner.type)) return 'Banner type must be hero or offer.';
  return '';
};

const list = async (_req, res) => {
  try {
    return res.json({ success: true, data: await listBanners() });
  } catch (error) {
    console.error('Failed to list banners:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load banners.' });
  }
};

const getById = async (req, res) => {
  try {
    const banner = await findBannerById(req.params.bannerId);
    if (!banner) return res.status(404).json({ success: false, message: 'Banner not found.' });
    return res.json({ success: true, data: banner });
  } catch (error) {
    console.error('Failed to load banner:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load banner.' });
  }
};

const create = async (req, res) => {
  const banner = normalizeBanner(req.body, req.auth?.user_id || '');
  const validationMessage = validateBanner(banner);
  if (validationMessage) return res.status(400).json({ success: false, message: validationMessage });

  try {
    return res.status(201).json({ success: true, data: await createBanner(banner) });
  } catch (error) {
    console.error('Failed to create banner:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to save banner.' });
  }
};

const update = async (req, res) => {
  const banner = normalizeBanner(req.body);
  const validationMessage = validateBanner(banner);
  if (validationMessage) return res.status(400).json({ success: false, message: validationMessage });

  try {
    const savedBanner = await updateBanner(req.params.bannerId, banner);
    if (!savedBanner) return res.status(404).json({ success: false, message: 'Banner not found.' });
    return res.json({ success: true, data: savedBanner });
  } catch (error) {
    console.error('Failed to update banner:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to update banner.' });
  }
};

const remove = async (req, res) => {
  try {
    if (!await deleteBanner(req.params.bannerId)) return res.status(404).json({ success: false, message: 'Banner not found.' });
    return res.json({ success: true, message: 'Banner deleted.' });
  } catch (error) {
    console.error('Failed to delete banner:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to delete banner.' });
  }
};

module.exports = { create, getById, list, remove, update };