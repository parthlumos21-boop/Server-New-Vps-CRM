const mongoose = require('mongoose');
const reportFieldDefinitions = require('../config/reportFieldDefinitions');
const emailService = require('./emailService');

const MODEL_MAP = {
  account: 'Lead',
  lead: 'Lead',
  deal: 'Deal',
  customer: 'Customer',
  quotation: 'Quotation',
};

const COLLECTION_NAME_MAP = {
  account: 'leads',
  lead: 'leads',
  deal: 'deals',
  customer: 'customers',
  quotation: 'quotations',
};

const getMongoModel = (entityType) => {
  const modelName = MODEL_MAP[entityType] || 'Lead';
  if (mongoose.models[modelName]) return mongoose.models[modelName];
  return mongoose.model(modelName);
};

const formatDateDisplay = (dateInput) => {
  if (!dateInput) return '-';
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return String(dateInput);
  const day = String(d.getDate()).padStart(2, '0');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = monthNames[d.getMonth()];
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

const formatCurrencyDisplay = (num) => {
  if (num === null || num === undefined || num === '' || Number.isNaN(Number(num))) return '-';
  const val = Number(num);
  return `₹${val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const getDateRangeBounds = (period, dateRange = {}) => {
  const now = new Date();
  let fromDate = null;
  let toDate = null;

  if (period === 'daily') {
    const target = dateRange.date ? new Date(dateRange.date) : now;
    fromDate = new Date(target.getFullYear(), target.getMonth(), target.getDate(), 0, 0, 0, 0);
    toDate = new Date(target.getFullYear(), target.getMonth(), target.getDate(), 23, 59, 59, 999);
  } else if (period === 'monthly') {
    const year = dateRange.year ? Number(dateRange.year) : now.getFullYear();
    const month = dateRange.month !== undefined && dateRange.month !== '' ? Number(dateRange.month) : now.getMonth();
    fromDate = new Date(year, month, 1, 0, 0, 0, 0);
    toDate = new Date(year, month + 1, 0, 23, 59, 59, 999);
  } else if (period === 'yearly') {
    const year = dateRange.year ? Number(dateRange.year) : now.getFullYear();
    fromDate = new Date(year, 0, 1, 0, 0, 0, 0);
    toDate = new Date(year, 11, 31, 23, 59, 59, 999);
  } else if (period === 'custom' && dateRange.fromDate && dateRange.toDate) {
    fromDate = new Date(dateRange.fromDate);
    toDate = new Date(dateRange.toDate);
    toDate.setHours(23, 59, 59, 999);
  }

  return { fromDate, toDate };
};

const executeReportPayload = async ({
  dataSource = 'account',
  selectedFields = [],
  reportType = 'detail',
  period = 'monthly',
  dateRange = {},
  ownerFilter = 'all',
  companyId,
}) => {
  const entityDefs = reportFieldDefinitions[dataSource] || reportFieldDefinitions.account;
  const Model = getMongoModel(dataSource);
  const matchQuery = {};

  if (companyId) {
    matchQuery.companyId = companyId;
  }

  // Date Filtering
  const { fromDate, toDate } = getDateRangeBounds(period, dateRange);
  if (fromDate && toDate) {
    matchQuery.createdAt = { $gte: fromDate, $lte: toDate };
  }

  // Owner Filtering strictly by ownerCode
  if (ownerFilter && ownerFilter !== 'all') {
    const ownerCodeStr = String(ownerFilter).trim();
    matchQuery.$or = [
      { ownerCode: ownerCodeStr },
      { accountOwnerCode: ownerCodeStr },
      { dealOwnerCode: ownerCodeStr },
      { customerOwnerCode: ownerCodeStr },
      { quotationOwnerCode: ownerCodeStr },
      { accountOwner: new RegExp(ownerCodeStr, 'i') },
      { dealOwner: new RegExp(ownerCodeStr, 'i') },
      { customerOwner: new RegExp(ownerCodeStr, 'i') },
      { quotationOwner: new RegExp(ownerCodeStr, 'i') },
    ];
  }

  // Build MongoDB projection object
  const projection = { createdAt: 1 };
  const requestedKeys = selectedFields.length > 0 ? selectedFields : Object.keys(entityDefs);

  requestedKeys.forEach((key) => {
    const def = entityDefs[key];
    if (def && def.dbField) {
      projection[def.dbField] = 1;
    }
  });

  // Always include owner identification fields for isolation verification
  projection.ownerCode = 1;
  projection.accountOwnerCode = 1;
  projection.dealOwnerCode = 1;
  projection.customerOwnerCode = 1;
  projection.quotationOwnerCode = 1;
  projection.accountOwner = 1;
  projection.dealOwner = 1;
  projection.customerOwner = 1;
  projection.quotationOwner = 1;

  const rawDocs = await Model.find(matchQuery, projection).sort({ createdAt: -1 }).lean();

  // Format dataset records according to selected fields
  const formattedRows = rawDocs.map((doc) => {
    const row = {};
    requestedKeys.forEach((key) => {
      const def = entityDefs[key];
      if (!def) return;
      const rawVal = doc[def.dbField];

      if (def.type === 'currency') {
        row[def.label] = formatCurrencyDisplay(rawVal);
      } else if (def.type === 'date') {
        row[def.label] = formatDateDisplay(rawVal);
      } else {
        row[def.label] = rawVal !== undefined && rawVal !== null && rawVal !== '' ? String(rawVal) : '-';
      }
    });

    // Attach metadata for isolation processing
    row._ownerCode = String(
      doc.ownerCode || doc.accountOwnerCode || doc.dealOwnerCode || doc.customerOwnerCode || doc.quotationOwnerCode || ''
    ).trim();
    row._ownerName = String(
      doc.accountOwner || doc.dealOwner || doc.customerOwner || doc.quotationOwner || doc._ownerCode || 'Unassigned'
    ).trim();

    return row;
  });

  return {
    dataSource,
    selectedFields: requestedKeys,
    fieldLabels: requestedKeys.map((key) => entityDefs[key]?.label || key),
    rows: formattedRows,
    totalRecords: formattedRows.length,
    period,
    dateBounds: { fromDate, toDate },
  };
};

// Generate CSV string representation of report dataset
const generateCsvBuffer = (fieldLabels, rows) => {
  const escapeCsv = (val) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerRow = fieldLabels.map(escapeCsv).join(',');
  const dataRows = rows.map((row) => fieldLabels.map((label) => escapeCsv(row[label])).join(','));
  return Buffer.from([headerRow, ...dataRows].join('\r\n'), 'utf-8');
};

const sendOwnerWiseReportEmails = async ({
  dataSource = 'account',
  selectedFields = [],
  reportType = 'detail',
  period = 'monthly',
  dateRange = {},
  ownerFilter = 'all',
  sendCopyToAdmin = true,
  customSubject = '',
  customMessage = '',
  companyId,
  actor = {},
}) => {
  const result = await executeReportPayload({
    dataSource,
    selectedFields,
    reportType,
    period,
    dateRange,
    ownerFilter,
    companyId,
  });

  const { rows, fieldLabels } = result;
  if (!rows || rows.length === 0) {
    return {
      success: true,
      message: 'No matching records found for email dispatch.',
      dispatchMatrix: [],
    };
  }

  // Group records by ownerCode
  const ownerGroups = {};
  rows.forEach((row) => {
    const ownerCodeKey = row._ownerCode || row._ownerName || 'default';
    if (!ownerGroups[ownerCodeKey]) {
      ownerGroups[ownerCodeKey] = {
        ownerCode: row._ownerCode,
        ownerName: row._ownerName,
        rows: [],
      };
    }
    ownerGroups[ownerCodeKey].rows.push(row);
  });

  const dispatchMatrix = [];
  const dbUsers = await mongoose.connection.db.collection('users').find({}).toArray();

  const findUserByOwnerCode = (code, name) => {
    const codeStr = String(code || '').trim();
    const nameStr = String(name || '').trim().toLowerCase();

    return dbUsers.find((u) => {
      const uCode = String(u.ownerCode || u.owner_code || u.employeeId || '').trim();
      const uName = String(u.name || u.username || '').trim().toLowerCase();
      if (codeStr && uCode === codeStr) return true;
      if (nameStr && uName === nameStr) return true;
      return false;
    });
  };

  // Dispatch Owner-Isolated Emails
  for (const groupKey of Object.keys(ownerGroups)) {
    const group = ownerGroups[groupKey];
    const userMatch = findUserByOwnerCode(group.ownerCode, group.ownerName);
    const targetEmail = userMatch?.email || '';

    if (!targetEmail) {
      dispatchMatrix.push({
        ownerName: group.ownerName,
        ownerCode: group.ownerCode || '-',
        recordCount: group.rows.length,
        entitySource: dataSource.toUpperCase(),
        targetEmail: 'Not Found in DB users',
        status: 'Failed (Email Missing)',
      });
      continue;
    }

    const csvContent = generateCsvBuffer(fieldLabels, group.rows);
    const filename = `${dataSource}_report_${group.ownerName.replace(/\s+/g, '_')}_${Date.now()}.csv`;
    const subject = customSubject || `CRM Custom Report (${dataSource.toUpperCase()}) - ${group.ownerName}`;
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; font-size: 14px; color: #333;">
        <p>Dear <strong>${group.ownerName}</strong>,</p>
        <p>${customMessage || `Please find attached your personalized CRM ${dataSource.toUpperCase()} report.`}</p>
        <ul>
          <li><strong>Data Source:</strong> ${dataSource.toUpperCase()}</li>
          <li><strong>Total Records:</strong> ${group.rows.length}</li>
          <li><strong>Period:</strong> ${period.toUpperCase()}</li>
          <li><strong>Generated On:</strong> ${formatDateDisplay(new Date())}</li>
        </ul>
        <p>Best regards,<br/>SWATI SWITCHGEARS INDIA PVT LTD</p>
      </div>
    `;

    try {
      await emailService.sendEmail({
        to: targetEmail,
        subject,
        html: htmlBody,
      });

      dispatchMatrix.push({
        ownerName: group.ownerName,
        ownerCode: group.ownerCode || '-',
        recordCount: group.rows.length,
        entitySource: dataSource.toUpperCase(),
        targetEmail,
        status: 'Sent ✅',
      });
    } catch (err) {
      dispatchMatrix.push({
        ownerName: group.ownerName,
        ownerCode: group.ownerCode || '-',
        recordCount: group.rows.length,
        entitySource: dataSource.toUpperCase(),
        targetEmail,
        status: `Failed ⚠️ (${err.message})`,
      });
    }
  }

  // Send Consolidated Copy to Admin if Enabled
  if (sendCopyToAdmin && actor.email) {
    try {
      const adminCsv = generateCsvBuffer(fieldLabels, rows);
      const adminSubject = `[ADMIN COPY] Consolidated CRM Custom Report (${dataSource.toUpperCase()})`;
      const adminBody = `
        <div style="font-family: Arial, sans-serif; font-size: 14px; color: #333;">
          <p>Dear Admin (${actor.name || 'Admin'}),</p>
          <p>Attached is the consolidated custom report for all owners.</p>
          <ul>
            <li><strong>Total Records:</strong> ${rows.length}</li>
            <li><strong>Owners Included:</strong> ${Object.keys(ownerGroups).length}</li>
          </ul>
        </div>
      `;
      await emailService.sendEmail({
        to: actor.email,
        subject: adminSubject,
        html: adminBody,
      });

      dispatchMatrix.push({
        ownerName: `ADMIN (${actor.name || 'Admin'})`,
        ownerCode: 'ADMIN',
        recordCount: rows.length,
        entitySource: dataSource.toUpperCase(),
        targetEmail: actor.email,
        status: 'Sent (Consolidated Copy) ✅',
      });
    } catch (_adminErr) {
      // Ignored non-blocking admin email error
    }
  }

  return {
    success: true,
    message: `Dispatched reports to ${dispatchMatrix.filter((m) => m.status.includes('Sent')).length} recipient(s).`,
    dispatchMatrix,
  };
};

module.exports = {
  executeReportPayload,
  sendOwnerWiseReportEmails,
  getDateRangeBounds,
};
