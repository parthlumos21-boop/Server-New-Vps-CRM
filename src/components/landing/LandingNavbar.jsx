import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import swatiLogo from '../../assets/swati-logo.png';

export default function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`lp-nav ${scrolled ? 'lp-nav-scrolled' : ''}`}>
      <div className="lp-container lp-nav-container">
        <Link to="/" className="lp-brand">
          <img src={swatiLogo} alt="SwatiCRM Logo" className="lp-brand-logo" />
          <div className="lp-brand-text">
            <span className="lp-brand-name">
            Swati<span className="crm">CRM</span>
          </span>
          </div>
        </Link>

        <nav>
          <ul className="lp-nav-links">
            <li><a href="#product" className="lp-nav-link">Product</a></li>
            <li><a href="#solutions" className="lp-nav-link">Solutions</a></li>
            <li><a href="#about" className="lp-nav-link">About</a></li>
            <li><a href="#security" className="lp-nav-link">Security</a></li>
          </ul>
        </nav>

        <div className="lp-nav-actions">
          <Link to="/login" className="lp-btn lp-btn-primary">Login</Link>
        </div>
      </div>
    </header>
  );
}
