import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import dashboardScreenshot from '../../assets/dashboard-screenshot.png';

export default function LandingHero() {
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const progress = Math.min(1, Math.max(0, scrollY / 300));
      setScrollProgress(progress);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <section className="lp-hero" id="product">
      <div className="lp-container lp-hero-container">
        <div className="lp-hero-content">
          <h1 className="lp-hero-title">
            Everything Your Team Needs to Manage Business,<br />
            <span>In One Place.</span>
          </h1>
          <div className="lp-hero-ctas">
            <Link to="/login" className="lp-btn lp-btn-primary">Get Started →</Link>
          </div>
        </div>

        <div className="lp-hero-visual-wrapper">
          {/* n8n-style SVG Connector Lines (Synchronized Visibility) */}
          <svg 
            className="lp-n8n-svg-canvas-outer" 
            viewBox="0 0 1240 600"
            style={{
              opacity: scrollProgress,
              transition: 'opacity 0.2s ease-out'
            }}
          >
            <path d="M 170 80 Q 240 140 320 200" className="lp-n8n-edge" />
            <path d="M 1070 80 Q 1000 140 920 200" className="lp-n8n-edge" />
            <path d="M 170 520 Q 240 460 320 400" className="lp-n8n-edge" />
            <path d="M 1070 520 Q 1000 460 920 400" className="lp-n8n-edge" />
          </svg>

          {/* 4 Corner n8n Workflow Nodes */}
          <div className="lp-n8n-node lp-n8n-node-top-left" style={{ opacity: scrollProgress }}>
            <div className="lp-n8n-node-header">
              <span className="lp-n8n-handle"></span>
              <span className="lp-n8n-label">Pipeline Revenue</span>
            </div>
            <div className="lp-n8n-node-value">₹18.42L</div>
          </div>

          <div className="lp-n8n-node lp-n8n-node-top-right" style={{ opacity: scrollProgress }}>
            <div className="lp-n8n-node-header">
              <span className="lp-n8n-label">Active Opportunities</span>
              <span className="lp-n8n-handle"></span>
            </div>
            <div className="lp-n8n-node-value">38</div>
          </div>

          <div className="lp-n8n-node lp-n8n-node-bottom-left" style={{ opacity: scrollProgress }}>
            <div className="lp-n8n-node-header">
              <span className="lp-n8n-handle"></span>
              <span className="lp-n8n-label">Orders Received</span>
            </div>
            <div className="lp-n8n-node-value">₹12.8L</div>
          </div>

          <div className="lp-n8n-node lp-n8n-node-bottom-right" style={{ opacity: scrollProgress }}>
            <div className="lp-n8n-node-header">
              <span className="lp-n8n-label">Conversion Rate</span>
              <span className="lp-n8n-handle"></span>
            </div>
            <div className="lp-n8n-node-value">69.5%</div>
          </div>

          <div className="lp-browser-frame">
            <div className="lp-browser-header">
              <div className="lp-dot-container">
                <div className="lp-dot lp-dot-red"></div>
                <div className="lp-dot lp-dot-yellow"></div>
                <div className="lp-dot lp-dot-green"></div>
              </div>
              <div className="lp-browser-url">https://swaticrm.com/</div>
            </div>
            
            <div className="lp-browser-body">
              <div 
                className="lp-dashboard-img-wrapper"
                style={{
                  opacity: 0.5 + scrollProgress * 0.5,
                  transform: `scale(${0.96 + scrollProgress * 0.04})`,
                  transition: 'opacity 0.1s ease-out, transform 0.1s ease-out'
                }}
              >
                <img 
                  src={dashboardScreenshot} 
                  alt="SwatiCRM Workspace Dashboard" 
                  className="lp-dashboard-img"
                />
                <div 
                  className="lp-dashboard-mask"
                  style={{
                    opacity: 1 - scrollProgress
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
