import React from 'react';
import { Link } from 'react-router-dom';
import swatiLogo from '../../assets/swati-logo.png';

export default function LandingFooter() {
  return (
    <footer className="lp-footer">
      <div className="lp-container">
        <div className="lp-footer-grid">
          <div>
            <div className="lp-brand" style={{ marginBottom: '1.25rem' }}>
              <img src={swatiLogo} alt="Swati Logo" className="lp-brand-logo" />
              <div className="lp-brand-text">
                <span className="lp-brand-name" style={{ color: '#ffffff' }}>Swati<span className="crm">CRM</span></span>
              </div>
            </div>
            <p style={{ fontSize: '0.9rem', lineHeight: '1.6', maxWidth: '320px', color: '#94a3b8' }}>
              An all-in-one business CRM platform bringing customers, accounts, deals, quotations, and support operations together.
            </p>
          </div>

          <div>
            <h4 className="lp-footer-title">Product</h4>
            <ul className="lp-footer-links">
              <li><a href="#product">Product</a></li>
              <li><a href="#solutions">Solutions</a></li>
              <li><a href="#security">Security</a></li>
              <li><a href="#about">About</a></li>
            </ul>
          </div>

          <div>
            <h4 className="lp-footer-title">Company</h4>
            <ul className="lp-footer-links">
              <li><a href="#about">About SwatiCRM</a></li>
              <li><a href="https://swatiswitchgears.com" target="_blank" rel="noopener noreferrer">Swati Switchgears</a></li>
            </ul>
          </div>

          <div>
            <h4 className="lp-footer-title">Legal & Security</h4>
            <ul className="lp-footer-links">
              <li><Link to="/privacy-policy">Privacy Policy</Link></li>
              <li><Link to="/terms-and-conditions">Terms & Conditions</Link></li>
              <li><Link to="/account-deletion">Account Deletion</Link></li>
            </ul>
          </div>
        </div>

        <div className="lp-footer-bottom">
          <div>© {new Date().getFullYear()} SwatiCRM. All rights reserved.</div>
          <div>
            <a 
              href="https://swatiswitchgears.com/" 
              target="_blank" 
              rel="noopener noreferrer" 
              style={{ color: '#94a3b8', textDecoration: 'none', transition: 'color 0.2s' }}
              onMouseOver={(e) => e.currentTarget.style.color = '#ffffff'}
              onMouseOut={(e) => e.currentTarget.style.color = '#94a3b8'}
            >
              Powered by Swati Switchgears Pvt. Ltd.
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
