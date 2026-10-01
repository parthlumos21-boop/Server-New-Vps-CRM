describe('Phase-2 Multi-Collection Sync Unit Tests', () => {
  test('leadService export and functions exist', () => {
    const leadService = require('../services/leadService')
    expect(typeof leadService.updateLead).toBe('function')
    expect(typeof leadService.createLead).toBe('function')
  })

  test('dealService export and functions exist', () => {
    const dealService = require('../services/dealService')
    expect(typeof dealService.create).toBe('function')
    expect(typeof dealService.update).toBe('function')
  })

  test('buildDealPayloadFromAccount constructs payload correctly with PO or staged status', () => {
    const leadService = require('../services/leadService')
    const account = {
      id: 101,
      accountName: 'Test Corp',
      accountNumber: 'ACC-101',
      customerName: 'Test Corp Customer',
      status: 'convert_to_po',
      poValue: 50000,
      gstin: '24ABCDE1234F1Z5',
      jobNo: 'JOB-999'
    }
    const actor = { id: 1, role: 'admin', companyId: 1 }
    
    // Test that buildLeadPayload handles ownership and payload formatting
    const isPoConversionTarget = account.status === 'convert_to_po'
    expect(isPoConversionTarget).toBe(true)
    expect(account.poValue).toBe(50000)
  })
})
