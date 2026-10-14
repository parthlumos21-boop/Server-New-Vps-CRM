const mongoose = require('mongoose')
const { getMongoModel } = require('../models/mongoModels')
const { AppError } = require('../utils/appError')
const { isPrivilegedRole } = require('../security/accessScope')
const { DEFAULT_COMPANY_SIGNATURE } = require('../constants/defaultSignature')

const EmailTemplate = getMongoModel('email_templates')
const EmailSetting = getMongoModel('email_settings')

const CATEGORIES = new Set(['account', 'deal', 'general'])
const STATUSES = new Set(['active', 'inactive'])
const TEMPLATE_CREATION_EXCLUDED_EMAILS = new Set(['mkt@swatiswitchgears.com'])

const SUPPORTED_VARIABLES = {
  account: ['name', 'accountNo', 'ownerName', 'verticalName', 'state', 'city', 'projectName', 'industryType', 'accountDate'],
  customer: ['name', 'type', 'ownerName'],
  deal: ['name', 'title', 'dealNumber', 'stage', 'amount'],
  quotation: ['number', 'quoteNumber', 'status', 'amount'],
  contact: ['name', 'email', 'phone', 'mobile', 'designation'],
  sender: ['name', 'email', 'designation'],
  company: ['name', 'email', 'phone', 'website'],
}

const normalizeCategory = (value) => {
  const category = String(value || 'general').trim().toLowerCase()
  return CATEGORIES.has(category) ? category : 'general'
}

const normalizeStatus = (value) => {
  const status = String(value || 'active').trim().toLowerCase()
  return STATUSES.has(status) ? status : 'active'
}

const buildSignatureImage = (payload = {}) => {
  const fileName = String(payload.fileName || payload.name || '').trim()
  const contentType = String(payload.contentType || '').trim().toLowerCase()
  const contentBytes = String(payload.contentBytes || '').replace(/^data:[^;]+;base64,/, '').trim()
  if (!fileName && !contentType && !contentBytes) return null
  if (!fileName) throw new AppError('Signature image file name is required.', 400)
  if (!contentType.startsWith('image/')) throw new AppError('Only image files can be used as the email signature image.', 400)
  if (!contentBytes) throw new AppError('Signature image content is required.', 400)
  const extension = fileName.includes('.') ? fileName.split('.').pop().toLowerCase() : ''
  return {
    fileName,
    extension,
    contentType,
    size: Number(payload.size || 0),
    contentBytes,
    uploadedAt: new Date(),
  }
}

const companyFilter = (actor) => ({ companyId: actor.companyId || 1, deletedAt: null })

const actorSnapshot = (actor) => ({
  userId: actor.id,
  email: actor.email || '',
  name: actor.name || actor.username || actor.email || '',
  role: actor.actualRole || actor.role || '',
})

const assertTemplateAdmin = (actor, action = 'manage email templates') => {
  if (!isPrivilegedRole(actor?.role)) {
    throw new AppError(`Only admins can ${action}.`, 403)
  }
}

const assertCanCreateTemplate = (actor) => {
  assertTemplateAdmin(actor, 'create email templates')
  const email = String(actor?.email || '').trim().toLowerCase()
  if (TEMPLATE_CREATION_EXCLUDED_EMAILS.has(email)) {
    throw new AppError('This admin account is excluded from creating email templates.', 403)
  }
}

const toObjectIdOrValue = (value) => {
  const text = String(value || '').trim()
  if (mongoose.Types.ObjectId.isValid(text)) return new mongoose.Types.ObjectId(text)
  return text
}

const idOrConditions = (value) => {
  const text = String(value || '').trim()
  const conditions = [{ id: text }]
  const legacyId = Number(text)
  if (Number.isFinite(legacyId)) conditions.push({ legacyId })
  if (mongoose.Types.ObjectId.isValid(text)) conditions.push({ _id: new mongoose.Types.ObjectId(text) })
  return conditions
}

const templateIdentityFilter = (id) => {
  const text = String(id || '').trim()
  if (mongoose.Types.ObjectId.isValid(text)) return { _id: new mongoose.Types.ObjectId(text) }
  return { _id: null }
}

