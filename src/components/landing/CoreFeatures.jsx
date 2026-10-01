import React from 'react';

export default function CoreFeatures() {
  const features = [
    {
      icon: '🏢',
      title: 'Account Management',
      desc: 'Maintain organized company profiles, sub-entities, primary contacts, and business history in one structured view.'
    },
    {
      icon: '👤',
      title: 'Customer Directory',
      desc: 'Store contacts, communication logs, preferences, and associated deals for every customer interaction.'
    },
    {
      icon: '📈',
      title: 'Deals & Opportunities',
      desc: 'Track sales stages, expected revenue, closing timelines, and priority levels with stage visibility.'
    },
    {
      icon: '📄',
      title: 'Quotations & Proposals',
      desc: 'Generate clear, accurate sales quotations with structured line items, payment terms, and status updates.'
    },
    {
      icon: '🎫',
      title: 'Support Operations',
      desc: 'Manage service requests, field issues, maintenance logs, and resolution statuses efficiently.'
    },
    {
      icon: '✅',
      title: 'Tasks & Activities',
      desc: 'Assign clear actions, set due dates, log site visits, and track follow-ups across team members.'
    }
  ];

  return (
    <section className="lp-section lp-section-alt" id="features">
      <div className="lp-container">
        <div className="lp-section-header">
          <div className="lp-badge">Comprehensive Suite</div>
          <h2 className="lp-heading-2">Powerful tools. One workspace.</h2>
          <p className="lp-subheading">
            Built with practical B2B capabilities designed for high productivity and zero clutter.
          </p>
        </div>

        <div className="lp-grid-3">
          {features.map((feat, idx) => (
            <div key={idx} className="lp-card">
              <div className="lp-card-icon">{feat.icon}</div>
              <h3 className="lp-card-title">{feat.title}</h3>
              <p className="lp-card-desc">{feat.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
