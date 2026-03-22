const express = require('express');
const router = express.Router();
const AppointmentController = require('../../controllers/user/AppointmentController');
const { AuthenticateToken, verifyRole } = require('../../middlewares/AuthenticateToken');

router.post(
  '/appointment',
  AuthenticateToken,
  verifyRole(['user']),
  AppointmentController.create
);

router.get(
  '/appointments',
  AuthenticateToken,
  verifyRole(['user']),
  AppointmentController.get
);

router.put(
  '/appointment/:appointmentId',
  AuthenticateToken,
  verifyRole(['user']),
  AppointmentController.update
);

router.delete(
  '/appointment/:appointmentId',
  AuthenticateToken,
  verifyRole(['user']),
  AppointmentController.delete
);

module.exports = router;