const dig = (source, path) => {
  const parts = String(path || '').split('.').filter(Boolean)
  let current = source
  for (const part of parts) {
    if (!current || typeof current !== 'object') return ''
    current = current[part]
  }
  if (current === null || current === undefined) return ''
  if (current instanceof Date) return current.toISOString().slice(0, 10)
  return String(current)
}

const replaceVariables = (content, context) => (
  String(content || '').replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (_match, key) => dig(context, key))
)

const mapTemplate = (doc) => {
  if (!doc) return null
  const source = doc.toObject ? doc.toObject() : doc
  return {
    id: String(source._id),
    name: source.name || '',
    description: source.description || '',
    category: source.category || 'general',
    subject: source.subject || '',
    bodyHtml: source.bodyHtml || '',
    signatureImage: source.signatureImage || null,
    status: source.status || 'active',
    isDefault: Boolean(source.isDefault),
    createdBy: source.createdBy || null,
    updatedBy: source.updatedBy || null,
    createdAt: source.createdAt || null,
    updatedAt: source.updatedAt || null,
  }
}

const loadEntityContext = async (actor, entityType, entityId) => {
  const type = normalizeCategory(entityType)
  const id = String(entityId || '').trim()
  const context = {
    account: {},
    customer: {},
    deal: {},
    quotation: {},
    contact: {},
    sender: {
      name: actor.name || actor.username || '',
      email: actor.email || '',
      designation: actor.designation || '',
    },
    company: {
      name: actor.companyName || '',
      email: '',
      phone: '',
      website: '',
    },
  }

  if (!id) return context

  const query = {
    companyId: actor.companyId || 1,
    $or: idOrConditions(id),
  }

  try {
    if (type === 'account') {
      const Lead = getMongoModel('leads')
      const account = await Lead.findOne(query).lean()
      context.account = {
        name: account?.companyName || account?.name || account?.customerName || '',
        accountNo: account?.accountNo || account?.accountNumber || account?.legacyId || '',
        ownerName: account?.ownerName || account?.createdByName || '',
        verticalName: account?.verticalName || account?.vertical || '',
        state: account?.state || '',
        city: account?.city || '',
        projectName: account?.projectName || account?.project || '',
        industryType: account?.industryType || account?.industry || '',
        accountDate: account?.accountDate || account?.createdAt || '',
      }
      context.contact = {
        name: account?.contactName || account?.personName || '',
        email: account?.email || account?.contactEmail || '',
        phone: account?.phone || '',
        mobile: account?.mobile || account?.phoneNumber || '',
        designation: account?.designation || '',
      }
    } else if (type === 'customer') {
      const Customer = getMongoModel('customers')
      const customer = await Customer.findOne(query).lean()
      context.customer = {
        name: customer?.customerName || customer?.name || '',
        type: customer?.customerType || customer?.type || '',
        ownerName: customer?.ownerName || customer?.createdByName || '',
      }
      context.contact = {
        name: customer?.contactName || customer?.personName || context.customer.name,
        email: customer?.email || customer?.contactEmail || '',
        phone: customer?.phone || '',
        mobile: customer?.mobile || customer?.phoneNumber || '',
        designation: customer?.designation || '',
      }
    } else if (type === 'deal') {
      const Deal = getMongoModel('deals')
      const deal = await Deal.findOne(query).lean()
      context.deal = {
        name: deal?.name || deal?.dealName || deal?.title || '',
        title: deal?.title || deal?.name || deal?.dealName || '',
        dealNumber: deal?.dealNumber || deal?.data?.dealNumber || deal?.legacyId || '',
        stage: deal?.stage || deal?.status || '',
        amount: deal?.amount || deal?.value || '',
      }
    }
  } catch (_error) {
    return context
  }

  return context
}

