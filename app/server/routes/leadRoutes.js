const express = require('express')
const leadController = require('../controllers/leadController')
const { requireAuth } = require('../middleware/authMiddleware')
const { validate } = require('../middleware/validate')
const { idParam, leadCreate, leadUpdate } = require('../validation/schemas')

const router = express.Router()

router.use(requireAuth)
router.get('/', leadController.listLeads)
router.post('/', validate({ body: leadCreate }), leadController.createLead)
router.post('/bulk/remarks', leadController.bulkAddRemark)
router.post('/bulk/reassign', leadController.bulkReassign)
router.post('/:id/convert-to-deal', validate({ params: idParam }), leadController.convertLeadToDeal)
router.get('/:id', validate({ params: idParam }), leadController.getLeadById)
router.put('/:id', validate({ params: idParam, body: leadUpdate }), leadController.updateLead)
router.delete('/:id', validate({ params: idParam }), leadController.deleteLead)

module.exports = router
