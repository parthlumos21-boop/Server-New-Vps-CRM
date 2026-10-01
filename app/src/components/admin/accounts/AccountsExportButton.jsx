import React from 'react'
import { exportAccountsBoardWorkbook } from '../../../features/adminAccounts/utils/exportAccountsBoard'
import { ExcelExportMenuButton } from '../../common/ExcelExportButton'

const AccountsExportButton = ({
  currentStageRows,
  allRows,
  disabled,
  filePrefix,
  boardTitle,
  activeStageLabel,
}) => {
  const hasCurrentStageRows = currentStageRows.length > 0
  const hasAllRows = allRows.length > 0

  const handleExport = (scopeKey, scopeLabel, stageLabel, rows) => {
    if (!rows.length) return

    exportAccountsBoardWorkbook({
      rows,
      scopeKey,
      scopeLabel,
      boardTitle,
      stageLabel,
      filePrefix,
    })
  }

  return (
    <ExcelExportMenuButton
      label="Export"
      title="Export accounts as Excel"
      disabled={disabled}
      className="admin-accounts-export-dropdown"
      buttonClassName="admin-accounts-export-trigger"
      menuClassName="admin-accounts-export-menu"
      items={[
        {
          key: 'current-stage-excel',
          label: 'Current Stage',
          badge: 'XLSX',
          disabled: !hasCurrentStageRows,
          onClick: () => handleExport('current-stage', 'Current Stage', activeStageLabel, currentStageRows),
        },
        {
          key: 'all-stages-excel',
          label: 'All Stages',
          badge: 'XLSX',
          disabled: !hasAllRows,
          onClick: () => handleExport('all-stages', 'All Stages', 'All Stages', allRows),
        },
      ]}
    />
  )
}

export default AccountsExportButton
