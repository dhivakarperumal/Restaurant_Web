const express = require('express');
const controller = require('../controllers/wishlistController');

const router = express.Router();

router.get('/', controller.list);
router.post('/', controller.add);
router.delete('/:foodId', controller.remove);

module.exports = router;