class EmailTemplateService {
  async list(actor, query = {}) {
    const filter = companyFilter(actor)
    if (query.category) filter.category = normalizeCategory(query.category)
    if (query.status) filter.status = normalizeStatus(query.status)
    const page = Math.max(1, Number.parseInt(String(query.page || ''), 10) || 0)
    const limit = Math.min(100, Math.max(1, Number.parseInt(String(query.limit || ''), 10) || 0))
    const sort = query.sort === 'latest' || page ? { createdAt: -1, _id: -1 } : { isDefault: -1, updatedAt: -1 }

    if (page && limit) {
      const skip = (page - 1) * limit
      const [docs, total] = await Promise.all([
        EmailTemplate.find(filter).sort(sort).skip(skip).limit(limit).lean(),
        EmailTemplate.countDocuments(filter),
      ])
      return {
        records: docs.map(mapTemplate),
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      }
    }

    const docs = await EmailTemplate.find(filter).sort(sort).lean()
    return docs.map(mapTemplate)
  }

  async listAvailable(actor, query = {}) {
    const category = normalizeCategory(query.category || query.targetType || 'general')
    const filter = {
      ...companyFilter(actor),
      status: 'active',
      category: category === 'general' ? 'general' : { $in: [category, 'general'] },
    }
    const docs = await EmailTemplate.find(filter)
      .sort({ isDefault: -1, updatedAt: -1, createdAt: -1 })
      .lean()
    return docs.map(mapTemplate)
  }

  async get(actor, id) {
    const doc = await EmailTemplate.findOne({ ...companyFilter(actor), ...templateIdentityFilter(id) }).lean()
    if (!doc) throw new AppError('Email template not found.', 404)
    return mapTemplate(doc)
  }

  async create(actor, payload = {}) {
    assertCanCreateTemplate(actor)
    const name = String(payload.name || '').trim()
    const subject = String(payload.subject || '').trim()
    const bodyHtml = String(payload.bodyHtml ?? payload.body ?? '')
    if (!name) throw new AppError('Template name is required.', 400)
    if (!subject) throw new AppError('Template subject is required.', 400)

    const category = normalizeCategory(payload.category)
    const status = normalizeStatus(payload.status)
    const signatureImage = buildSignatureImage(payload.signatureImage)
    const templateSignatureImage = signatureImage
      ? { ...signatureImage, uploadedBy: actorSnapshot(actor) }
      : null
    const isDefault = Boolean(payload.isDefault)
    if (isDefault && status === 'active') {
      await EmailTemplate.updateMany({ ...companyFilter(actor), category }, { $set: { isDefault: false } })
    }

    const now = new Date()
    const doc = await EmailTemplate.create({
      companyId: actor.companyId || 1,
      name,
      description: String(payload.description || '').trim(),
      category,
      subject,
      bodyHtml,
      signatureImage: templateSignatureImage,
      status,
      isDefault,
      createdBy: actorSnapshot(actor),
      updatedBy: actorSnapshot(actor),
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    })
    return mapTemplate(doc)
  }

  async update(actor, id, payload = {}) {
    assertTemplateAdmin(actor)
    const existing = await EmailTemplate.findOne({ ...companyFilter(actor), ...templateIdentityFilter(id) })
    if (!existing) throw new AppError('Email template not found.', 404)
    const category = normalizeCategory(payload.category || existing.category)
    const status = normalizeStatus(payload.status || existing.status)
    const signatureImage = payload.signatureImage === undefined
      ? existing.signatureImage
      : buildSignatureImage(payload.signatureImage)
    const templateSignatureImage = signatureImage && payload.signatureImage !== undefined
      ? { ...signatureImage, uploadedBy: actorSnapshot(actor) }
      : signatureImage
    const isDefault = payload.isDefault === undefined ? Boolean(existing.isDefault) : Boolean(payload.isDefault)
    if (isDefault && status === 'active') {
      await EmailTemplate.updateMany({ ...companyFilter(actor), category, _id: { $ne: existing._id } }, { $set: { isDefault: false } })
    }

    existing.set({
      name: String(payload.name ?? existing.name ?? '').trim(),
      description: String(payload.description ?? existing.description ?? '').trim(),
      category,
      subject: String(payload.subject ?? existing.subject ?? '').trim(),
      bodyHtml: String(payload.bodyHtml ?? existing.bodyHtml ?? ''),
      signatureImage: templateSignatureImage,
      status,
      isDefault,
      updatedBy: actorSnapshot(actor),
      updatedAt: new Date(),
    })
    await existing.save()
    return mapTemplate(existing)
  }

  async updateStatus(actor, id, payload = {}) {
    return this.update(actor, id, {
      status: payload.status,
      isDefault: payload.status === 'inactive' ? false : payload.isDefault,
    })
  }

