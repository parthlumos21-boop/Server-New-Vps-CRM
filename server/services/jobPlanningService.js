const jobPlanningRepository = require('../repositories/jobPlanningRepository')
const { createCrudService } = require('./crudServiceFactory')

const buildPayload = (body, actor, existing) => {
  const payload = {
    jobNo: body.jobNo ?? existing?.jobNo ?? '',
    nameOfPanel: body.nameOfPanel ?? existing?.nameOfPanel ?? '',
    qty: body.qty != null ? Number(body.qty) : existing?.qty ?? 0,
    typeOfIndustries: body.typeOfIndustries ?? existing?.typeOfIndustries ?? '',
    projectName: body.projectName ?? existing?.projectName ?? '',
    incomerRating: body.incomerRating ?? existing?.incomerRating ?? '',
    typeOfPanel: body.typeOfPanel ?? existing?.typeOfPanel ?? '',
    responsibleEnggName: body.responsibleEnggName ?? existing?.responsibleEnggName ?? '',
    purchaseOrder: body.purchaseOrder ?? existing?.purchaseOrder ?? '',
    poDate: body.poDate ?? existing?.poDate ?? null,
    deliveryPeriod: body.deliveryPeriod ?? existing?.deliveryPeriod ?? '',
    deliveryDate: body.deliveryDate ?? existing?.deliveryDate ?? null,
    dataGivenToDesign: body.dataGivenToDesign ?? existing?.dataGivenToDesign ?? null,
    deliveryAddress: body.deliveryAddress ?? existing?.deliveryAddress ?? '',
    contactPerson: body.contactPerson ?? existing?.contactPerson ?? '',
    companyId: existing?.companyId ?? actor.companyId,
    departmentId: existing?.departmentId ?? body.departmentId ?? null,
    
    // Department specific nested objects
    marketing: body.marketing ?? existing?.marketing ?? {},
    electricalDesign: body.electricalDesign ?? existing?.electricalDesign ?? {},
    mechanicalDesign: body.mechanicalDesign ?? existing?.mechanicalDesign ?? {},
    procurement: body.procurement ?? existing?.procurement ?? {},
    production: body.production ?? existing?.production ?? {},
    qc: body.qc ?? existing?.qc ?? {},
    dispatch: body.dispatch ?? existing?.dispatch ?? {}
  }
  return payload
}

module.exports = createCrudService({
  repository: jobPlanningRepository,
  entityLabel: 'Job Planning',
  entityType: 'jobPlanning',
  buildPayload,
})
