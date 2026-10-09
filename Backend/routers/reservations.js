const express = require('express');
const {
  changeReservationStatus,
  createReservation,
  listAvailableTables,
  listMyReservations,
  listReservations,
} = require('../controllers/reservationController');

const router = express.Router();

router.get('/available-tables', listAvailableTables);
router.get('/mine', listMyReservations);
router.post('/', createReservation);
router.get('/', listReservations);
router.patch('/:reservationId/status', changeReservationStatus);

module.exports = router;
