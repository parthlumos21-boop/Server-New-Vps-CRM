const remarkService = require('../services/remarkService')
const { AppError } = require('../utils/appError')

class RemarkController {
  async createRemark(req, res, next) {
    try {
      const { accountId, category, content, reminder, assignment } = req.body
      const userId = req.user?.id

      if (!userId) {
        throw new AppError('User not authenticated', 401)
      }

      const remark = await remarkService.createRemark({
        actor: req.user,
        accountId,
        category: category || 'general',
        content,
        createdBy: userId,
        reminder,
        assignment
      })

      res.status(201).json({
        success: true,
        message: 'Remark created successfully',
        data: remark
      })
    } catch (error) {
      next(error)
    }
  }

  async getRemarksByAccount(req, res, next) {
    try {
      const { accountId } = req.params
      const { limit = 50, offset = 0 } = req.query

      const remarks = await remarkService.getRemarksHistory(
        accountId,
        parseInt(limit),
        parseInt(offset),
        req.user
      )

      res.status(200).json({
        success: true,
        data: remarks
      })
    } catch (error) {
      next(error)
    }
  }

  async listRemarkReminders(req, res, next) {
    try {
      const reminders = await remarkService.listRemarkReminders(req.user)

      res.status(200).json({
        success: true,
        data: reminders
      })
    } catch (error) {
      next(error)
    }
  }

  async updateRemark(req, res, next) {
    try {
      const { remarkId } = req.params
      const userId = req.user?.id

      if (!userId) {
        throw new AppError('User not authenticated', 401)
      }

      const remark = await remarkService.updateRemark(remarkId, {
        actor: req.user,
        ...req.body,
        createdBy: userId
      })

      res.status(200).json({
        success: true,
        message: 'Remark updated successfully',
        data: remark
      })
    } catch (error) {
      next(error)
    }
  }

  async deleteRemark(req, res, next) {
    try {
      const { remarkId } = req.params
      const userId = req.user?.id

      if (!userId) {
        throw new AppError('User not authenticated', 401)
      }

      await remarkService.deleteRemark(remarkId, req.user)

      res.status(200).json({
        success: true,
        message: 'Remark deleted successfully'
      })
    } catch (error) {
      next(error)
    }
  }

  async updateReminder(req, res, next) {
    try {
      const { reminderId } = req.params
      const userId = req.user?.id

      if (!userId) {
        throw new AppError('User not authenticated', 401)
      }

      const reminder = await remarkService.createReminder(reminderId, {
        actor: req.user,
        ...req.body,
        createdBy: userId
      })

      res.status(200).json({
        success: true,
        message: 'Reminder updated successfully',
        data: reminder
      })
    } catch (error) {
      next(error)
    }
  }
}

module.exports = new RemarkController()
