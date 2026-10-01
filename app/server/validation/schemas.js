const tryRequire = (name) => { try { return require(name) } catch (_) { return null } }
const zod = tryRequire('zod')

if (!zod) {
  module.exports = {}
} else {
  const { z } = zod

  const normalizeTrimmedValue = (value) => {
    if (value === null || value === undefined) return null
    if (typeof value !== 'string') return value
    const trimmedValue = value.trim()
    return trimmedValue === '' ? null : trimmedValue
  }

  const trimmedString = (message = 'This field is required.') => z.preprocess((value) => {
    const normalizedValue = normalizeTrimmedValue(value)
    return normalizedValue ?? ''
  }, z.string().trim().min(1, message))

  const optionalString = z.preprocess(
    (value) => normalizeTrimmedValue(value),
    z.union([z.string().trim(), z.null()])
  )

  const integerInput = z.preprocess((value) => {
    const normalizedValue = normalizeTrimmedValue(value)
    if (normalizedValue === null) return null
    if (typeof normalizedValue === 'number') return normalizedValue

    if (/^-?\d+$/.test(String(normalizedValue))) {
      return Number.parseInt(String(normalizedValue), 10)
    }

    return normalizedValue
  }, z.union([z.number().int(), z.null()]))

  const auth = {
    login: z.object({
      username: z.string().trim().min(1, 'Email or username is required'),
      password: z.string().min(6, 'Password must be at least 6 characters'),
      role: z.enum(['admin', 'user']).optional(),
      rememberMe: z.boolean().optional(),
      deviceName: optionalString.optional(),
      browser: optionalString.optional(),
      clientType: z.enum(['web', 'mobile']).optional(),
      includeToken: z.boolean().optional(),
    }),
    register: z.object({
      name: z.string().trim().min(1),
      email: z.string().trim().email(),
      password: z.string().min(6),
    }),
  }

  const idParam = z.object({ id: z.string().regex(/^\d+$/).transform(Number) })

  const numericInput = z.preprocess((val) => {
    if (val === null || val === undefined) return null
    if (typeof val === 'string') {
      const v = val.trim()
      if (v === '') return null
      const n = Number(v)
      return Number.isFinite(n) ? n : val
    }
    if (typeof val === 'number') {
      return Number.isFinite(val) ? val : null
    }
    return val
  }, z.union([z.number(), z.null()]))

  const optionalDateString = z.preprocess((value) => {
    const normalizedValue = normalizeTrimmedValue(value)
    return normalizedValue === null ? null : String(normalizedValue)
  }, z.union([z.string(), z.null()]))

  const dealBase = z.object({
    title: optionalString.optional(),
    name: optionalString.optional(),
    customerName: optionalString.optional(),
    accountId: integerInput.optional(),
    amount: numericInput.optional(),
    value: numericInput.optional(),
    currency: optionalString.optional(),
    stage: optionalString.optional(),
    status: optionalString.optional(),
    probability: integerInput.optional(),
    expectedCloseDate: optionalDateString.optional(),
    expectedClosureDate: optionalDateString.optional(),
    closeDate: optionalDateString.optional(),
    assignedTo: integerInput.optional(),
    ownerUserId: integerInput.optional(),
    ownerId: integerInput.optional(),
    notes: optionalString.optional(),
  }).passthrough()

  const dealCreate = dealBase.superRefine((value, ctx) => {
    if (!value.title && !value.name) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['title'],
        message: 'Deal name is required.',
      })
    }

    if (value.amount == null && value.value == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['amount'],
        message: 'Deal value is required.',
      })
    }
  })

  const dealUpdate = dealBase

  const convertedDealBase = z.object({
    title: optionalString.optional(),
    name: optionalString.optional(),
    dealNumber: optionalString.optional(),
    accountId: integerInput.optional(),
    sourceDealId: integerInput.optional(),
    dealId: integerInput.optional(),
    accountName: optionalString.optional(),
    customerName: optionalString.optional(),
    amount: numericInput.optional(),
    value: numericInput.optional(),
    currency: optionalString.optional(),
    stage: optionalString.optional(),
    status: optionalString.optional(),
    ownerName: optionalString.optional(),
    assignedTo: integerInput.optional(),
    ownerUserId: integerInput.optional(),
    notes: optionalString.optional(),
    convertedAt: optionalDateString.optional(),
  }).passthrough()

  const task = z.object({
    title: trimmedString('Task title is required.'),
    description: optionalString.optional(),
    status: optionalString.optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    dueDate: optionalDateString.optional(),
    relatedEntityType: optionalString.optional(),
    relatedEntityId: z.union([z.string(), z.number(), z.null()]).optional(),
    assignedTo: integerInput.optional(),
  }).passthrough()

  const reminder = z.object({
    title: trimmedString('Reminder title is required.'),
    message: optionalString.optional(),
    remindAt: trimmedString('remindAt is required'),
    recurrence: optionalString.optional(),
    status: optionalString.optional(),
    assignedTo: integerInput.optional(),
  }).passthrough()

  const quotationLineItem = z.object({
    id: z.union([z.string(), z.number()]).optional(),
    description: optionalString.optional(),
    quantity: numericInput.optional(),
    unit: optionalString.optional(),
    rate: numericInput.optional(),
    price: numericInput.optional(),
    amount: numericInput.optional(),
    tax: numericInput.optional(),
    discount: numericInput.optional(),
  }).passthrough()

  const quotation = z.object({
    title: optionalString.optional(),
    customerName: optionalString.optional(),
    customerId: integerInput.optional(),
    dealId: integerInput.optional(),
    status: optionalString.optional(),
    currency: optionalString.optional(),
    validUntil: optionalDateString.optional(),
    lineItems: z.array(quotationLineItem).optional(),
    notes: optionalString.optional(),
  }).passthrough()

  const customerBase = z.object({
    name: optionalString.optional(),
    email: z.preprocess((value) => normalizeTrimmedValue(value), z.union([z.string().trim().email(), z.null()])).optional(),
    phone: optionalString.optional(),
    company: optionalString.optional(),
    address: optionalString.optional(),
    city: optionalString.optional(),
    state: optionalString.optional(),
    country: optionalString.optional(),
    postalCode: optionalString.optional(),
    status: optionalString.optional(),
    source: optionalString.optional(),
    assignedTo: integerInput.optional(),
  }).passthrough()

  const customerCreate = customerBase.superRefine((value, ctx) => {
    if (!value.name) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['name'],
        message: 'Customer name is required.',
      })
    }
  })

  const customerUpdate = customerBase

  const leadBase = z.object({
    accountName: optionalString.optional(),
    customerName: optionalString.optional(),
    ownerName: optionalString.optional(),
    accountOwner: optionalString.optional(),
    accountOwnerCode: integerInput.optional(),
    assignedTo: integerInput.optional(),
    assignedUserId: integerInput.optional(),
    ownerId: integerInput.optional(),
    companyId: integerInput.optional(),
    projectId: integerInput.optional(),
    workflowId: optionalString.optional(),
    email: z.preprocess((value) => normalizeTrimmedValue(value), z.union([z.string().trim().email(), z.null()])).optional(),
    alternateEmail: z.preprocess((value) => normalizeTrimmedValue(value), z.union([z.string().trim().email(), z.null()])).optional(),
  }).passthrough()

  const leadCreate = leadBase.superRefine((value, ctx) => {
    if (!value.accountName && !value.customerName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['accountName'],
        message: 'Account name is required.',
      })
    }
  })

  const leadUpdate = leadBase

  const projectBase = z.object({
    projectName: optionalString.optional(),
    projectCode: optionalString.optional(),
    projectDescription: optionalString.optional(),
    accountId: integerInput.optional(),
    customerId: integerInput.optional(),
    consultantName: optionalString.optional(),
    architectName: optionalString.optional(),
    pmcName: optionalString.optional(),
    projectType: optionalString.optional(),
    projectStatus: optionalString.optional(),
    projectLocation: optionalString.optional(),
    projectValue: numericInput.optional(),
    startDate: optionalDateString.optional(),
    endDate: optionalDateString.optional(),
  }).passthrough()

  const supportRequest = z.object({
    subject: trimmedString('Subject is required.'),
    description: optionalString.optional(),
    priority: optionalString.optional(),
    status: optionalString.optional(),
    category: optionalString.optional(),
    customerId: integerInput.optional(),
    customerName: optionalString.optional(),
    customerEmail: z.preprocess((value) => normalizeTrimmedValue(value), z.union([z.string().trim().email(), z.null()])).optional(),
    assignedTo: integerInput.optional(),
  }).passthrough()

  const supportBulk = z.object({
    ids: z.array(z.union([z.string(), z.number()])).min(1),
    updates: z.record(z.any()).optional(),
  })

  const bookmark = z.object({
    label: trimmedString('Bookmark label is required.'),
    targetPath: trimmedString('Bookmark targetPath is required.'),
    icon: optionalString.optional(),
    position: integerInput.optional(),
  })

  const calendarEvent = z.object({
    title: trimmedString('Event title is required.'),
    startAt: trimmedString('startAt is required.'),
    endAt: optionalDateString.optional(),
    allDay: z.boolean().optional(),
    description: optionalString.optional(),
    location: optionalString.optional(),
    category: optionalString.optional(),
    color: optionalString.optional(),
    relatedEntityType: optionalString.optional(),
    relatedEntityId: z.union([z.string(), z.number(), z.null()]).optional(),
    assignedTo: integerInput.optional(),
  }).passthrough()

  const customView = z.object({
    entityType: trimmedString('entityType is required.'),
    name: trimmedString('name is required.'),
    columns: z.array(z.any()).optional(),
    filters: z.record(z.any()).optional(),
    sort: z.record(z.any()).optional(),
    isDefault: z.boolean().optional(),
    isShared: z.boolean().optional(),
  })

  const settingValue = z.object({ value: z.any() })

  const searchQuery = z.object({ q: z.string().optional() })

  const userTypePermission = z.object({
    key: z.string().trim().min(1),
    enabled: z.boolean(),
  })

  const userType = z.object({
    name: trimmedString('name is required.'),
    description: optionalString.optional(),
    status: z.enum(['draft', 'active', 'inactive', 'archived']).optional(),
    defaultLandingPage: optionalString.optional(),
    enableEmailAccess: z.boolean().optional(),
    copyFromUserTypeId: integerInput.optional(),
    hierarchyLevel: integerInput.optional(),
    parentUserTypeId: integerInput.optional(),
    isArchived: z.boolean().optional(),
    permissions: z.array(userTypePermission).optional(),
  })

  module.exports = {
    auth,
    idParam,
    dealCreate,
    dealUpdate,
    convertedDealCreate: convertedDealBase,
    convertedDealUpdate: convertedDealBase,
    task,
    reminder,
    quotationLineItem,
    quotation,
    customerCreate,
    customerUpdate,
    leadCreate,
    leadUpdate,
    projectCreate: projectBase.superRefine((value, ctx) => {
      if (!value.projectName) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['projectName'],
          message: 'Project name is required.',
        })
      }
    }),
    projectUpdate: projectBase,
    supportRequest,
    supportBulk,
    bookmark,
    calendarEvent,
    customView,
    settingValue,
    searchQuery,
    userType,
  }
}
