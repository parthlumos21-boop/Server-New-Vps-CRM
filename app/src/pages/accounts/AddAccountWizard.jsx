import React, { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'
import LegacyFormField from '../../components/accounts/LegacyFormField'
import LegacyFormSection from '../../components/accounts/LegacyFormSection'
import WizardStepper from '../../components/accounts/WizardStepper'
import { normalizeAccountRecord } from '../../features/adminAccounts/adapters/normalizeAccountRecord'
import {
  ACCOUNT_OWNER_OPTIONS,
  ACCOUNT_SOURCE_OPTIONS,
  CUSTOMER_TYPE_OPTIONS,
  INDUSTRY_TYPE_OPTIONS,
} from '../../features/accounts/config/accountDropdownOptions'
import { getAccountCategoryLogo } from '../../features/accounts/config/accountCategoryLogo'
import './AddAccountWizard.css'

const steps = [
  { id: 'basic', label: 'Account Basic Details' },
  { id: 'contacts', label: 'Contacts' },
  { id: 'reminder', label: 'Reminder & Remark' },
]

const owners = ACCOUNT_OWNER_OPTIONS

const accountCategories = [
  { value: 'LUMOS', label: 'LUMOS' },
  { value: 'SWATI', label: 'SWATI' },
  { value: 'SWATI EPC', label: 'SWATI EPC' },
]

const accountSources = ACCOUNT_SOURCE_OPTIONS

const accountStates = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'hold', label: 'Hold' },
  { value: 'pending', label: 'Pending' },
]

const customerTypes = CUSTOMER_TYPE_OPTIONS

const industryTypes = INDUSTRY_TYPE_OPTIONS

const reminderTypes = [
  { value: 'call', label: 'Call' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'visit', label: 'Visit' },
  { value: 'email', label: 'Email' },
]

const initialFormData = {
  accountName: '',
  accountOwner: '',
  projectName: '',
  projectCode: '',
  projectType: '',
  projectLocation: '',
  projectValue: '',
  projectStatus: 'Active',
  projectDescription: '',
  state: '',
  description: '',
  address: '',
  customerName: '',
  accountDate: new Date().toISOString().slice(0, 10),
  accountCategory: '',
  accountSource: '',
  accountState: '',
  customerType: '',
  productCategory: '',
  industryType: '',
  customerRefNo: '',
  customerRefDate: '',
  consultantName: '',
  pmcName: '',
  architectName: '',
  contactPerson: '',
  contactDesignation: '',
  contactEmail: '',
  contactPhone: '',
  contactMobile: '',
  reminderDate: '',
  reminderMode: '',
  remark: '',
}

const requiredMessages = {
  accountName: 'Account Name: Please provide Account Name',
  accountOwner: 'Account Owner: Please select Account Owner',
  accountSource: 'Account Source: Please select Account Source',
  state: 'State: Please provide State',
  industryType: 'Industry type: Please select Industry type',
}

const fieldGroups = {
  basicLeft: [
    { name: 'accountName', label: 'Account Name', required: true },
    { name: 'accountOwner', label: 'Account Owner', type: 'select', options: owners, required: true },
    { name: 'state', label: 'State', required: true },
    { name: 'description', label: 'Remark', type: 'textarea', textareaRows: 3, fieldClassName: 'min-h-[88px]' },
    { name: 'address', label: 'Address', type: 'textarea', textareaRows: 3, fieldClassName: 'min-h-[88px]' },
    { name: 'customerName', label: 'Customer Name' },
    { name: 'consultantName', label: 'Consultant Name' },
  ],
  basicRight: [
    { name: 'accountDate', label: 'Account Date', type: 'date', required: true },
    { name: 'accountCategory', label: 'Vertical Name', type: 'select', options: accountCategories, required: true },
    { name: 'accountSource', label: 'Account Source', type: 'select', options: accountSources, required: true },
    { name: 'accountState', label: 'Inquiry Status', type: 'select', options: accountStates },
    { name: 'customerType', label: 'Customer Type', type: 'select', options: customerTypes },
    { name: 'industryType', label: 'Industry Type', type: 'select', options: industryTypes, required: true },
    { name: 'customerRefNo', label: 'Inquiry Ref No.' },
    { name: 'customerRefDate', label: 'Inquiry Ref Date', type: 'date' },
  ],
  projectDetails: [
    { name: 'projectName', label: 'Project Name' },
    { name: 'architectName', label: 'Architect / Consultant' },
    { name: 'pmcName', label: 'PMC Name' },
  ],
  contactsLeft: [
    { name: 'contactPerson', label: 'Contact Person' },
    { name: 'contactDesignation', label: 'Designation' },
  ],
  contactsRight: [
    { name: 'contactEmail', label: 'Contact Email', type: 'email' },
    { name: 'contactPhone', label: 'Contact Phone', type: 'tel' },
    { name: 'contactMobile', label: 'Contact Mobile', type: 'tel' },
  ],
  reminderLeft: [
    { name: 'reminderDate', label: 'Reminder Date', type: 'date' },
    { name: 'reminderMode', label: 'Reminder Mode', type: 'select', options: reminderTypes },
  ],
  reminderRight: [
    { name: 'remark', label: 'Remark', type: 'textarea', textareaRows: 4, fieldClassName: 'min-h-[110px]' },
  ],
}