  async remove(actor, id) {
    assertTemplateAdmin(actor)
    const doc = await EmailTemplate.findOneAndUpdate(
      { ...companyFilter(actor), ...templateIdentityFilter(id) },
      { $set: { deletedAt: new Date(), isDefault: false, updatedBy: actorSnapshot(actor) } },
      { new: true }
    ).lean()
    if (!doc) throw new AppError('Email template not found.', 404)
    return { success: true }
  }

  async variables() {
    return SUPPORTED_VARIABLES
  }

  async resolve(actor, payload = {}) {
    const template = payload.templateId
      ? await this.get(actor, payload.templateId)
      : {
        subject: payload.subject || '',
        bodyHtml: payload.bodyHtml || '',
      }
    const context = await loadEntityContext(actor, payload.entityType || payload.targetType || template.category, payload.entityId || payload.targetId)
    let signatureImage = template.signatureImage || null
    if (!signatureImage) {
      try {
        const settings = await this.getSettings(actor)
        signatureImage = settings?.signature?.images?.[0] || DEFAULT_COMPANY_SIGNATURE
      } catch (_) {
        signatureImage = DEFAULT_COMPANY_SIGNATURE
      }
    }
    return {
      templateId: template.id || '',
      templateName: template.name || '',
      subject: replaceVariables(template.subject, context),
      bodyHtml: replaceVariables(template.bodyHtml, context),
      signatureImage,
    }
  }

  async getSettings(actor) {
    let doc = await EmailSetting.findOne({ companyId: actor.companyId || 1 }).lean()
    if (!doc) {
      doc = {
        companyId: actor.companyId || 1,
        provider: 'outlook',
        signature: {
          enabled: true,
          html: '<div style="margin-top:16px;"><a href="https://swaticrm.com" target="_blank" rel="noopener noreferrer"><img src="cid:email-signature-img" alt="Email Signature" style="max-width:560px;width:100%;height:auto;display:block;border:0;" /></a></div>',
          images: [DEFAULT_COMPANY_SIGNATURE],
          appendAutomatically: true,
        },
      }
    } else if (!doc.signature?.images || doc.signature.images.length === 0) {
      doc = {
        ...doc,
        signature: {
          ...doc.signature,
          enabled: doc.signature?.enabled ?? true,
          images: [DEFAULT_COMPANY_SIGNATURE],
        },
      }
    }
    return doc
  }

  async saveSignatureImage(actor, payload = {}) {
    assertTemplateAdmin(actor, 'update email signature')
    const signatureImage = buildSignatureImage(payload)
    const templateId = String(payload.templateId || '').trim()
    const now = new Date()

    if (templateId) {
      const doc = await EmailTemplate.findOneAndUpdate(
        { ...companyFilter(actor), ...templateIdentityFilter(templateId) },
        {
          $set: {
            signatureImage: {
              ...signatureImage,
              uploadedAt: now,
              uploadedBy: actorSnapshot(actor),
            },
            updatedBy: actorSnapshot(actor),
            updatedAt: now,
          },
        },
        { new: true }
      ).lean()
      if (!doc) throw new AppError('Email template not found.', 404)
      return mapTemplate(doc)
    }

    const image = {
      ...signatureImage,
      contentId: `company-signature-${actor.companyId || 1}`,
      isInline: true,
      isDefault: true,
      uploadedAt: now,
      uploadedBy: actorSnapshot(actor),
    }
    const html = `<div><img src="cid:${image.contentId}" alt="Company Signature" /></div>`

    const doc = await EmailSetting.findOneAndUpdate(
      { companyId: actor.companyId || 1 },
      {
        $set: {
          companyId: actor.companyId || 1,
          provider: 'outlook',
          signature: {
            enabled: true,
            html,
            images: [image],
            appendAutomatically: true,
          },
          updatedBy: actorSnapshot(actor),
          updatedAt: now,
        },
        $setOnInsert: {
          createdBy: actorSnapshot(actor),
          createdAt: now,
        },
      },
      { upsert: true, new: true }
    ).lean()

    return doc
  }
}

module.exports = new EmailTemplateService()
