const {
  createReview,
  deleteReview,
  findReviewById,
  getNextReviewId,
  getReviewStats,
  listReviews,
  listPublishedReviews,
  updateReview,
} = require('../modules/reviews');

// ── list ─────────────────────────────────────────────────────────────────────

const list = async (req, res) => {
  try {
    const productId = req.query.product_id || null;
    return res.json({ success: true, data: await listReviews(productId) });
  } catch (error) {
    console.error('Failed to list reviews:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load reviews.' });
  }
};

const listPublished = async (_req, res) => {
  try {
    return res.json({ success: true, data: await listPublishedReviews() });
  } catch (error) {
    console.error('Failed to list published reviews:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load customer reviews.' });
  }
};

// ── stats ─────────────────────────────────────────────────────────────────────

const stats = async (_req, res) => {
  try {
    return res.json({ success: true, data: await getReviewStats() });
  } catch (error) {
    console.error('Failed to get review stats:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load review stats.' });
  }
};

// ── next-id ───────────────────────────────────────────────────────────────────

const nextId = async (_req, res) => {
  try {
    return res.json({ success: true, data: await getNextReviewId() });
  } catch (error) {
    console.error('Failed to get next review ID:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to generate review ID.' });
  }
};

// ── getById ───────────────────────────────────────────────────────────────────

const getById = async (req, res) => {
  try {
    const review = await findReviewById(req.params.reviewId);
    if (!review) return res.status(404).json({ success: false, message: 'Review not found.' });
    return res.json({ success: true, data: review });
  } catch (error) {
    console.error('Failed to load review:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load review.' });
  }
};

// ── create ────────────────────────────────────────────────────────────────────

const create = async (req, res) => {
  const { reviewer_name, comment, rating } = req.body || {};

  if (!reviewer_name || !String(reviewer_name).trim()) {
    return res.status(400).json({ success: false, message: 'Reviewer name is required.' });
  }
  if (!comment || !String(comment).trim()) {
    return res.status(400).json({ success: false, message: 'Review comment is required.' });
  }
  if (!rating || Number(rating) < 1 || Number(rating) > 5) {
    return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5.' });
  }

  // Auto-generate review_id if not provided
  let reviewId = String(req.body.review_id || '').trim();
  if (!reviewId) {
    reviewId = await getNextReviewId();
  }

  try {
    const saved = await createReview({ ...req.body, review_id: reviewId });
    return res.status(201).json({ success: true, data: saved });
  } catch (error) {
    console.error('Failed to create review:', error.message);
    // Duplicate review_id — retry with generated one
    if (error.code === 'ER_DUP_ENTRY') {
      try {
        const newId = await getNextReviewId();
        const saved = await createReview({ ...req.body, review_id: newId });
        return res.status(201).json({ success: true, data: saved });
      } catch (retryError) {
        console.error('Retry failed:', retryError.message);
      }
    }
    return res.status(500).json({ success: false, message: 'Unable to save review.' });
  }
};

// ── update ────────────────────────────────────────────────────────────────────

const update = async (req, res) => {
  const { reviewer_name, comment, rating } = req.body || {};

  if (!reviewer_name || !String(reviewer_name).trim()) {
    return res.status(400).json({ success: false, message: 'Reviewer name is required.' });
  }
  if (!comment || !String(comment).trim()) {
    return res.status(400).json({ success: false, message: 'Review comment is required.' });
  }
  if (!rating || Number(rating) < 1 || Number(rating) > 5) {
    return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5.' });
  }

  try {
    const saved = await updateReview(req.params.reviewId, req.body);
    if (!saved) return res.status(404).json({ success: false, message: 'Review not found.' });
    return res.json({ success: true, data: saved });
  } catch (error) {
    console.error('Failed to update review:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to update review.' });
  }
};

// ── remove ────────────────────────────────────────────────────────────────────

const remove = async (req, res) => {
  try {
    if (!await deleteReview(req.params.reviewId)) {
      return res.status(404).json({ success: false, message: 'Review not found.' });
    }
    return res.json({ success: true, message: 'Review deleted.' });
  } catch (error) {
    console.error('Failed to delete review:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to delete review.' });
  }
};

module.exports = { create, getById, list, listPublished, nextId, remove, stats, update };
