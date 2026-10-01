import React from 'react';

export default function WhySwatiCrm() {
  const pillars = [
    { title: 'One Source of Truth', desc: 'Eliminate duplicate spreadsheets and disconnected notes across departments.' },
    { title: 'Better Team Visibility', desc: 'Keep management, sales, and support aligned on customer status.' },
    { title: 'Faster Decisions', desc: 'Real-time pipeline metrics and task tracking accelerate operations.' }
  ];

  return (
    <section className="lp-section" id="about">
      <div className="lp-container">
        <div className="lp-section-header">
          <div className="lp-badge">Value Driven</div>
          <h2 className="lp-heading-2">Built to simplify the way teams work.</h2>
          <p className="lp-subheading">
            Designed to bring structure, clarity, and speed to daily management workflows.
          </p>
        </div>

        <div className="lp-grid-3">
          {pillars.map((col, idx) => (
            <div key={idx} className="lp-card">
              <div className="lp-card-icon">🎯</div>
              <h3 className="lp-card-title">{col.title}</h3>
              <p className="lp-card-desc">{col.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
