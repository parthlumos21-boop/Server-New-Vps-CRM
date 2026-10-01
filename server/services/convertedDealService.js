const convertedDealRepository = require('../repositories/convertedDealRepository')
const { createCrudService } = require('./crudServiceFactory')
const { resolveCrmGroupScope } = require('../security/crmGroupScope')
const { asOptionalInteger, asOptionalNumber, asTrimmedStringOrNull } = require('../utils/requestPayload')
const { convertedDealCreate, convertedDealUpdate } = require('../validation/schemas')

const pickFirstDefined = (...values) => values.find((value) => value !== undefined)

const buildPayload = (body = {}, actor, existing = null) => ({
  title: asTrimmedStringOrNull(pickFirstDefined(body.title, body.name, existing?.title)) || 'Converted Deal',
  dealNumber: asTrimmedStringOrNull(pickFirstDefined(body.dealNumber, existing?.dealNumber)),
  accountId: asOptionalInteger(pickFirstDefined(body.accountId, body.account_id, existing?.accountId)),
  sourceDealId: asOptionalInteger(pickFirstDefined(body.sourceDealId, body.dealId, existing?.sourceDealId)),
  accountName: asTrimmedStringOrNull(pickFirstDefined(body.accountName, existing?.accountName)),
  customerName: asTrimmedStringOrNull(pickFirstDefined(body.customerName, existing?.customerName)),
  amount: asOptionalNumber(pickFirstDefined(body.amount, body.value, existing?.amount)),
  currency: asTrimmedStringOrNull(pickFirstDefined(body.currency, existing?.currency)) || 'INR',
  stage: asTrimmedStringOrNull(pickFirstDefined(body.stage, existing?.stage)) || 'converted',
  status: asTrimmedStringOrNull(pickFirstDefined(body.status, existing?.status)) || 'converted',
  ownerName: asTrimmedStringOrNull(pickFirstDefined(body.ownerName, body.dealOwner, existing?.ownerName)),
  convertedAt: asTrimmedStringOrNull(pickFirstDefined(existing?.convertedAt, body.convertedAt)) || new Date().toISOString(),
  assignedTo: asOptionalInteger(
    pickFirstDefined(
      body.assignedTo,
      body.assignedUserId,
      body.ownerUserId,
      existing?.assignedTo,
      actor.role === 'user' ? actor.id : null
    )
  ),
  createdBy: existing?.createdBy ?? actor.id,
  notes: asTrimmedStringOrNull(pickFirstDefined(body.notes, existing?.notes)) || '',
  data: { ...(existing?.data || {}), ...body },
})

const baseService = createCrudService({
  repository: convertedDealRepository,
  entityLabel: 'Converted Deal',
  entityType: 'convertedDeal',
  buildPayload,
})

module.exports = {
  ...baseService,
  validation: {
    create: convertedDealCreate,
    update: convertedDealUpdate,
  },
  list: async (actor, filters = {}) => {
    const scope = await resolveCrmGroupScope(actor)
    await convertedDealRepository.syncFromDeals({ companyId: scope.actor?.companyId ?? scope.actor?.company_id ?? null })
    return convertedDealRepository.listWithFilters(scope.actor, filters, scope.queryOptions)
  },
  create: async (actor, body = {}) => {
    const payload = buildPayload(body, actor, null)
    const existing = await convertedDealRepository.findExistingConversion(
      { accountId: payload.accountId, sourceDealId: payload.sourceDealId },
      { companyId: actor?.companyId ?? actor?.company_id ?? null }
    )

    // Keep conversions permanent and unique per source record.
    if (existing) {
      return existing
    }

    const createdRecord = await baseService.create(actor, body)
    if (createdRecord?.sourceDealId) {
      await convertedDealRepository.syncFromDeals({
        companyId: actor?.companyId ?? actor?.company_id ?? null,
        sourceDealId: createdRecord.sourceDealId,
      })
    }
    return createdRecord
  },
}
