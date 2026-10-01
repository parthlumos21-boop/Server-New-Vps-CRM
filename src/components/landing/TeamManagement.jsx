import React from 'react';

export default function TeamManagement() {
  const roles = [
    { title: 'Management', desc: 'High-level dashboard overview, revenue forecasts, and team productivity tracking.' },
    { title: 'Sales Representatives', desc: 'Manage active pipelines, update deal status, send quotes, and record customer touchpoints.' },
    { title: 'Support Teams', desc: 'Resolve issues, assign tickets, manage service logs, and monitor resolution timelines.' },
    { title: 'Field Operations', desc: 'Log site visits, record customer feedback, and access account details on the go.' },
    { title: 'Administrators', desc: 'Granular role-based permissions, user management, and system auditing.' }
  ];

  return (
    <section className="lp-section" id="solutions">
      <div className="lp-container">
        <div className="lp-section-header">
          <div className="lp-badge">Role Alignment</div>
          <h2 className="lp-heading-2">Built for every team.</h2>
          <p className="lp-subheading">
            Tailored views and role permissions ensure everyone has the exact tools they need.
          </p>
        </div>

        <div className="lp-grid-3">
          {roles.map((role, idx) => (
            <div key={idx} className="lp-card">
              <div className="lp-card-icon">👥</div>
              <h3 className="lp-card-title">{role.title}</h3>
              <p className="lp-card-desc">{role.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
