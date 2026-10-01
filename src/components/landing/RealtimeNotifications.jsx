import React from 'react';
import { FaCheckCircle, FaUserTag, FaExclamationTriangle } from 'react-icons/fa';

export default function RealtimeNotifications() {
  const items = [
    { 
      title: 'Quotation Approved', 
      detail: 'Quotation #QT-2026-894 approved by Client.', 
      time: '5 mins ago',
      icon: <FaCheckCircle style={{ color: '#10b981' }} />
    },
    { 
      title: 'New Deal Assigned', 
      detail: 'Opportunity "Switchgear Panel Supply" assigned to you.', 
      time: '25 mins ago',
      icon: <FaUserTag style={{ color: '#dc2626' }} />
    },
    { 
      title: 'Support Ticket Escalated', 
      detail: 'Ticket #TK-402 updated with high priority.', 
      time: '1 hour ago',
      icon: <FaExclamationTriangle style={{ color: '#f59e0b' }} />
    }
  ];

  return (
    <section className="lp-section">
      <div className="lp-container">
        <div className="lp-alerts-wrapper-container">
          <div className="lp-section-header" style={{ marginBottom: '2rem' }}>
            <div className="lp-badge">Real-Time Alerts</div>
            <h2 className="lp-heading-2">Stay connected to what matters.</h2>
            <p className="lp-subheading">
              Get instant updates on critical deals, customer requests, and task assignments.
            </p>
          </div>

          <div className="lp-alerts-compact-grid">
            {items.map((item, idx) => (
              <div key={idx} className="lp-alert-compact-card">
                <div className="lp-alert-card-icon">
                  {item.icon}
                </div>
                <div className="lp-alert-card-content">
                  <div className="lp-alert-card-header">
                    <h4 className="lp-alert-card-title">{item.title}</h4>
                    <span className="lp-alert-card-time">{item.time}</span>
                  </div>
                  <p className="lp-alert-card-desc">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
