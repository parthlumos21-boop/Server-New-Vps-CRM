import React from 'react';
import { FaUserShield, FaLock, FaDatabase, FaUserCog } from 'react-icons/fa';

export default function SecuritySection() {
  const points = [
    { 
      title: 'Role-Based Access Control (RBAC)', 
      desc: 'Configure granular permissions per user role to ensure employees access only relevant data.',
      icon: <FaUserShield />
    },
    { 
      title: 'Secure Authentication', 
      desc: 'Protected by industry-standard JWT authentication tokens and encrypted password hashing.',
      icon: <FaLock />
    },
    { 
      title: 'Data Isolation', 
      desc: 'Secure database architecture safeguarding customer records and business documents.',
      icon: <FaDatabase />
    },
    { 
      title: 'Administrative Controls', 
      desc: 'System administrators maintain oversight of accounts, access logs, and permissions.',
      icon: <FaUserCog />
    }
  ];

  return (
    <section className="lp-section lp-section-alt" id="security">
      <div className="lp-container">
        <div className="lp-section-header">
          <div className="lp-badge">Enterprise Security</div>
          <h2 className="lp-heading-2">Business Data Deserves Controlled Access.</h2>
          <p className="lp-subheading">
            Built with rigorous standards to protect company records, customer accounts, and internal communications.
          </p>
        </div>

        <div className="lp-grid-2">
          {points.map((p, idx) => (
            <div key={idx} className="lp-security-compact-card">
              <div className="lp-security-card-header">
                <span className="lp-security-inline-icon">{p.icon}</span>
                <h3 className="lp-card-title" style={{ fontSize: '0.98rem', margin: 0 }}>{p.title}</h3>
              </div>
              <p className="lp-card-desc" style={{ fontSize: '0.85rem', marginTop: '0.4rem', lineHeight: '1.5' }}>{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
