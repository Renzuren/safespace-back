const express = require('express');
const router = express.Router();
const AccountController = require('../../controllers/user/AccountController');
const { AuthenticateToken, verifyRole } = require('../../middlewares/AuthenticateToken');

router.get(
  '/me',
  AuthenticateToken,
  verifyRole(['user']),
  AccountController.me
);

router.get(
  '/dashboard',
  AuthenticateToken,
  verifyRole(['user']),
  AccountController.dashboard
);

module.exports = router;