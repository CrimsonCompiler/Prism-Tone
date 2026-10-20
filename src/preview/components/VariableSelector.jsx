/**
 * Variable Selector — Interactive Accordion with Multi-Select Side Popup.
 *
 * Allows users to inspect and toggle between all 6 environmental variables
 * (Temperature, Rainfall, Wind, Fire activity, Water storage, Vegetation).
 * Supports multi-selection via checkboxes, hover/click flyout popup,
 * and seamless switching between live NASA POWER datasets.
 */

import { useState, useRef, useEffect } from 'react'
import { VARIABLES, VARIABLE_BY_ID } from '../data/datasets'
import { usePreview } from '../state/PreviewContext'

export default function VariableSelector() {
  const { state, dispatch } = usePreview()
  const [isHovered, setIsHovered] = useState(false)
  const [isPinned, setIsPinned] = useState(false)
  const hoverTimeoutRef = useRef(null)
  const containerRef = useRef(null)

  const selectedIds = state.selectedVariableIds || [state.variableId]
  const isOpen = isHovered || isPinned

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    setIsHovered(true)
  }

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false)
    }, 220)
  }

  // Click outside to unpin
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsPinned(false)
        setIsHovered(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  const handleToggleOption = (vId) => {
    dispatch({ type: 'TOGGLE_VARIABLE', id: vId })
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Accordion Header Button (clean without 01 number and without badge) */}
      <button
        type="button"
        id="environmental-variable-accordion-btn"
        onClick={() => setIsPinned((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className="w-full flex items-center justify-between text-left group cursor-pointer select-none py-1"
      >
        <div className="flex items-center gap-2.5">
          {/* Animated chevron arrow */}
          <span
            className={`flex h-4 w-4 items-center justify-center font-bold text-sm transition-transform duration-200 ${isOpen ? 'rotate-90 text-white' : 'text-zinc-400 group-hover:text-white group-hover:translate-x-0.5'
              }`}
            aria-hidden="true"
          >
            ›
          </span>
          <p className="font-stencil text-[12px] md:text-[13px] uppercase tracking-[0.24em] text-white font-medium group-hover:text-zinc-200 transition-colors">
            Environmental variable
          </p>
        </div>
      </button>

      {/* Accordion Body: Active Chips View (without + Options button) */}
      <div className="mt-3">
        <div className="flex flex-wrap gap-2">
          {selectedIds.map((id) => {
            const v = VARIABLE_BY_ID[id] || VARIABLES[0]
            const isPrimary = state.variableId === id
            const isLive = v.status === 'live'

            return (
              <button
                key={id}
                type="button"
                onClick={() => isLive && dispatch({ type: 'SET_VARIABLE', id })}
                className={`flex items-center gap-2 rounded px-3 py-1.5 text-left text-xs transition-all cursor-pointer border ${isPrimary
                  ? 'border-white/70 bg-white/[0.12] text-white font-medium shadow-sm shadow-white/5'
                  : 'border-white/[0.12] bg-white/[0.03] text-zinc-300 hover:border-white/40 hover:bg-white/[0.08] hover:text-white font-normal'
                  }`}
                title={isLive ? `Focus ${v.name} on map` : 'Planned variable'}
              >
                <span className="font-ui font-medium text-[13.5px] text-white">{v.name}</span>
                <span className="font-stencil text-[10px] uppercase tracking-wider text-zinc-300 font-normal">
                  {v.unit}
                </span>
              </button>
            )
          })}
        </div>

        {/* Instruction line with clean, legible text color */}
        <p className="mt-3 text-[13.5px] sm:text-[14px] text-zinc-400 font-ui font-normal leading-normal">
          Hover or click above to open multi-select variables popup.
        </p>
      </div>

      {/* Side Flyout / Popup Menu */}
      {isOpen && (
        <div
          role="listbox"
          aria-multiselectable="true"
          aria-label="Select multiple environmental variables"
          className="absolute z-50 lg:right-full lg:top-0 lg:mr-3.5 right-0 top-full mt-2 w-84 sm:w-96 rounded-xl border border-white/20 bg-[#16171a]/98 backdrop-blur-xl shadow-2xl shadow-black/90 p-4 sm:p-5 transition-all"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* Popup Header */}
          <div className="flex items-center justify-between border-b border-white/15 pb-3">
            <div>
              <p className="font-stencil text-[11px] sm:text-[12px] uppercase tracking-[0.24em] text-zinc-200 font-medium">
                Variable Selection
              </p>
              <p className="mt-0.5 font-ui text-[13.5px] sm:text-[14.5px] text-zinc-300 font-normal">
                Choose one or more variables ({selectedIds.length}/6)
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsPinned(false)
                setIsHovered(false)
              }}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-white/20 text-zinc-300 hover:border-white/60 hover:text-white hover:bg-white/10 transition-colors text-sm cursor-pointer ml-3"
              title="Close options"
            >
              ✕
            </button>
          </div>

          {/* 6 Selectable Items with Checkboxes — Clean Single-Row without 1, 2, 3... numbers */}
          <div className="mt-3.5 flex flex-col gap-2 max-h-[380px] overflow-y-auto pr-0.5">
            {VARIABLES.map((v) => {
              const isChecked = selectedIds.includes(v.id)
              const isLive = v.status === 'live'
              const isPrimary = state.variableId === v.id

              return (
                <div
                  key={v.id}
                  onClick={() => handleToggleOption(v.id)}
                  role="option"
                  aria-selected={isChecked}
                  className={`group flex items-center justify-between rounded-lg p-3 sm:p-3.5 transition-all cursor-pointer border select-none ${isChecked
                    ? 'border-white/50 bg-white/[0.10] shadow-sm'
                    : 'border-white/10 bg-coal/30 hover:border-white/30 hover:bg-white/5'
                    }`}
                >
                  {/* Left Side: Checkbox + Name (+ Focus badge) */}
                  <div className="flex items-center gap-3 min-w-0 pr-3">
                    {/* Custom Checkbox */}
                    <div
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${isChecked
                        ? 'border-white bg-white text-black font-semibold'
                        : 'border-white/30 bg-black/40 group-hover:border-white/60'
                        }`}
                    >
                      {isChecked && (
                        <svg
                          className="h-3.5 w-3.5 stroke-current stroke-[2.8]"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>

                    {/* Name */}
                    <div className="flex items-center gap-2 min-w-0">
                      <p className={`font-ui text-[14.5px] sm:text-[15.5px] truncate ${isChecked ? 'text-white font-medium' : 'text-zinc-300 font-normal'
                        }`}>
                        {v.name}
                      </p>
                      {isPrimary && (
                        <span className="rounded border border-white/25 bg-white/15 px-1.5 py-0.5 text-[9px] font-stencil uppercase tracking-wider text-white font-normal shrink-0">
                          Focus
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right Side: Unit / Cadence text */}
                  <div className="shrink-0 text-right">
                    <span className="font-stencil text-[10.5px] sm:text-[11.5px] uppercase tracking-wider text-zinc-400 font-normal">
                      {isLive ? `${v.unit} · ${v.cadence}` : 'Planned'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Unavailable details note if user clicked an unavailable variable */}
      <UnavailableNote />
    </div>
  )
}

function UnavailableNote() {
  const { state } = usePreview()
  const shown = VARIABLES.find((v) => v.id === (state.unavailableNoticeId || state.variableId))
  if (!shown || shown.status !== 'unavailable') return null
  return (
    <div className="mt-2.5 border border-white/15 bg-coal/50 px-3.5 py-2.5 rounded text-left" role="note">
      <p className="font-stencil text-[10px] uppercase tracking-[0.2em] text-zinc-200 font-medium">
        {shown.name} · Planned Integration
      </p>
      <p className="mt-1 font-ui text-[12px] leading-relaxed text-zinc-300 font-normal">
        {shown.unavailableReason}
      </p>
    </div>
  )
}
