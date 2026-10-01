import React from 'react';
import { Link } from 'react-router-dom';

export default function CtaSection() {
  return (
    <section className="lp-section">
      <div className="lp-container">
        <div className="lp-cta-band">
          <h2 className="lp-heading-2">Ready to bring your business together?</h2>
          <p className="lp-subheading">
            Join your team on SwatiCRM and streamline customer relationships, sales, and service today.
          </p>
          <div className="lp-hero-ctas">
            <Link to="/register" className="lp-btn lp-btn-white">Create Account →</Link>
            <Link to="/login" className="lp-btn lp-btn-outline-white cta-login-btn">Login →</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
