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
    || mergedCustomer.ownerName
    || mergedCustomer.assignedToName
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
  const assignedTo = /^\d+$/.test(String(customer.assignedTo || '').trim())
    ? Number.parseInt(String(customer.assignedTo).trim(), 10)
    : null

  return {
    ...customer,
    name: customerName,
    customerName,
    email,
    phone,
    company: customer.company || customerName,
    status: customer.customerStatus || customer.status || 'active',
    assignedTo,
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
}

export const customerService = new CustomerService()
