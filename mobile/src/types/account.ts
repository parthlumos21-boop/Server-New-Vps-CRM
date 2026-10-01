export interface AccountForm {
  // Step 1: Basic Details
  accountName: string;
  accountCategory: string;
  accountOwner: string;
  state: string;
  description: string;
  address: string;
  accountDate: string;
  accountSource: string;
  customerName: string;
  consultantName: string;
  customerType: string;
  customerRefNo: string;
  customerRefDate: string;
  industryType: string;

  // Step 2: Project Details
  projectName: string;
  architectName: string;
  pmcName: string;

  // Step 3: Contacts
  contactPerson: string;
  contactDesignation: string;
  contactEmail: string;
  contactPhone: string;
  contactMobile: string;

  // Step 4: Reminder & Remark
  reminderDate: string;
  reminderMode: string;
  remark: string;
}
