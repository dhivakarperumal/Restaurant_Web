const {
  createReservationRequest,
  findAllReservations,
  findAvailableReservationTables,
  findReservationsForUser,
  updateReservationStatus,
} = require('../modules/reservations');

const isValidDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

const isValidTime = (value) => {
  return /^(?:1[0-9]|20|21):[0-5][0-9]$|^22:00$/.test(value || '');
};

const normalizeText = (value) => String(value || '').trim();

async function listAvailableTables(req, res) {
  const { date, time, guests: guestsValue } = req.query || {};
  const hasAvailabilityFilters = Boolean(date || time || guestsValue);
  if (hasAvailabilityFilters && (!isValidDate(date) || !isValidTime(time))) {
    return res.status(400).json({ success: false, message: 'Choose a valid reservation date and time.' });
  }

  const guests = guestsValue ? Number(guestsValue) : null;
  if (guestsValue && (!Number.isInteger(guests) || guests < 1 || guests > 20)) {
    return res.status(400).json({ success: false, message: 'Guest count must be between 1 and 20.' });
  }

  try {
    const tables = await findAvailableReservationTables({
      date: hasAvailabilityFilters ? date : null,
      time: hasAvailabilityFilters ? time : null,
      guests,
    });
    return res.json({ success: true, tables });
  } catch (error) {
    console.error('Could not retrieve reservation tables:', error);
    return res.status(500).json({ success: false, message: 'Could not retrieve available tables.' });
  }
}

async function createReservation(req, res) {
  const body = req.body || {};
  const name = normalizeText(body.name);
  const email = normalizeText(body.email);
  const phone = normalizeText(body.phone);
  const date = normalizeText(body.date);
  const time = normalizeText(body.time);
  const tableId = normalizeText(body.table_id);
  const guests = Number(body.guests);
  const notes = normalizeText(body.notes);

  if (!name || name.length > 150 || !email || email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, message: 'Enter a valid name and email address.' });
  }
  if (!phone || phone.length > 32) {
    return res.status(400).json({ success: false, message: 'Enter a valid phone number.' });
  }
  if (!isValidDate(date) || !isValidTime(time)) {
    return res.status(400).json({ success: false, message: 'Choose a valid future reservation date and time.' });
  }
  if (!tableId || !Number.isInteger(guests) || guests < 1 || guests > 20 || notes.length > 1000) {
    return res.status(400).json({ success: false, message: 'Check your table, guest count, and special request details.' });
  }

  const [hour, minute] = time.split(':').map(Number);
  const endTime = `${String(hour + 1).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
  try {
    const reservation = await createReservationRequest({
      userId: req.auth.user_id,
      tableId,
      name,
      email,
      phone,
      date,
      startTime: `${time}:00`,
      endTime,
      guests,
      notes,
    });
    return res.status(201).json({
      success: true,
      message: 'Reservation request sent. Our team will confirm it shortly.',
      reservation,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    console.error('Could not create reservation request:', error);
    return res.status(500).json({ success: false, message: 'Could not submit your reservation request.' });
  }
}

async function listMyReservations(req, res) {
  try {
    const reservations = await findReservationsForUser(req.auth.user_id);
    return res.json({ success: true, reservations });
  } catch (error) {
    console.error('Could not retrieve customer reservations:', error);
    return res.status(500).json({ success: false, message: 'Could not retrieve your reservation requests.' });
  }
}

async function listReservations(req, res) {
  const { status } = req.query || {};
  const validStatuses = ['All', 'Pending', 'Confirmed', 'Declined', 'Cancelled'];
  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid reservation status filter.' });
  }
  try {
    const reservations = await findAllReservations(status || 'All');
    return res.json({ success: true, reservations });
  } catch (error) {
    console.error('Could not retrieve reservations:', error);
    return res.status(500).json({ success: false, message: 'Could not retrieve reservation requests.' });
  }
}

async function changeReservationStatus(req, res) {
  const status = normalizeText(req.body?.status);
  if (!['Confirmed', 'Declined', 'Cancelled'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Choose Confirmed, Declined, or Cancelled.' });
  }
  try {
    const reservation = await updateReservationStatus(req.params.reservationId, status);
    return res.json({ success: true, message: `Reservation ${status.toLowerCase()}.`, reservation });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    console.error('Could not update reservation status:', error);
    return res.status(500).json({ success: false, message: 'Could not update the reservation status.' });
  }
}

module.exports = {
  changeReservationStatus,
  createReservation,
  listAvailableTables,
  listMyReservations,
  listReservations,
};
