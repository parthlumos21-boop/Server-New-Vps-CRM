import React, { useRef, useState, useEffect } from 'react';

export default function Customer360() {
  const treeNodes = ['Customer Profile', 'Account Details', 'Projects', 'Deals', 'Quotations', 'Orders', 'Support History'];
  const trackRef = useRef(null);
  const [pause, setPause] = useState(false);
  const hoverTimeout = useRef(null);
  const leaveTimeout = useRef(null);

  // Pause animation after a short delay when hovering a node
  const handleHover = (index) => {
    if (leaveTimeout.current) {
      clearTimeout(leaveTimeout.current);
      leaveTimeout.current = null;
    }
    hoverTimeout.current = setTimeout(() => {
      setPause(true);
    }, 300); // 300ms delay before pausing
  };

  // Resume animation after a short delay when leaving a node
  const handleLeave = () => {
    if (hoverTimeout.current) {
      clearTimeout(hoverTimeout.current);
      hoverTimeout.current = null;
    }
    leaveTimeout.current = setTimeout(() => {
      setPause(false);
    }, 200); // 200ms delay before resuming
  };

  // Ensure animation resumes when leaving the whole marquee container
  const handleLeaveContainer = () => {
    if (hoverTimeout.current) {
      clearTimeout(hoverTimeout.current);
      hoverTimeout.current = null;
    }
    if (leaveTimeout.current) {
      clearTimeout(leaveTimeout.current);
      leaveTimeout.current = null;
    }
    setPause(false);
  };

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    track.style.animationPlayState = pause ? 'paused' : 'running';
  }, [pause]);

  return (
    <section className="lp-section lp-section-alt" id="solutions">
      <div className="lp-container">
        <div className="lp-section-header">
          <div className="lp-badge">360° Intelligence</div>
          <h2 className="lp-heading-2">Know Your Customers. Understand Your Business.</h2>
          <p className="lp-subheading">
            Connect disparate interactions into a single comprehensive view of every client account.
          </p>
        </div>

        {/* Velocity Scroll Left-to-Right Moving Marquee */}
        <div className="lp-marquee-container" onMouseLeave={handleLeaveContainer}>
          <div className="lp-marquee-track-ltr-velocity" ref={trackRef}>
            {[...treeNodes, ...treeNodes, ...treeNodes, ...treeNodes].map((node, i) => (
              <React.Fragment key={i}>
                <div className="lp-tree-node" onMouseEnter={() => handleHover(i)} onMouseLeave={handleLeave}>
                  {node}
                </div>
                <span className="lp-tree-arrow">➔</span>
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
