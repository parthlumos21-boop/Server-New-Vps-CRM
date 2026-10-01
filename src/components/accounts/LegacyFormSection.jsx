import React from 'react'

const LegacyFormSection = ({
  title,
  subtitle,
  children,
  className = '',
  headerClassName = '',
  bodyClassName = '',
  titleClassName = '',
  subtitleClassName = '',
}) => (
  <section className={`rounded-none bg-transparent px-0 py-0 shadow-none animate-slide-up ${className}`.trim()}>
    <div className={`pb-3 ${headerClassName}`.trim()}>
      <h2 className={`text-[18px] font-semibold tracking-[-0.02em] text-[var(--text-primary)] sm:text-[20px] ${titleClassName}`.trim()}>
        {title}
      </h2>
      {subtitle ? (
        <p className={`mt-1.5 text-[12px] leading-relaxed text-slate-500 ${subtitleClassName}`.trim()}>
          {subtitle}
        </p>
      ) : null}
    </div>
    <div className={bodyClassName}>{children}</div>
  </section>
)

export default LegacyFormSection
