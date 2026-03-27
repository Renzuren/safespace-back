const express = require('express');
const router = express.Router();
const ReportController = require('../../controllers/user/ReportController');
const { AuthenticateToken, verifyRole } = require('../../middlewares/AuthenticateToken');

router.post(
  '/report',
  AuthenticateToken,
  verifyRole(['user']),
  ReportController.create
);

router.get(
  '/reports',
  AuthenticateToken,
  verifyRole(['user']),
  ReportController.get
);

router.get(
  '/sanctions',
  AuthenticateToken,
  verifyRole(['user']),
  ReportController.getCount
);

module.exports = router;