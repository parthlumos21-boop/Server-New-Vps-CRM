import React from 'react';
import LandingNavbar from '../../components/landing/LandingNavbar';
import LandingHero from '../../components/landing/LandingHero';
import Customer360 from '../../components/landing/Customer360';
import RealtimeNotifications from '../../components/landing/RealtimeNotifications';
import SecuritySection from '../../components/landing/SecuritySection';
import CtaSection from '../../components/landing/CtaSection';
import LandingFooter from '../../components/landing/LandingFooter';

import '../../styles/landing.css';

export default function LandingPage() {
  return (
    <div className="landing-page">
      <LandingNavbar />
      <main>
        <LandingHero />
        <Customer360 />
        <RealtimeNotifications />
        <SecuritySection />
        <CtaSection />
      </main>
      <LandingFooter />
    </div>
  );
}
