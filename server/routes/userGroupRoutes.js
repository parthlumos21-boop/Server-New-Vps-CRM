const express = require('express')
const router = express.Router()
const userGroupController = require('../controllers/userGroupController')
const { requireAuth } = require('../middleware/authMiddleware')

router.use(requireAuth)

router.get('/', userGroupController.listGroups)
router.get('/:id/members', userGroupController.listGroupMembers)
router.post('/', userGroupController.createGroup)
router.delete('/:id', userGroupController.deleteGroup)

module.exports = router
