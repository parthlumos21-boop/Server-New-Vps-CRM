import apiClient from './apiClient'
import { dealApi } from './dealApi'
import { leadApi } from './leadApi'
import { quotationApi } from './quotationApi'
import { supportRequestApi } from './supportRequestApi'
import { taskApi } from './taskApi'

const getPayload = (response) => response?.data ?? response ?? []

const normalizeCustomerRecord = (customer = {}) => {
  const data = customer.data && typeof customer.data === 'object' ? customer.data : {}
  const mergedCustomer = { ...data, ...customer }

  return {
    ...mergedCustomer,
    id: customer.id || mergedCustomer.id,
    customerNumber: mergedCustomer.customerNumber || mergedCustomer.customerNo || '',
    customerName: mergedCustomer.customerName || mergedCustomer.name || mergedCustomer.companyName || '',
    companyName: mergedCustomer.companyName || mergedCustomer.customerName || mergedCustomer.name || '',
    status: mergedCustomer.customerStatus || mergedCustomer.status || 'new',
    ownerName: mergedCustomer.customerOwner || mergedCustomer.ownerName || '',
    phone: mergedCustomer.phone || mergedCustomer.mobile || mergedCustomer.contactPhone || '',
    email: mergedCustomer.email || mergedCustomer.contactEmail || '',
    createdAt: mergedCustomer.createdAt || mergedCustomer.addedDate || '',
    updatedAt: mergedCustomer.updatedAt || '',
  }
}

const safeLoad = async (loader) => {
  try {
    return { ok: true, data: await loader() }
  } catch (error) {
    return {
      ok: false,
      data: [],
      error: error?.response?.data?.message || error?.message || 'Unable to load data',
    }
  }
}

export const crmWorkspaceApi = {
  async getCustomers() {
    const response = await apiClient.get('/customers')
    return (getPayload(response) || []).map(normalizeCustomerRecord)
  },

  async getWorkspaceData() {
    const [accounts, customers, deals, supportRequests, tasks, quotations] = await Promise.all([
      safeLoad(() => leadApi.getLeads()),
      safeLoad(() => this.getCustomers()),
      safeLoad(() => dealApi.getDeals()),
      safeLoad(() => supportRequestApi.getSupportRequests()),
      safeLoad(() => taskApi.getTasks()),
      safeLoad(() => quotationApi.getQuotations()),
    ])

    return {
      accounts,
      customers,
      deals,
      supportRequests,
      tasks,
      quotations,
    }
  },
}
