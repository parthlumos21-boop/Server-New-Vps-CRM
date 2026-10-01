const express = require('express');
const router = express.Router();
const ReportTemplate = require('../models/ReportTemplate');
const Report = require('../models/Report');
const { executeReport } = require('../services/reportEngine');
const { requireAuth } = require('../middleware/authMiddleware');
const reportFieldDefinitions = require('../config/reportFieldDefinitions');

router.get('/fields', requireAuth, (req, res) => {
  res.json(reportFieldDefinitions);
});

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

router.post('/templates', requireAuth, async (req, res) => {
  try {
    const template = new ReportTemplate({
      ...req.body,
      name: req.body.name || req.body.reportName || 'Untitled Custom Report',
      reportName: req.body.reportName || req.body.name || 'Untitled Custom Report',
      createdBy: req.user?.id || req.body.createdBy,
      creatorName: req.user?.name || req.body.creatorName || 'Admin',
      creatorEmail: req.user?.email || req.body.creatorEmail
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
    const { id } = req.params;
    await ReportTemplate.findByIdAndDelete(id);
    res.json({ message: 'Report template deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/execute/:templateId', requireAuth, async (req, res) => {
  try {
    const data = await executeReport(req.params.templateId);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