const AddAccountWizard = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { createAccount, addNotification } = useData()
  const { user } = useAuth()
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState(initialFormData)
  const [errors, setErrors] = useState({})
  const [validationNotice, setValidationNotice] = useState([])
  const [saving, setSaving] = useState(false)

  const isAdmin = useMemo(() => location.pathname.startsWith('/admin'), [location.pathname])
  const backPath = isAdmin ? '/admin/accounts' : '/accounts/my-group-accounts'
  const categoryLogo = useMemo(
    () => getAccountCategoryLogo(formData.accountCategory),
    [formData.accountCategory]
  )

  const validateStep = (stepIndex) => {
    const nextErrors = {}

    if (stepIndex === 0) {
      Object.entries(requiredMessages).forEach(([field, message]) => {
        if (!formData[field]?.trim()) {
          nextErrors[field] = message
        }
      })
    }

    if (formData.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)) {
      nextErrors.contactEmail = 'Enter a valid contact email.'
    }

    setErrors((prev) => ({ ...prev, ...nextErrors }))
    setValidationNotice(
      Object.entries(requiredMessages)
        .filter(([field]) => nextErrors[field])
        .map(([, message]) => message)
    )
    return Object.keys(nextErrors).length === 0
  }

  const validateAllSteps = () => {
    const collectedErrors = {}

    Object.entries(requiredMessages).forEach(([field, message]) => {
      if (!formData[field]?.trim()) {
        collectedErrors[field] = message
      }
    })

    if (formData.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)) {
      collectedErrors.contactEmail = 'Enter a valid contact email.'
    }

    setErrors(collectedErrors)
    setValidationNotice(
      Object.entries(requiredMessages)
        .filter(([field]) => collectedErrors[field])
        .map(([, message]) => message)
    )
    return collectedErrors
  }

  const handleChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
    setValidationNotice((prev) =>
      prev.filter((message) => message !== requiredMessages[name])
    )
    setErrors((prev) => {
      if (!prev[name]) return prev
      const nextErrors = { ...prev }
      delete nextErrors[name]
      return nextErrors
    })
  }

  const handleStepChange = (targetStep) => {
    if (targetStep <= currentStep) {
      setCurrentStep(targetStep)
      return
    }

    if (validateStep(currentStep)) {
      setCurrentStep(targetStep)
    }
  }

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1))
      setValidationNotice([])
    } else {
      addNotification('error', 'Required Fields', 'Please complete all required fields marked as required.')
    }
  }

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const validationErrors = validateAllSteps()

    if (Object.keys(validationErrors).length > 0) {
      setCurrentStep(0)
      addNotification('error', 'Required Fields', 'Please complete all required fields marked as required.')
      return
    }

    setSaving(true)
    setValidationNotice([])

    const payload = {
      name: formData.accountName,
      email: formData.contactEmail,
      phone: formData.contactMobile || formData.contactPhone,
      industry: formData.industryType,
      status: formData.accountState || 'pending',
      accountState: formData.accountState || 'pending',
      source: formData.accountSource,
      ownerName: formData.accountOwner,
      addedBy: user?.name || user?.username || '',
      address: formData.address,
      createdByUserId: user?.id || '',
      createdByUserName: user?.name || user?.username || '',
      employeeId: user?.employeeId || user?.ownerCode || '',
      department: user?.department || '',
      userEmail: user?.email || '',
      ...formData,
      contacts: [
        {
          name: formData.contactPerson,
          designation: formData.contactDesignation,
          email: formData.contactEmail,
          phone: formData.contactPhone,
          mobile: formData.contactMobile,
        },
      ],
      projects: [
        {
          projectName: formData.projectName,
          projectCode: formData.projectCode,
          projectType: formData.projectType,
          projectLocation: formData.projectLocation,
          consultantName: formData.consultantName,
          architectName: formData.architectName,
          pmcName: formData.pmcName,
          projectValue: formData.projectValue,
          projectStatus: formData.projectStatus,
          projectDescription: formData.projectDescription,
        },
      ],
    }

    const result = await createAccount(payload)
    setSaving(false)

    if (result.success) {
      addNotification(
        'success',
        'Account Created',
        `${formData.accountName} is now visible in Search Account.`
      )
      if (result.data) {
        const normalizedAccount = normalizeAccountRecord(result.data)
        const nextParams = new URLSearchParams({
          stage: normalizedAccount.stage || 'new',
          accountId: normalizedAccount.id,
          page: '1',
        })
        navigate(`${backPath}?${nextParams.toString()}`, {
          state: {
            newAccountId: normalizedAccount.id,
            newAccountName: normalizedAccount.name,
          },
        })
        return
      }

      navigate(backPath)
      return
    }

    addNotification('error', 'Save Failed', result.message || 'Unable to create account.')
  }

  const renderFieldGroup = (fields, options = {}) =>
    fields.map((field) => (
      <LegacyFormField
        key={field.name}
        label={field.label}
        name={field.name}
        type={field.type}
        value={formData[field.name]}
        onChange={handleChange}
        required={field.required}
        options={field.options}
        error={errors[field.name]}
        placeholder={field.placeholder}
        textareaRows={field.textareaRows}
        fieldClassName={field.fieldClassName}
        layout={options.layout}
        rowClassName={[options.rowClassName, field.rowClassName].filter(Boolean).join(' ')}
        inputWrapperClassName={options.inputWrapperClassName}
      />
    ))

  return (
    <div className="add-account-landscape-page">
      <form
        onSubmit={handleSubmit}
        className="add-account-landscape-form"
      >
        <WizardStepper
          steps={steps}
          currentStep={currentStep}
          onStepChange={handleStepChange}
          className="add-account-landscape-stepper"
        />

        {currentStep === 0 ? (
          <LegacyFormSection
            title="Account Basic Details"
            subtitle="Required fields are marked with an asterisk. Layout follows a compact legacy CRM structure."
            className="add-account-landscape-section"
            headerClassName="pb-2"
            titleClassName="text-[17px] sm:text-[18px]"
            subtitleClassName="text-[9px] text-[var(--text-muted)]"
          >
            <div className="add-account-landscape-field-grid add-account-landscape-field-grid-two">
              <div className="add-account-landscape-field-column">
                {renderFieldGroup(fieldGroups.basicLeft, {
                  layout: 'inline',
                  rowClassName: '',
                  inputWrapperClassName: 'w-full max-w-none',
                })}
              </div>
              <div className="add-account-landscape-field-column">
                {renderFieldGroup(fieldGroups.basicRight, {
                  layout: 'inline',
                  inputWrapperClassName: 'w-full max-w-none',
                })}
                {categoryLogo ? (
                  <div className="add-account-landscape-logo-preview">
                    <img
                      src={categoryLogo.src}
                      alt={`${categoryLogo.alt} logo`}
                    />
                    <div>
                      <div>{categoryLogo.alt} Account</div>
                      <div>Logo is set automatically from the Account Category.</div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </LegacyFormSection>
        ) : null}

        {currentStep === 0 ? (
          <LegacyFormSection
            title="Project Details"
            className="add-account-landscape-section"
            headerClassName="pb-2"
            titleClassName="text-[17px] sm:text-[18px]"
          >
            <div className="add-account-landscape-field-grid add-account-landscape-field-grid-three">
              {renderFieldGroup(fieldGroups.projectDetails, {
                layout: 'inline',
                inputWrapperClassName: 'w-full max-w-none',
              })}
            </div>
          </LegacyFormSection>
        ) : null}

        {currentStep === 1 ? (
          <LegacyFormSection
            title="Contacts"
            subtitle="Add the primary contact details linked to this account."
            className="add-account-landscape-section"
          >
            <div className="add-account-landscape-field-grid add-account-landscape-field-grid-two">
              <div className="add-account-landscape-field-column">{renderFieldGroup(fieldGroups.contactsLeft, { layout: 'inline' })}</div>
              <div className="add-account-landscape-field-column">{renderFieldGroup(fieldGroups.contactsRight, { layout: 'inline' })}</div>
            </div>
          </LegacyFormSection>
        ) : null}

        {currentStep === 2 ? (
          <LegacyFormSection
            title="Reminder & Remark"
            subtitle="Capture follow-up details and internal notes before saving the account."
            className="add-account-landscape-section"
          >
            <div className="add-account-landscape-field-grid add-account-landscape-field-grid-two">
              <div className="add-account-landscape-field-column">{renderFieldGroup(fieldGroups.reminderLeft, { layout: 'inline' })}</div>
              <div className="add-account-landscape-field-column">{renderFieldGroup(fieldGroups.reminderRight, { layout: 'inline' })}</div>
            </div>
          </LegacyFormSection>
        ) : null}

        <div className="add-account-landscape-footer">
          <p>
            Step {currentStep + 1} of {steps.length}
          </p>

          <div>
            <button
              type="button"
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="add-account-landscape-button add-account-landscape-button-secondary"
            >
              Previous
            </button>

            {currentStep < steps.length - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                className="add-account-landscape-button add-account-landscape-button-primary"
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                disabled={saving}
                className="add-account-landscape-button add-account-landscape-button-primary"
              >
                {saving ? 'Saving...' : 'Save Account'}
              </button>
            )}

            <button
              type="button"
              onClick={() => navigate(backPath)}
              className="add-account-landscape-button add-account-landscape-button-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

export default AddAccountWizard
