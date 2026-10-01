import React from 'react'
import { FaCheck } from 'react-icons/fa'

const WizardStepper = ({
  steps = [],
  currentStep = 0,
  onStepChange,
  className = '',
}) => {
  const progressPercent = Math.min(
    100,
    Math.max(0, ((currentStep + 0.5) / steps.length) * 100)
  )

  return (
    <div
      className={[
        'wizard-stepper relative overflow-hidden rounded-[14px] bg-white p-3 sm:p-4 border border-[var(--border-subtle)] shadow-[0_2px_10px_rgba(0,0,0,0.03)] backdrop-blur-md transition-all duration-300',
        className,
      ].join(' ').trim()}
    >
      {/* Background Progress Track */}
      <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-slate-100">
        <div
          className="h-full bg-[#c60016] transition-all duration-500 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="wizard-stepper__track grid grid-cols-1 sm:grid-cols-3 gap-3 relative z-10">
        {steps.map((step, index) => {
          const isActive = index === currentStep
          const isComplete = index < currentStep

          return (
            <button
              key={step.id || `step-${index}`}
              type="button"
              onClick={() => onStepChange && onStepChange(index)}
              aria-current={isActive ? 'step' : undefined}
              className={[
                'wizard-stepper__step group relative flex items-center min-w-0 w-full gap-3 rounded-[10px] p-2.5 text-left transition-all duration-200 ease-out cursor-pointer',
                isActive
                  ? 'wizard-stepper__step--active bg-red-50/50 border border-[#c60016]/30 shadow-sm'
                  : isComplete
                    ? 'wizard-stepper__step--complete bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    : 'bg-slate-50/60 border border-slate-200/80 hover:bg-white hover:border-slate-300',
              ].join(' ')}
            >
              {/* Step Index Badge / Checkmark Icon */}
              <span
                className={[
                  'wizard-stepper__index flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-extrabold leading-none transition-all duration-200 shadow-sm',
                  isComplete
                    ? 'bg-[#c60016] text-white'
                    : isActive
                      ? 'bg-[#c60016] text-white ring-2 ring-[#c60016]/20'
                      : 'bg-white text-slate-600 border border-slate-200 group-hover:border-slate-300',
                ].join(' ')}
              >
                {isComplete ? (
                  <FaCheck className="text-[11px]" />
                ) : (
                  index + 1
                )}
              </span>

              {/* Step Content Labels */}
              <span className="wizard-stepper__content flex min-w-0 flex-col leading-snug">
                <span className="wizard-stepper__kicker block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                  Step {index + 1}
                </span>
                <span
                  className={[
                    'wizard-stepper__label mt-0.5 block break-words text-[13px] font-extrabold leading-tight transition-colors duration-200',
                    isActive
                      ? 'text-[#c60016]'
                      : isComplete
                        ? 'text-slate-900'
                        : 'text-slate-600',
                  ].join(' ')}
                >
                  {step.label}
                </span>
              </span>

              {/* Active Step Indicator Pill */}
              {isActive ? (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#c60016]" />
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default WizardStepper
