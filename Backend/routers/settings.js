const express = require('express');
const controller = require('../controllers/settingsController');

const router = express.Router();

router.get('/:section', controller.get);
router.post('/:section', controller.save);

module.exports = router;