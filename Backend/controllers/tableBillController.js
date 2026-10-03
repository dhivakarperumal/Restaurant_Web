const {
  getActiveBillForTable,
  getTableBillDetails,
  listTableBills,
  settleTableBill,
} = require('../modules/tableBills');

async function getActiveBill(req, res) {
  try {
    const tableId = String(req.params.tableId || '').trim();
    if (!tableId) {
      return res.status(400).json({ success: false, message: 'Table ID is required' });
    }
    const bill = await getActiveBillForTable(tableId);
    return res.json({ success: true, bill });
  } catch (error) {
    console.error('Error fetching active bill for table:', error.message);
    return res.status(500).json({ success: false, message: 'Could not load active bill for table' });
  }
}

async function getBill(req, res) {
  try {
    const billId = String(req.params.billId || '').trim();
    if (!billId) {
      return res.status(400).json({ success: false, message: 'Bill ID is required' });
    }
    const bill = await getTableBillDetails(billId);
    if (!bill) {
      return res.status(404).json({ success: false, message: 'Bill not found' });
    }
    return res.json({ success: true, bill });
  } catch (error) {
    console.error('Error fetching bill details:', error.message);
    return res.status(500).json({ success: false, message: 'Could not load bill details' });
  }
}

async function settleBill(req, res) {
  try {
    const billId = String(req.params.billId || '').trim();
    const { payment_method, discount } = req.body || {};
    if (!billId) {
      return res.status(400).json({ success: false, message: 'Bill ID is required' });
    }
    const settledBill = await settleTableBill({
      billId,
      paymentMethod: payment_method || 'Cash',
      discount: Number(discount) || 0,
      settledBy: req.auth?.user_id,
    });
    return res.json({
      success: true,
      message: 'Bill settled successfully. Table is now available.',
      bill: settledBill,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    console.error('Error settling bill:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to settle bill' });
  }
}

async function getAllBills(req, res) {
  try {
    const bills = await listTableBills(req.query || {});
    return res.json({ success: true, bills });
  } catch (error) {
    console.error('Error fetching bills list:', error.message);
    return res.status(500).json({ success: false, message: 'Could not load bills' });
  }
}

module.exports = {
  getActiveBill,
  getAllBills,
  getBill,
  settleBill,
};
