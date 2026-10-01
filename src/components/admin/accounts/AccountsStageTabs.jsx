import React, { useRef } from 'react'
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa'

const SCROLL_STEP = 240

const AccountsStageTabs = ({ stages, activeStage, countsByStage, onChange }) => {
  const scrollRef = useRef(null)

  const scroll = (direction) => {
    if (!scrollRef.current) return
    scrollRef.current.scrollBy({ left: direction * SCROLL_STEP, behavior: 'smooth' })
  }

  return (
    <div className="admin-accounts-stage-tabs-wrapper">
      <button
        type="button"
        className="admin-accounts-stage-arrow admin-accounts-stage-arrow--left"
        onClick={() => scroll(-1)}
        aria-label="Scroll tabs left"
      >
        <FaChevronLeft />
      </button>

      <div
        ref={scrollRef}
        className="admin-accounts-stage-tabs"
        role="tablist"
        aria-label="Account stages"
      >
        {stages.map((stage) => {
          const isActive = stage.key === activeStage
          return (
            <button
              key={stage.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`admin-accounts-stage-tab ${isActive ? 'admin-accounts-stage-tab-active' : ''}`}
              onClick={() => onChange(stage.key)}
            >
              <span className="admin-accounts-stage-tab-label">{stage.label}</span>
            </button>
          )
        })}
      </div>

      <button
        type="button"
        className="admin-accounts-stage-arrow admin-accounts-stage-arrow--right"
        onClick={() => scroll(1)}
        aria-label="Scroll tabs right"
      >
        <FaChevronRight />
      </button>
    </div>
  )
}

export default AccountsStageTabs
