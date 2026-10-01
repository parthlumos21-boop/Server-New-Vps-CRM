import React from 'react';

export default function SalesPipeline() {
  const steps = ['New Opportunity', 'Follow Up', 'Priority Deal', 'Order Received', 'Won'];

  return (
    <section className="lp-section">
      <div className="lp-container">
        <div className="lp-section-header">
          <div className="lp-badge">Pipeline Visibility</div>
          <h2 className="lp-heading-2">Move opportunities forward with confidence.</h2>
          <p className="lp-subheading">
            Track deal status from enquiry to final order receipt with transparent sales stages.
          </p>
        </div>

        <div className="lp-pipeline-steps">
          {steps.map((step, index) => (
            <React.Fragment key={index}>
              <div className="lp-pipeline-step">
                <span className="lp-pipeline-step-name">{step}</span>
              </div>
              {index < steps.length - 1 && <span className="lp-tree-arrow">→</span>}
            </React.Fragment>
          ))}
        </div>

        <div className="lp-metrics-row">
          <div className="lp-metric-card">
            <div className="lp-metric-value">₹18.42L</div>
            <div className="lp-metric-label">Pipeline Revenue</div>
          </div>
          <div className="lp-metric-card">
            <div className="lp-metric-value">38</div>
            <div className="lp-metric-label">Active Opportunities</div>
          </div>
          <div className="lp-metric-card">
            <div className="lp-metric-value">₹12.8L</div>
            <div className="lp-metric-label">Orders Received</div>
          </div>
          <div className="lp-metric-card">
            <div className="lp-metric-value">69.5%</div>
            <div className="lp-metric-label">Conversion Rate</div>
          </div>
        </div>
      </div>
    </section>
  );
}
