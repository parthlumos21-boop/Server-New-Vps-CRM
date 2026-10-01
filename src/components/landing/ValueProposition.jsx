import React from 'react';

export default function ValueProposition() {
  const cards = [
    {
      title: 'Customer Management',
      desc: 'Centralize contact details, account structures, activity logs, and interaction history across your whole organization.'
    },
    {
      title: 'Sales Operations',
      desc: 'Track opportunities, stage changes, deal values, and win probabilities from lead acquisition to closing.'
    },
    {
      title: 'Quotation Workflow',
      desc: 'Create, review, export, and track quotations seamlessly with built-in version visibility.'
    },
    {
      title: 'Service Management',
      desc: 'Manage customer requests, tickets, issue resolutions, and ongoing support activities with complete clarity.'
    }
  ];

  return (
    <section className="lp-section lp-section-alt">
      <div className="lp-container">
        <div className="lp-section-header">
          <div className="lp-badge">Core Pillars</div>
          <h2 className="lp-heading-2">One CRM. Every part of your customer journey.</h2>
          <p className="lp-subheading">
            SwatiCRM gives teams a structured platform to manage business operations cleanly without multi-tool confusion.
          </p>
        </div>

        <div className="lp-grid-4">
          {cards.map((card, idx) => (
            <div key={idx} className="lp-card">
              <div className="lp-card-icon">0{idx + 1}</div>
              <h3 className="lp-card-title">{card.title}</h3>
              <p className="lp-card-desc">{card.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
