import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../../context/DataContext'
import { useModal, useSearch, useFilter } from '../../hooks'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import Input from '../../components/common/Input'
import Select from '../../components/common/Select'
import Modal from '../../components/common/Modal'
import Table from '../../components/common/Table'
import Badge from '../../components/common/Badge'
import AddRemarksModal from '../../components/common/AddRemarksModal'
import { remarkApi } from '../../services/remarkApi'
import { formatDate, getStatusColor } from '../../utils/helpers'
import { ACCOUNT_STATUS, INDUSTRIES, LEAD_SOURCES } from '../../utils/constants'
import { getAccountCategoryLogo } from '../../features/accounts/config/accountCategoryLogo'
import './Accounts.css'

const Accounts = ({ isAdmin = false }) => {
  const { accounts, createAccount, updateAccount, deleteAccount, addNotification } = useData()
  const { isOpen, data, open, close } = useModal()
  const navigate = useNavigate()
  const [remarkAccount, setRemarkAccount] = useState(null)
  const [isSavingRemark, setIsSavingRemark] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    website: '',
    industry: '',
    status: 'active',
    source: '',
    address: ''
  })

  const userAccounts = useMemo(() => (
    [...accounts].sort((left, right) => {
      const leftId = Number(left.id) || 0
      const rightId = Number(right.id) || 0
      return leftId - rightId
    })
  ), [accounts])

  const { searchTerm, setSearchTerm, filteredItems: searchedAccounts } = useSearch(
    userAccounts,
    ['name', 'email', 'industry', 'id']
  )

  const { filters, filteredItems, setFilter } = useFilter(searchedAccounts, {
    status: 'all',
    industry: 'all'
  })

  const handleSubmit = async (e) => {
    e.preventDefault()

    const result = data 
      ? await updateAccount(data.id, formData)
      : await createAccount(formData)

    if (result.success) {
      addNotification('success', 'Success', `Account ${data ? 'updated' : 'created'} successfully`)
      close()
      resetForm()
    } else {
      addNotification('error', 'Error', result.message)
    }
  }

  const handleEdit = (account) => {
    setFormData({
      name: account.name,
      email: account.email || '',
      phone: account.phone || '',
      website: account.website || '',
      industry: account.industry || '',
      status: account.status,
      source: account.source || '',
      address: account.address || ''
    })
    open(account)
  }

  const handleDelete = async (account) => {
    if (window.confirm(`Delete account "${account.name}"?`)) {
      const result = await deleteAccount(account.id)
      if (result.success) {
        addNotification('success', 'Deleted', 'Account deleted successfully')
      }
    }
  }

  const handleSaveRemark = async (remarkData) => {
    setIsSavingRemark(true)

    try {
      await remarkApi.createRemark(remarkData)
      addNotification('success', 'Remark added', 'Remark saved successfully.')
      setRemarkAccount(null)
    } catch (error) {
      addNotification('error', 'Remark not saved', error.response?.data?.message || error.message)
    } finally {
      setIsSavingRemark(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      website: '',
      industry: '',
      status: 'active',
      source: '',
      address: ''
    })
  }

  const columns = [
    {
      key: 'id',
      label: 'S.No',
      width: '70px',
      render: (_, __, index) => index + 1,
    },
    {
      key: 'name',
      label: 'Account Name',
      render: (value, row) => {
        const logo = getAccountCategoryLogo(row.accountCategory)
        const displayName = value || row.accountName || row.customerName || ''
        return (
          <div className="account-name-cell">
            {logo ? (
              <img
                src={logo.src}
                alt={`${logo.alt} logo`}
                className="account-name-cell__logo"
              />
            ) : (
              <span className="account-name-cell__logo-placeholder" aria-hidden="true" />
            )}
            <div className="account-name-cell__text">
              <span className="account-name-cell__title">{displayName}</span>
              {row.accountCategory ? (
                <span className="account-name-cell__category">{row.accountCategory}</span>
              ) : null}
            </div>
          </div>
        )
      },
    },
    { key: 'industry', label: 'Industry', width: '150px' },
    { 
      key: 'status', 
      label: 'Status',
      width: '120px',
      render: (value) => (
        <Badge variant={getStatusColor(value)}>{value}</Badge>
      )
    },
    { 
      key: 'createdAt', 
      label: 'Created',
      width: '150px',
      render: (value) => formatDate(value)
    },
    {
      key: 'actions',
      label: 'Actions',
      width: '260px',
      render: (_, row) => (
        <div className="table-actions">
          <Button size="small" variant="outline" onClick={() => handleEdit(row)}>
            Edit
          </Button>
          <Button size="small" variant="outline" onClick={() => setRemarkAccount(row)}>
            Add Notes/Remarks
          </Button>
          {!isAdmin && (
            <Button size="small" variant="danger" onClick={() => handleDelete(row)}>
              Delete
            </Button>
          )}
        </div>
      )
    }
  ]

  return (
    <div className="accounts-page">
      <Card
        title="Accounts"
        subtitle={`${filteredItems.length} accounts`}
        actions={
          <Button onClick={() => navigate(isAdmin ? '/admin/accounts/new' : '/accounts/new')}>
            + Add Account
          </Button>
        }
      >
        <div className="accounts-filters">
          <Input
            placeholder="Search accounts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />

          <Select
            value={filters.status}
            onChange={(e) => setFilter('status', e.target.value)}
            options={[
              { value: 'all', label: 'All Status' },
              ...ACCOUNT_STATUS
            ]}
          />

          <Select
            value={filters.industry}
            onChange={(e) => setFilter('industry', e.target.value)}
            options={[
              { value: 'all', label: 'All Industries' },
              ...INDUSTRIES.map(i => ({ value: i, label: i }))
            ]}
          />
        </div>

        <Table
          columns={columns}
          data={filteredItems}
          emptyMessage="No accounts found"
        />
      </Card>

      <Modal
        isOpen={isOpen}
        onClose={close}
        title={data ? 'Edit Account' : 'Add New Account'}
        size="large"
      >
        <form onSubmit={handleSubmit} className="account-form">
          <div className="form-grid">
            <Input
              label="Account Name *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              fullWidth
            />

            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              fullWidth
            />

            <Input
              label="Phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              fullWidth
            />

            <Input
              label="Website"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              fullWidth
            />

            <Select
              label="Industry *"
              value={formData.industry}
              onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
              options={INDUSTRIES.map(i => ({ value: i, label: i }))}
              required
              fullWidth
            />

            <Select
              label="Status *"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              options={ACCOUNT_STATUS}
              required
              fullWidth
            />

            <Select
              label="Source"
              value={formData.source}
              onChange={(e) => setFormData({ ...formData, source: e.target.value })}
              options={LEAD_SOURCES.map(s => ({ value: s, label: s }))}
              fullWidth
            />

            <Input
              label="Address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              fullWidth
            />
          </div>

          <div className="modal-actions">
            <Button type="button" variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              {data ? 'Update' : 'Create'} Account
            </Button>
          </div>
        </form>
      </Modal>

      <AddRemarksModal
        isOpen={Boolean(remarkAccount)}
        onClose={() => setRemarkAccount(null)}
        accountData={remarkAccount}
        onSave={handleSaveRemark}
        isLoading={isSavingRemark}
      />
    </div>
  )
}

export default Accounts
