import React, { useMemo } from 'react'
import { FaProjectDiagram, FaArrowRight, FaPercentage } from 'react-icons/fa'
import { useData } from '../../context/DataContext'
import './SalesDashboards.css'

const PipelineAnalysis = () => {
  const { deals } = useData()

  const pipelineData = useMemo(() => {
    const stages = {
      'pending': { label: 'Pending', count: 0, value: 0, color: '#95a5a6' },
      'qualified': { label: 'Qualified', count: 0, value: 0, color: '#3498db' },
      'proposal': { label: 'Proposal', count: 0, value: 0, color: '#f39c12' },
      'negotiation': { label: 'Negotiation', count: 0, value: 0, color: '#e67e22' },
      'won': { label: 'Won', count: 0, value: 0, color: '#27ae60' },
      'lost': { label: 'Lost', count: 0, value: 0, color: '#e74c3c' },
    }

    deals.forEach(deal => {
      const status = deal.status?.toLowerCase() || 'pending'
      if (stages[status]) {
        stages[status].count += 1
        stages[status].value += deal.value || 0
      }
    })

    const total = Object.values(stages).reduce((sum, s) => sum + s.count, 0)
    const totalValue = Object.values(stages).reduce((sum, s) => sum + s.value, 0)

    const stageList = Object.values(stages).map(stage => ({
      ...stage,
      percentage: total > 0 ? ((stage.count / total) * 100).toFixed(1) : 0,
      avgValue: stage.count > 0 ? (stage.value / stage.count).toFixed(2) : 0,
    }))

    return {
      stages: stageList,
      total,
      totalValue,
    }
  }, [deals])

  const maxCount = Math.max(...pipelineData.stages.map(s => s.count), 1)

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Pipeline Analysis Dashboard</h1>
        <p className="dashboard-subtitle">Deal pipeline stages and conversion metrics</p>
      </div>

      <div className="pipeline-summary">
        <div className="summary-item">
          <span className="summary-label">Total Deals in Pipeline</span>
          <span className="summary-value">{pipelineData.total}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Pipeline Value</span>
          <span className="summary-value">${(pipelineData.totalValue / 1000000).toFixed(2)}M</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Average Deal Value</span>
          <span className="summary-value">
            ${pipelineData.total > 0 ? (pipelineData.totalValue / pipelineData.total).toFixed(0) : 0}
          </span>
        </div>
      </div>

      <div className="pipeline-stages">
        <h3>Pipeline Stages</h3>
        {pipelineData.stages.map((stage, index) => (
          <div key={stage.label} className="pipeline-stage">
            <div className="stage-header">
              <span className="stage-name">{stage.label}</span>
              <span className="stage-badge">{stage.count}</span>
            </div>

            <div className="stage-bar-container">
              <div 
                className="stage-bar" 
                style={{
                  width: `${(stage.count / maxCount) * 100}%`,
                  background: stage.color,
                }}
              />
            </div>

            <div className="stage-details">
              <span className="detail-item">
                <FaPercentage className="detail-icon" />
                {stage.percentage}%
              </span>
              <span className="detail-item">
                <FaArrowRight className="detail-icon" />
                ${(stage.value / 1000).toFixed(1)}K
              </span>
              <span className="detail-item">
                Avg: ${(stage.avgValue / 1000).toFixed(1)}K
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="conversion-section">
        <h3>Conversion Analysis</h3>
        <div className="conversion-flow">
          {pipelineData.stages
            .filter(s => s.label !== 'Lost')
            .map((stage, index, arr) => (
              <div key={stage.label} className="conversion-item">
                <div className="conversion-box" style={{ borderColor: stage.color }}>
                  <div className="conversion-label">{stage.label}</div>
                  <div className="conversion-count">{stage.count}</div>
                </div>
                {index < arr.length - 1 && (
                  <div className="conversion-arrow">
                    <FaArrowRight />
                  </div>
                )}
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}

export default PipelineAnalysis
