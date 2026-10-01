import apiClient from './apiClient'
import {
  getCanonicalCrmUserName,
  getCrmOwnerCode,
  getCrmOwnerDisplay,
  isSameCrmOwner,
} from '../features/users/crmUserDirectory'

let customerCache = []
const subscribers = new Set()

const notifySubscribers = () => {
  subscribers.forEach((subscriber) => subscriber(customerCache))
}

const normalizeDocuments = (documents = []) =>
  Array.isArray(documents)
    ? documents
      .filter(Boolean)
      .map((document, index) => ({
        id: document.id || `document-${index + 1}`,
        name: document.name || '',
        addedAt: document.addedAt || new Date().toISOString(),
      }))
      .filter((document) => document.name)
    : []

const normalizeContacts = (contacts = []) =>
  Array.isArray(contacts)
    ? contacts.map((contact, index) => ({
        id: contact.id || `contact-${index + 1}`,
        contactPerson: contact.contactPerson || '',
        phone: contact.phone || '',
        mobile: contact.mobile || '',
        email: contact.email || '',
        designation: contact.designation || '',
      }))
    : []

const buildCustomerNumber = (customer = {}) => (
  customer.customerNumber
  || customer.customerNo
  || (customer.id ? `SSC${String(customer.id).padStart(5, '0')}` : '')
)

const normalizeCustomer = (customer = {}) => {
  const data = customer.data && typeof customer.data === 'object' ? customer.data : {}
  const mergedCustomer = {
    ...customer,
    ...data,
  }
  const customerOwner = getCanonicalCrmUserName(
    mergedCustomer.customerOwner
    || mergedCustomer.customerOwnerName
    || mergedCustomer.customerOwnerDisplay
    || mergedCustomer.customerOwnerCode
    || mergedCustomer.ownerName
    || mergedCustomer.assignedToName
    || mergedCustomer.addedBy
    || mergedCustomer.addedByName
  ) || String(mergedCustomer.customerOwner || mergedCustomer.ownerName || '').trim()
  const contacts = normalizeContacts(
    mergedCustomer.contacts?.length
      ? mergedCustomer.contacts
      : [{
          contactPerson: mergedCustomer.contactPerson || '',
          phone: mergedCustomer.phone || '',
          mobile: mergedCustomer.mobile || customer.phone || '',
          email: mergedCustomer.email || customer.email || '',
          designation: mergedCustomer.contactDesignation || '',
        }]
  )

  return {
    ...mergedCustomer,
    id: String(customer.id || mergedCustomer.id || ''),
    mongoId: customer.mongoId || mergedCustomer.mongoId || '',
    customerNumber: buildCustomerNumber({ ...mergedCustomer, id: customer.id || mergedCustomer.id }),
    customerName: mergedCustomer.customerName || customer.name || mergedCustomer.name || '',
    addedDate: mergedCustomer.addedDate || String(customer.createdAt || mergedCustomer.createdAt || new Date().toISOString()).slice(0, 10),
    customerOwner,
    customerOwnerName: customerOwner,
    customerOwnerCode: getCrmOwnerCode(customerOwner),
    customerOwnerDisplay: getCrmOwnerDisplay(customerOwner),
    ownerUserId: customer.ownerUserId ?? mergedCustomer.ownerUserId ?? customer.owner_user_id ?? mergedCustomer.owner_user_id ?? '',
    ownerId: customer.ownerId ?? mergedCustomer.ownerId ?? customer.owner_id ?? mergedCustomer.owner_id ?? '',
    assignedTo: customer.assignedTo ?? mergedCustomer.assignedTo ?? customer.assigned_to ?? mergedCustomer.assigned_to ?? '',
    assignedUserId: customer.assignedUserId ?? mergedCustomer.assignedUserId ?? customer.assigned_user_id ?? mergedCustomer.assigned_user_id ?? '',
    userId: customer.userId ?? mergedCustomer.userId ?? customer.user_id ?? mergedCustomer.user_id ?? '',
    addedBy: mergedCustomer.addedBy || customer.addedBy || '',
    addedByName: mergedCustomer.addedByName || customer.addedByName || '',
    customerCategory: mergedCustomer.customerCategory || '',
    customerStatus: mergedCustomer.customerStatus || customer.status || mergedCustomer.status || 'New',
    customerType: mergedCustomer.customerType || '',
    address: mergedCustomer.address || customer.address || '',
    contacts,
    documents: normalizeDocuments(mergedCustomer.documents),
    reminderDate: mergedCustomer.reminderDate || '',
    reminderMode: mergedCustomer.reminderMode || '',
    remark: mergedCustomer.remark || '',
    description: mergedCustomer.description || '',
    createdAt: customer.createdAt || mergedCustomer.createdAt || new Date().toISOString(),
    updatedAt: customer.updatedAt || mergedCustomer.updatedAt || customer.createdAt || new Date().toISOString(),
  }
}

