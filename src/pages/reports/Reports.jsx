import React, { useMemo } from 'react'
import { useData } from '../../context/DataContext'
import Card from '../../components/common/Card'
import { formatCurrency, groupBy } from '../../utils/helpers'
import './Reports.css'

const Reports = ({ isAdmin = false }) => {
  const { accounts, deals, tasks, quotations } = useData()

  const data = useMemo(() => {
    const userAccounts = accounts
    const userDeals = deals
    const userTasks = tasks
    const userQuotations = quotations

    return {
      accounts: userAccounts,
      deals: userDeals,
      tasks: userTasks,
      quotations: userQuotations
    }
  }, [accounts, deals, tasks, quotations, isAdmin])

  const stats = useMemo(() => {
    const accountsByStatus = groupBy(data.accounts, 'status')
    const dealsByStatus = groupBy(data.deals, 'status')
    const tasksByStatus = groupBy(data.tasks, 'status')

    const totalDealValue = data.deals.reduce((sum, d) => sum + (d.value || 0), 0)
    const wonDeals = data.deals.filter(d => d.status === 'won')
    const wonValue = wonDeals.reduce((sum, d) => sum + (d.value || 0), 0)

    return {
      accountsByStatus,
      dealsByStatus,
      tasksByStatus,
      totalDealValue,
      wonValue,
      conversionRate: data.deals.length > 0 ? (wonDeals.length / data.deals.length * 100).toFixed(1) : 0
    }
  }, [data])

  return (
    <div className="reports-page">
      <h1>Reports & Analytics</h1>

      <div className="reports-grid">
        <Card title="Account Summary">
          <div className="report-stats">
            <div className="stat-row">
              <span>Total Accounts:</span>
              <strong>{data.accounts.length}</strong>
            </div>
            {Object.entries(stats.accountsByStatus).map(([status, items]) => (
              <div key={status} className="stat-row">
                <span>{status}:</span>
                <strong>{items.length}</strong>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Deal Summary">
          <div className="report-stats">
            <div className="stat-row">
              <span>Total Deals:</span>
              <strong>{data.deals.length}</strong>
            </div>
            <div className="stat-row">
              <span>Total Value:</span>
              <strong>{formatCurrency(stats.totalDealValue)}</strong>
            </div>
            <div className="stat-row">
              <span>Won Value:</span>
              <strong>{formatCurrency(stats.wonValue)}</strong>
            </div>
            <div className="stat-row">
              <span>Conversion Rate:</span>
              <strong>{stats.conversionRate}%</strong>
            </div>
          </div>
        </Card>

        <Card title="Task Summary">
          <div className="report-stats">
            <div className="stat-row">
              <span>Total Tasks:</span>
              <strong>{data.tasks.length}</strong>
            </div>
            {Object.entries(stats.tasksByStatus).map(([status, items]) => (
              <div key={status} className="stat-row">
                <span>{status}:</span>
                <strong>{items.length}</strong>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Quotation Summary">
          <div className="report-stats">
            <div className="stat-row">
              <span>Total Quotations:</span>
              <strong>{data.quotations.length}</strong>
            </div>
            <div className="stat-row">
              <span>Total Amount:</span>
              <strong>
                {formatCurrency(data.quotations.reduce((sum, q) => sum + (q.amount || 0), 0))}
              </strong>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

export default Reports
