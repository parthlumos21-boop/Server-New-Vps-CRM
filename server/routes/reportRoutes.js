const express = require('express');
const router = express.Router();
const ReportTemplate = require('../models/ReportTemplate');
const Report = require('../models/Report');
const { executeReportPayload, sendOwnerWiseReportEmails } = require('../services/reportEngine');
const { requireAuth } = require('../middleware/authMiddleware');
const reportFieldDefinitions = require('../config/reportFieldDefinitions');

// Get centralized field definitions dictionary for all 4 entities
router.get('/fields', requireAuth, (req, res) => {
  res.json(reportFieldDefinitions);
});

// Live Preview Endpoint for Report Builder
router.post('/preview', requireAuth, async (req, res) => {
  try {
    const payload = req.body || {};
    const result = await executeReportPayload({
      dataSource: payload.dataSource || payload.reportContext || 'account',
      selectedFields: payload.selectedFields || [],
      reportType: payload.reportType || 'detail',
      period: payload.period || 'monthly',
      dateRange: payload.dateRange || {},
      ownerFilter: payload.ownerFilter || 'all',
      companyId: req.user?.companyId,
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Excel Export Endpoint
router.post('/export-excel', requireAuth, async (req, res) => {
  try {
    const payload = req.body || {};
    const result = await executeReportPayload({
      dataSource: payload.dataSource || payload.reportContext || 'account',
      selectedFields: payload.selectedFields || [],
      reportType: payload.reportType || 'detail',
      period: payload.period || 'monthly',
      dateRange: payload.dateRange || {},
      ownerFilter: payload.ownerFilter || 'all',
      companyId: req.user?.companyId,
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Owner-Wise Email Dispatch Endpoint
router.post('/send-owner-emails', requireAuth, async (req, res) => {
  try {
    const payload = req.body || {};
    const result = await sendOwnerWiseReportEmails({
      dataSource: payload.dataSource || payload.reportContext || 'account',
      selectedFields: payload.selectedFields || [],
      reportType: payload.reportType || 'detail',
      period: payload.period || 'monthly',
      dateRange: payload.dateRange || {},
      ownerFilter: payload.ownerFilter || 'all',
      sendCopyToAdmin: payload.sendCopyToAdmin !== false,
      customSubject: payload.customSubject || '',
      customMessage: payload.customMessage || '',
      companyId: req.user?.companyId,
      actor: {
        id: req.user?.id,
        name: req.user?.name || req.user?.username || 'Admin',
        email: req.user?.email || '',
      },
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Save Report Instance
router.post('/', requireAuth, async (req, res) => {
  try {
    const report = new Report({
      ...req.body,
      createdBy: req.user.id || req.body.createdBy,
    });
    await report.save();
    res.status(201).json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Saved Reports
router.get('/', requireAuth, async (req, res) => {
  try {
    const filter = {};
    if (req.query.entityType) {
      filter.entityType = req.query.entityType;
    }
    const reports = await Report.find(filter).sort({ createdAt: -1 });
    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Manage Report Templates
router.post('/templates', requireAuth, async (req, res) => {
  try {
    const template = new ReportTemplate({
      ...req.body,
      name: req.body.name || req.body.reportName || 'Untitled Custom Report',
      reportName: req.body.reportName || req.body.name || 'Untitled Custom Report',
      accountOwner: req.body.accountOwner || req.body.owner || '',
      owner: req.body.owner || req.body.accountOwner || '',
      generatedFrom: req.body.generatedFrom || '',
      generatedTo: req.body.generatedTo || '',
      createdBy: req.user?.id || req.body.createdBy,
      creatorName: req.user?.name || req.body.creatorName || 'Admin',
      creatorEmail: req.user?.email || req.body.creatorEmail,
    });
    await template.save();
    res.status(201).json(template);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/templates', requireAuth, async (req, res) => {
  try {
    const filter = {};
    if (req.query.entityType) {
      filter.entityType = req.query.entityType;
    }
    const templates = await ReportTemplate.find(filter).sort({ createdAt: -1 });
    res.json(templates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/templates/:id', requireAuth, async (req, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Only administrators have authority to delete report templates' });
    }
    const { id } = req.params;
    const deleted = await ReportTemplate.findOneAndDelete({
      $or: [{ _id: id }, { id: id }, { name: id }, { reportName: id }],
    });
    res.json({ message: 'Report template deleted successfully', deleted });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Only administrators have authority to delete custom reports' });
    }
    const { id } = req.params;
    const deleted = await Report.findOneAndDelete({
      $or: [{ _id: id }, { id: id }, { reportName: id }, { name: id }],
    });
    res.json({ message: 'Report deleted successfully', deleted });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

