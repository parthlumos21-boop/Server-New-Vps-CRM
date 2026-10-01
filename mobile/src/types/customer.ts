export interface CustomerForm {
  // Step 1: Basic Details
  customerName: string;
  customerCategory: string;
  customerOwner: string;
  addedDate: string;
  address: string;

  // Step 2: Contacts
  contactPerson: string;
  contactDesignation: string;
  contactMobile: string;
  contactEmail: string;

  // Step 3: Reminder & Remark
  reminderDate: string;
  reminderMode: string;
  remark: string;
  description: string;
}
