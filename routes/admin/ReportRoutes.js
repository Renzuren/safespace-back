const express = require('express');
const router = express.Router();
const ReportController = require('../../controllers/admin/ReportController');
const { AuthenticateToken, verifyRole } = require('../../middlewares/AuthenticateToken');

router.get(
  '/reports',
  AuthenticateToken,
  verifyRole(['admin']),
  ReportController.get
);

router.put(
  '/report/:reportId',
  AuthenticateToken,
  verifyRole(['admin']),
  ReportController.update
);

module.exports = router;