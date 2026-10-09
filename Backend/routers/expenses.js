const express = require('express');
const fs = require('fs');
const multer = require('multer');
const path = require('path');
const { randomUUID } = require('crypto');
const {
  addExpense,
  editExpense,
  getExpenses,
  removeExpense,
} = require('../controllers/expenseController');

const router = express.Router();
const uploadDirectory = path.join(__dirname, '..', 'upload', 'expenses');
fs.mkdirSync(uploadDirectory, { recursive: true });

const allowedFiles = new Map([
  ['.jpg', new Set(['image/jpeg'])],
  ['.jpeg', new Set(['image/jpeg'])],
  ['.png', new Set(['image/png'])],
  ['.pdf', new Set(['application/pdf'])],
  ['.doc', new Set(['application/msword', 'application/octet-stream'])],
  ['.docx', new Set([
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/zip',
    'application/octet-stream',
  ])],
]);

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDirectory,
    filename: (_req, file, callback) => {
      callback(null, `${randomUUID()}${path.extname(file.originalname).toLowerCase()}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const mimeTypes = allowedFiles.get(extension);
    if (!mimeTypes || !mimeTypes.has(file.mimetype)) {
      return callback(new Error('Upload a JPG, PNG, PDF, DOC, or DOCX receipt.'));
    }
    return callback(null, true);
  },
});

const uploadBill = (req, res, next) => {
  upload.single('upload_bill')(req, res, (error) => {
    if (!error) return next();
    const message = error instanceof multer.MulterError
      ? error.code === 'LIMIT_FILE_SIZE'
        ? 'Receipt files must be 5 MB or smaller.'
        : 'Only one receipt file can be uploaded.'
      : error.message || 'Receipt upload failed.';
    return res.status(400).json({ success: false, message });
  });
};

router.get('/', getExpenses);
router.post('/', uploadBill, addExpense);
router.put('/:expenseId', uploadBill, editExpense);
router.delete('/:expenseId', removeExpense);

module.exports = router;
