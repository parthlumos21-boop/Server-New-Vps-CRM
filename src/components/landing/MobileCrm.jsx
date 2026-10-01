import React from 'react';

export default function MobileCrm() {
  return (
    <section className="lp-section">
      <div className="lp-container">
        <div className="lp-section-header">
          <div className="lp-badge">Mobile Ready</div>
          <h2 className="lp-heading-2">Your CRM, wherever you work.</h2>
          <p className="lp-subheading">
            Access customer information, manage deals, and track tasks directly from your mobile device.
          </p>
        </div>

        <div className="lp-grid-3">
          <div className="lp-card" style={{ textAlign: 'center' }}>
            <div className="lp-card-icon" style={{ margin: '0 auto 1rem auto' }}>📱</div>
            <h3 className="lp-card-title">Field Access</h3>
            <p className="lp-card-desc">Log visit summaries and client notes right after meetings on site.</p>
          </div>
          <div className="lp-card" style={{ textAlign: 'center' }}>
            <div className="lp-card-icon" style={{ margin: '0 auto 1rem auto' }}>⚡</div>
            <h3 className="lp-card-title">Instant Sync</h3>
            <p className="lp-card-desc">All updates sync seamlessly with the central web workspace.</p>
          </div>
          <div className="lp-card" style={{ textAlign: 'center' }}>
            <div className="lp-card-icon" style={{ margin: '0 auto 1rem auto' }}>🚀</div>
            <h3 className="lp-card-title">Fast Performance</h3>
            <p className="lp-card-desc">Optimized lightweight interface for quick actions on mobile networks.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
