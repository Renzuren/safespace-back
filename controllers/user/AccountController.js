const { STATUS_CODES } = require('../../utils/constants');
const AccountModel = require('../../models/AccountModel');
const ReportModel = require('../../models/ReportModel');
const AppointmentModel = require('../../models/AppointmentModel');
const { v4: uuidv4 } = require('uuid');

class AccountController {
  async me(req, res) {
    try {
      const userId = req.user?.userId || req.user?.id;
      
      if (!userId) {
        return res.status(STATUS_CODES.UNAUTHORIZED).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      const account = await AccountModel.findByUserId(userId);
      
      if (!account) {
        return res.status(STATUS_CODES.NOT_FOUND).json({
          success: false,
          message: 'Account not found'
        });
      }

      return res.status(STATUS_CODES.OK).json({
        success: true,
        data: account
      });
    } catch (error) {
      console.error('Error fetching account:', error);
      return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to fetch account information'
      });
    }
  }

  async dashboard(req, res) {
    try {
      const userId = req.user?.userId || req.user?.id;
      
      if (!userId) {
        return res.status(STATUS_CODES.UNAUTHORIZED).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      // Get total reports
      const totalReports = await ReportModel.countByUserId(userId);
      
      // Get pending reports
      const pendingReports = await ReportModel.countByUserIdAndStatus(userId, 'pending');
      
      // Get appointments (confirmed + pending)
      const appointments = await AppointmentModel.countByUserIdAndStatus(userId, ['confirmed', 'pending']);
      
      // Get resolved reports
      const resolvedReports = await ReportModel.countByUserIdAndStatus(userId, 'resolved');

      return res.status(STATUS_CODES.OK).json({
        success: true,
        data: {
          totalReports,
          pending: pendingReports,
          appointments,
          resolved: resolvedReports
        }
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to fetch dashboard data'
      });
    }
  }
}

module.exports = new AccountController();