const normalizePayload = (customer = {}) => {
  const contacts = normalizeContacts(customer.contacts)
  const primaryContact = {
    ...(contacts[0] || { id: 'primary-contact' }),
    phone: customer.phone || contacts[0]?.phone || '',
    mobile: customer.phone || contacts[0]?.mobile || '',
    email: customer.email || contacts[0]?.email || '',
  }
  const normalizedContacts = contacts.length > 0
    ? [primaryContact, ...contacts.slice(1)]
    : [primaryContact]
  const customerName = String(customer.customerName || customer.name || '').trim()
  const email = primaryContact.email || customer.email || null
  const phone = primaryContact.mobile || primaryContact.phone || customer.phone || null
  const selectedOwner = customer.customerOwner || customer.customerOwnerName || customer.customerOwnerDisplay || ''
  const assignedToSource = customer.assignedTo || selectedOwner
  const assignedTo = /^\d+$/.test(String(assignedToSource || '').trim())
    ? Number.parseInt(String(assignedToSource).trim(), 10)
    : String(assignedToSource || '').trim() || null

  return {
    ...customer,
    name: customerName,
    customerName,
    email,
    phone,
    company: customer.company || customerName,
    status: customer.customerStatus || customer.status || 'active',
    assignedTo,
    customerOwner: selectedOwner,
    customerOwnerName: selectedOwner,
    customerOwnerCode: getCrmOwnerCode(selectedOwner),
    customerOwnerDisplay: getCrmOwnerDisplay(selectedOwner),
    contacts: normalizedContacts,
    documents: normalizeDocuments(customer.documents),
  }
}

class CustomerService {
  subscribe(listener) {
    subscribers.add(listener)
    return () => subscribers.delete(listener)
  }

  getCustomers() {
    return customerCache
  }

  async loadCustomers() {
    const response = await apiClient.get('/customers')
    customerCache = (response?.data || []).map(normalizeCustomer)
    notifySubscribers()
    return customerCache
  }

  getCustomersByOwner(ownerName = '') {
    return this.getCustomers().filter((customer) => isSameCrmOwner(customer.customerOwner, ownerName))
  }

  getCustomerById(customerId = '') {
    return this.getCustomers().find((customer) => String(customer.id) === String(customerId)) || null
  }

  async saveCustomer(customer) {
    const normalizedPayload = normalizePayload(customer)
    const hasExistingId = Boolean(customer.id)
    const response = hasExistingId
      ? await apiClient.put(`/customers/${encodeURIComponent(customer.id)}`, normalizedPayload)
      : await apiClient.post('/customers', normalizedPayload)
    const savedCustomer = normalizeCustomer(response?.data)

    customerCache = [
      savedCustomer,
      ...customerCache.filter((entry) => String(entry.id) !== String(savedCustomer.id)),
    ]
    notifySubscribers()
    return savedCustomer
  }

  async deleteCustomer(customerId) {
    await apiClient.delete(`/customers/${encodeURIComponent(customerId)}`)
    customerCache = customerCache.filter((entry) => String(entry.id) !== String(customerId))
    notifySubscribers()
  }

  async frontendDeleteCustomer(id) {
    const response = await apiClient.patch(`/customers/${encodeURIComponent(id)}/frontend-delete`)
    const deletedId = String(response?.data?.id || id)
    customerCache = customerCache.filter((entry) => String(entry.id) !== deletedId)
    notifySubscribers()
    return response?.data
  }
}

export const customerService = new CustomerService()
