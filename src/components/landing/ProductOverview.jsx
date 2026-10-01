import React from 'react';

export default function ProductOverview() {
  const modules = [
    { title: 'Customers', desc: 'Detailed profiles & relationship history' },
    { title: 'Accounts', desc: 'B2B client organizations & contacts' },
    { title: 'Deals', desc: 'Pipeline stages & deal analytics' },
    { title: 'Tasks', desc: 'Team assignments & follow-up tracking' },
    { title: 'Quotations', desc: 'Standardized pricing & estimates' },
    { title: 'Support', desc: 'Ticket management & issue resolution' },
  ];

  return (
    <section className="lp-section">
      <div className="lp-container">
        <div className="lp-section-header">
          <div className="lp-badge">Connected Ecosystem</div>
          <h2 className="lp-heading-2">Your entire business workflow, connected.</h2>
          <p className="lp-subheading">
            From initial enquiry to post-sales service, SwatiCRM connects operational touchpoints into a unified workspace.
          </p>
        </div>

        <div className="lp-grid-3">
          {modules.map((item, i) => (
            <div key={i} className="lp-card">
              <div className="lp-card-icon">❖</div>
              <h3 className="lp-card-title">{item.title}</h3>
              <p className="lp-card-desc">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
