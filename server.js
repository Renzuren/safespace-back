const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Routes
const authRoutes = require('./routes/auth/AuthRoutes');
const reportRoutes = require('./routes/user/ReportRoutes');
const appointmentRoutes = require('./routes/user/AppointmentRoutes');
const accountRoutes = require('./routes/user/AccountRoutes');
const adminAccountRoutes = require('./routes/admin/AccountRoutes');
const adminAppointmentRoutes = require('./routes/admin/AppointmentRoutes');
const adminReportRoutes = require('./routes/admin/ReportRoutes');

const app = express();
app.use(cors());
app.use(express.json());

// Endpoints
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/user', reportRoutes);
app.use('/api/v1/user', appointmentRoutes);
app.use('/api/v1/user', accountRoutes);
app.use('/api/v1/admin', adminAccountRoutes);
app.use('/api/v1/admin', adminAppointmentRoutes);
app.use('/api/v1/admin', adminReportRoutes);

// Port
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});