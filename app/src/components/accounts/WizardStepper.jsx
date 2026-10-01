import React from 'react'

const WizardStepper = ({
  steps,
  currentStep,
  onStepChange,
  className = '',
}) => (
  <div
    className={[
      'wizard-stepper rounded-[28px] bg-[rgba(255,251,244,0.92)] px-4 py-4 shadow-[var(--shadow-sm)] backdrop-blur-sm sm:px-5',
      className,
    ].join(' ').trim()}
  >
    <div className="wizard-stepper__track flex items-start gap-3 sm:gap-4">
      {steps.map((step, index) => {
        const isActive = index === currentStep
        const isComplete = index < currentStep

        return (
          <React.Fragment key={step.id}>
            <button
              type="button"
              onClick={() => onStepChange(index)}
              aria-current={isActive ? 'step' : undefined}
              className={[
                'wizard-stepper__step flex min-w-0 flex-1 items-start gap-3 rounded-[20px] px-1 py-1 text-left transition duration-200 ease-out hover:bg-[rgba(255,255,255,0.55)]',
                isActive ? 'wizard-stepper__step--active' : '',
                isComplete ? 'wizard-stepper__step--complete' : '',
              ].filter(Boolean).join(' ')}
            >
              <span
                className={[
                  'wizard-stepper__index flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[13px] font-bold leading-none transition',
                  isActive || isComplete
                    ? 'bg-[var(--color-primary)] text-white shadow-sm'
                    : 'bg-[var(--surface-raised)] text-[var(--text-secondary)] shadow-sm ring-1 ring-[var(--border-default)]',
                ].join(' ')}
              >
                {index + 1}
              </span>
              <span className="wizard-stepper__content flex min-w-0 flex-col leading-none">
                <span className="wizard-stepper__kicker block text-[9px] uppercase tracking-[0.24em] text-[var(--text-muted)] sm:text-[10px]">
                  Step {index + 1}
                </span>
                <span
                  className={[
                    'wizard-stepper__label mt-[5px] block break-words text-[14px] font-semibold leading-[1.1] sm:text-[16px] lg:text-[17px]',
                    isActive || isComplete ? 'text-[var(--color-primary)]' : 'text-[var(--text-secondary)]',
                  ].join(' ')}
                >
                  {step.label}
                </span>
              </span>
            </button>

            {index < steps.length - 1 ? (
              <div className="wizard-stepper__divider mt-5 h-px flex-1 bg-[var(--border-default)]" />
            ) : null}
          </React.Fragment>
        )
      })}
    </div>
  </div>
)

export default WizardStepper
