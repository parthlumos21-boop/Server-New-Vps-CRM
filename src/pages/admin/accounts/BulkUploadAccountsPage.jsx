import React, { useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useData } from '../../../context/DataContext'
import { buildAdminAccountsBoardUrl, getAdminAccountsBoardViewByQuery } from '../../../features/adminAccounts/config/accountBoardViews'
import { buildAdminCustomViewUrl, getAdminCustomViewById } from '../../../features/adminAccounts/customViews/customViewStorage'
import { BULK_UPLOAD_STEPS } from '../../../features/adminAccounts/bulkUpload/constants'
import Button from '../../../components/common/Button'
import WizardStepper from '../../../components/accounts/WizardStepper'
import ChooseDataFileStep from './steps/ChooseDataFileStep'
import SelectFieldsStep from './steps/SelectFieldsStep'
import VerifyStep from './steps/VerifyStep'
import './BulkUploadAccountsPage.css'

const BulkUploadAccountsPage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { accounts } = useData()

  const [currentStep, setCurrentStep] = useState(0)
  const [selectedFile, setSelectedFile] = useState(null)
  const [mappings, setMappings] = useState({})
  const [error, setError] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)

  // Get navigation context
  const view = getAdminAccountsBoardViewByQuery(searchParams.get('view'))
  const customViewId = searchParams.get('customViewId')
  const customView = customViewId ? getAdminCustomViewById(customViewId) : null
  const stage = searchParams.get('stage') || ''
  const page = searchParams.get('page') || ''
  const group = searchParams.get('group') || ''

  // Build return URL
  const buildReturnUrl = () => {
    const customViewParams = new URLSearchParams()
    if (group) customViewParams.set('group', group)
    if (page) customViewParams.set('page', page)
    
    if (customView) {
      return buildAdminCustomViewUrl(customView.id, customViewParams.toString() ? `?${customViewParams.toString()}` : '')
    }
    
    return buildAdminAccountsBoardUrl(
      view?.key || 'main',
      `?view=${encodeURIComponent(view?.queryValue || 'all')}&stage=${encodeURIComponent(stage)}&page=${encodeURIComponent(page)}`
    )
  }

  const handleFileSelected = (fileData) => {
    setSelectedFile(fileData)
    setMappings({})
    setCurrentStep(1)
  }

  const handleMappingsChange = (newMappings) => {
    setMappings(newMappings)
  }

  const handleStepChange = (stepIndex) => {
    // Allow navigation backward
    if (stepIndex < currentStep) {
      setCurrentStep(stepIndex)
      setError(null)
      return
    }

    // Forward navigation - validate current step
    if (currentStep === 1 && Object.keys(mappings).length === 0) {
      setError('Please map at least one field')
      return
    }

    setCurrentStep(stepIndex)
    setError(null)
  }

  const handleNext = () => {
    if (currentStep < BULK_UPLOAD_STEPS.length - 1) {
      handleStepChange(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
      setError(null)
    }
  }

  const handleConfirm = async () => {
    if (!selectedFile || !Object.keys(mappings).length) {
      setError('Please complete all steps')
      return
    }

    setIsProcessing(true)
    try {
      // TODO: Implement actual file upload/processing
      // For now, just simulate success and navigate back
      await new Promise((resolve) => setTimeout(resolve, 500))
      navigate(buildReturnUrl())
    } catch (err) {
      setError(err.message || 'Failed to upload data')
    } finally {
      setIsProcessing(false)
    }
  }

  const canProceed = () => {
    if (currentStep === 0) return !!selectedFile
    if (currentStep === 1) return Object.keys(mappings).length > 0
    return true
  }

  const isLastStep = currentStep === BULK_UPLOAD_STEPS.length - 1

  return (
    <div className="bulk-upload-page">
      <div className="bulk-upload-container">
        <div className="bulk-upload-header">
          <h1 className="bulk-upload-title">Bulk Upload Account Data</h1>
          <p className="bulk-upload-subtitle">
            Upload multiple account records from a CSV file with field mapping and verification
          </p>
        </div>

        <div className="bulk-upload-stepper-container">
          <WizardStepper
            steps={BULK_UPLOAD_STEPS}
            currentStep={currentStep}
            onStepChange={handleStepChange}
          />
        </div>

        <div className="bulk-upload-content">
          {currentStep === 0 && (
            <ChooseDataFileStep
              onFileSelected={handleFileSelected}
              selectedFile={selectedFile}
              error={error}
              setError={setError}
            />
          )}

          {currentStep === 1 && selectedFile && (
            <SelectFieldsStep
              csvHeaders={selectedFile.headers}
              onMappingsChange={handleMappingsChange}
              initialMappings={mappings}
              error={error}
              setError={setError}
            />
          )}

          {currentStep === 2 && selectedFile && (
            <VerifyStep
              records={selectedFile.records}
              headers={selectedFile.headers}
              mappings={mappings}
              fileName={selectedFile.fileName}
              error={error}
              setError={setError}
            />
          )}
        </div>

        <div className="bulk-upload-actions">
          <Button
            onClick={() => navigate(buildReturnUrl())}
            className="bulk-upload-btn-cancel"
          >
            Cancel
          </Button>

          <div className="bulk-upload-actions-right">
            {currentStep > 0 && (
              <Button
                onClick={handlePrevious}
                className="bulk-upload-btn-secondary"
              >
                Previous
              </Button>
            )}

            {!isLastStep && (
              <Button
                onClick={handleNext}
                disabled={!canProceed() || isProcessing}
                className="bulk-upload-btn-primary"
              >
                Next
              </Button>
            )}

            {isLastStep && (
              <Button
                onClick={handleConfirm}
                disabled={!canProceed() || isProcessing}
                className="bulk-upload-btn-primary"
              >
                {isProcessing ? 'Uploading...' : 'Upload'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default BulkUploadAccountsPage
