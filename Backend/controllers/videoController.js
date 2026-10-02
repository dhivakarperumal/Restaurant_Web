const { createVideo, deleteVideo, findVideoById, listVideos, updateVideo } = require('../modules/videos');

const asBoolean = (value) => value === undefined ? true : [true, 1, '1', 'true', 'yes'].includes(
  typeof value === 'string' ? value.toLowerCase() : value
);

const normalizeVideo = (body = {}, userId = '') => ({
  title: String(body.title || '').trim(),
  videoId: String(body.videoId || '').trim(),
  thumbnail: String(body.thumbnail || '').trim(),
  type: String(body.type || 'youtube').trim().toLowerCase(),
  active: asBoolean(body.active),
  user_id: userId || body.user_id || null,
});

const validateVideo = (video) => {
  if (!video.title || video.title.length > 255) return 'A video title of 1 to 255 characters is required.';
  if (!video.videoId) return 'A YouTube ID or uploaded video URL is required.';
  if (!['youtube', 'custom'].includes(video.type)) return 'Video type must be YouTube or custom.';
  return '';
};

const list = async (_req, res) => {
  try {
    return res.json(await listVideos());
  } catch (error) {
    console.error('Failed to list videos:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load videos.' });
  }
};

const create = async (req, res) => {
  const video = normalizeVideo(req.body, req.auth?.user_id || '');
  const validationMessage = validateVideo(video);
  if (validationMessage) return res.status(400).json({ success: false, message: validationMessage });
  try {
    return res.status(201).json({ success: true, data: await createVideo(video) });
  } catch (error) {
    console.error('Failed to create video:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to save video.' });
  }
};

const update = async (req, res) => {
  if (!/^\d+$/.test(req.params.videoId)) return res.status(400).json({ success: false, message: 'A valid video ID is required.' });
  const video = normalizeVideo(req.body, req.auth?.user_id || '');
  const validationMessage = validateVideo(video);
  if (validationMessage) return res.status(400).json({ success: false, message: validationMessage });
  try {
    const savedVideo = await updateVideo(req.params.videoId, video);
    if (!savedVideo) return res.status(404).json({ success: false, message: 'Video not found.' });
    return res.json({ success: true, data: savedVideo });
  } catch (error) {
    console.error('Failed to update video:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to update video.' });
  }
};

const remove = async (req, res) => {
  if (!/^\d+$/.test(req.params.videoId)) return res.status(400).json({ success: false, message: 'A valid video ID is required.' });
  try {
    if (!await deleteVideo(req.params.videoId)) return res.status(404).json({ success: false, message: 'Video not found.' });
    return res.json({ success: true, message: 'Video deleted.' });
  } catch (error) {
    console.error('Failed to delete video:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to delete video.' });
  }
};

const uploadResponse = (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'A file is required.' });
  const relativePath = req.file.path.split(/[\\/]/).slice(-2).map(encodeURIComponent).join('/');
  const backendUrl = (process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`).replace(/\/+$/, '');
  return res.status(201).json({ success: true, url: `${backendUrl}/uploads/${relativePath}` });
};

module.exports = { create, list, remove, update, uploadResponse };