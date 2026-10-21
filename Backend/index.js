const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const { initializeAuthSchema, initializeBannerSchema, initializeCategorySchema, initializeCouponSchema, initializeCuisineSchema, initializeFoodSchema, initializeInventorySchema, initializeKitchenOrderSchema, initializeReviewSchema, initializeVideoSchema, initializeEmployeeSchema, initializeServerTableSchema, initializeSettingsSchema, initializeOrderSchema, initializeEventOrderSchema, initializeWishlistSchema, initializeReservationSchema, initializeAttendanceSchema, initializeExpenseSchema, initializeSalarySchema, testConnection } = require('./modules/modules');
const apiRouter = require('./routers/routes');
const { initializeRevenueIndexes } = require('./modules/revenue');
const { initializeNotificationSocket } = require('./utils/notificationSocket');

require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const server = http.createServer(app);

const allowedOrigins = new Set(
  (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
);

app.use(cors({
  origin: (origin, callback) => {
    const isLocalDevelopmentOrigin = process.env.NODE_ENV !== 'production'
      && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin || '');
    callback(null, !origin || isLocalDevelopmentOrigin || allowedOrigins.has(origin));
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/upload', express.static(path.join(__dirname, 'upload')));
app.use('/uploads', express.static(path.join(__dirname, 'upload')));
app.use('/api', apiRouter);

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Restaurant Backend API Running"
  });
});

const PORT = Number(process.env.PORT) || 5000;

async function startServer() {
  try {
    await testConnection();
    console.log('MySQL connected');
    await initializeAuthSchema();
    await initializeEmployeeSchema();
    await initializeAttendanceSchema();
    console.log('Attendance tables ready');
    await initializeServerTableSchema();
    await initializeReservationSchema();
    console.log('Reservation tables ready');
    console.log('Database tables ready');
    await initializeSettingsSchema();
    console.log('Settings table ready');
    await initializeExpenseSchema();
    console.log('Restaurant expense tables ready');
    await initializeSalarySchema();
    console.log('Employee salary tables ready');
    await initializeCategorySchema();
    console.log('Category tables ready');
    await initializeCuisineSchema();
    console.log('Cuisine tables ready');
    await initializeFoodSchema();
    console.log('Food tables ready');
    await initializeKitchenOrderSchema();
    console.log('Kitchen order tables ready');
    await initializeOrderSchema();
    console.log('Customer order tables ready');
    await initializeEventOrderSchema();
    console.log('Event & bulk order tables ready');
    await initializeWishlistSchema();
    console.log('Wishlist table ready');
    await initializeBannerSchema();
    console.log('Banner tables ready');
    await initializeInventorySchema();
    console.log('Inventory tables ready');
    await initializeCouponSchema();
    console.log('Coupon tables ready');
    await initializeReviewSchema();
    console.log('Review tables ready');
    await initializeVideoSchema();
    console.log('Video tables ready');
    await initializeRevenueIndexes();
    console.log('Revenue indexes ready');
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }

  initializeNotificationSocket(server, allowedOrigins);
  server.listen(PORT, () => {
    console.log(`Backend running: http://localhost:${PORT}`);
  });
}

startServer();