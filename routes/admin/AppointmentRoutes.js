const express = require('express');
const router = express.Router();
const AppointmentController = require('../../controllers/admin/AppointmentController');
const { AuthenticateToken, verifyRole } = require('../../middlewares/AuthenticateToken');

router.get(
  '/appointments',
  AuthenticateToken,
  verifyRole(['admin']),
  AppointmentController.get
);

router.put(
  '/appointment/:appointmentId',
  AuthenticateToken,
  verifyRole(['admin']),
  AppointmentController.update
);

module.exports = router;