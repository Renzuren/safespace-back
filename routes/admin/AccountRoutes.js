const express = require('express');
const router = express.Router();
const AccountController = require('../../controllers/admin/AccountController');
const { AuthenticateToken, verifyRole } = require('../../middlewares/AuthenticateToken');

router.get(
  '/me',
  AuthenticateToken,
  verifyRole(['admin']),
  AccountController.me
);

router.get(
  '/users',
  AuthenticateToken,
  verifyRole(['admin']),
  AccountController.getUsers
);

router.get(
  '/dashboard',
  AuthenticateToken,
  verifyRole(['admin']),
  AccountController.dashboard
);

router.put(
  '/users/:userId',
  AuthenticateToken,
  verifyRole(['admin']),
  AccountController.updateRole
);

module.exports = router;