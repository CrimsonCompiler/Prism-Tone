/**
 * Global Continents Selection Modal — ICPC-style card grid popup.
 *
 * Displays the 7 world continents with large, recognizable geographic silhouettes,
 * pastel color accents, and key regional hubs. Confirms with 'See Continent'
 * to fly the map camera directly to the selected continent.
 */

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { usePreview } from '../state/PreviewContext'
import { CONTINENTS, CONTINENT_BY_ID } from '../data/world'
import continentPaths from '../data/continentPaths.json'

/* Geographically Accurate Continental Silhouettes */
function ContinentSilhouette({ id, color }) {
  const path = continentPaths[id]
  if (!path) return null

  return (
    <svg
      viewBox="0 0 100 100"
      className="h-28 w-28 sm:h-32 sm:w-32 md:h-36 md:w-36 transition-transform duration-300 group-hover:scale-105"
      fill={color || '#f2ede3'}
      fillOpacity="0.88"
      stroke={color || '#f2ede3'}
      strokeWidth="0.8"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={path} fillRule="evenodd" />
    </svg>
  )
}

export default function ContinentModal() {
  const { state, dispatch } = usePreview()
  const modalRef = useRef(null)

  const currentScopeId = state.scope.type === 'division' ? state.scope.id : 'asia'
  const [selectedId, setSelectedId] = useState(currentScopeId)

  /* Sync selection when modal opens */
  useEffect(() => {
    if (state.continentModalOpen) {
      setSelectedId(state.scope.type === 'division' ? state.scope.id : 'asia')
    }
  }, [state.continentModalOpen, state.scope])

  /* Escape key to dismiss */
  useEffect(() => {
    if (!state.continentModalOpen) return
    const handleKey = (e) => {
      if (e.key === 'Escape') {
        dispatch({ type: 'CONTINENT_MODAL', open: false })
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [state.continentModalOpen, dispatch])

  if (!state.continentModalOpen) return null

  const handleConfirm = () => {
    dispatch({ type: 'SET_SCOPE', scope: { type: 'division', id: selectedId } })
    dispatch({ type: 'CONTINENT_MODAL', open: false })
  }

  const selectedItem = CONTINENT_BY_ID[selectedId] || CONTINENTS[0]

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="continent-modal-title"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 md:p-8 overflow-y-auto"
      data-lenis-prevent
    >
      {/* Dark Blur Backdrop — covers entire viewport and navbar */}
      <div
        onClick={() => dispatch({ type: 'CONTINENT_MODAL', open: false })}
        className="fixed inset-0 bg-black/85 backdrop-blur-md transition-opacity cursor-pointer"
        aria-hidden="true"
      />

      {/* Modal Dialog Card (Enlarged Box, vertically centered) */}
      <div
        ref={modalRef}
        className="relative z-10 w-full max-w-6xl xl:max-w-7xl rounded-xl border border-ivory/20 bg-[#121415] shadow-2xl shadow-black/95 p-6 sm:p-8 md:p-10 flex flex-col max-h-[88vh] overflow-y-auto my-auto"
        data-lenis-prevent
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-ivory/10 pb-4 md:pb-5">
          <div>
            <span className="font-stencil text-[10px] sm:text-[11px] uppercase tracking-[0.26em] text-ember font-medium">
              Geographic Scope Selection
            </span>
            <h2
              id="continent-modal-title"
              className="mt-1 font-meno text-2xl sm:text-3xl md:text-4xl font-light text-ivory tracking-tight"
              style={{ fontFamily: '"Meno Banner", Georgia, serif' }}
            >
              Select Your Continent
            </h2>
            <p className="mt-1.5 text-[12px] sm:text-[13px] text-parchment/80 font-ui leading-relaxed">
              Pick a continent to inspect genuine NASA POWER climatological observations across all seasons.
            </p>
          </div>

          <button
            id="continent-modal-close-btn"
            type="button"
            onClick={() => dispatch({ type: 'CONTINENT_MODAL', open: false })}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-ivory/20 text-ivory/70 hover:border-ivory/60 hover:text-white hover:bg-ivory/10 transition-colors cursor-pointer text-lg shrink-0 ml-4"
            title="Close popup"
          >
            ✕
          </button>
        </div>

        {/* 7-Continent Grid (Clean Cards with Large Silhouettes) */}
        <div className="mt-6 sm:mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5 md:gap-6">
          {CONTINENTS.map((c) => {
            const isSelected = selectedId === c.id

            return (
              <button
                key={c.id}
                id={`continent-card-${c.id}`}
                type="button"
                onClick={() => setSelectedId(c.id)}
                className={`group relative flex flex-col items-center justify-between rounded-xl p-5 sm:p-6 text-center transition-all cursor-pointer border ${isSelected
                  ? 'shadow-2xl scale-[1.03] outline outline-1.5'
                  : 'border-ivory/15 bg-coal/50 hover:border-ivory/40 hover:bg-ivory/5 hover:scale-[1.01]'
                  }`}
                style={{
                  borderColor: isSelected ? c.border : undefined,
                  boxShadow: isSelected ? `0 0 28px ${c.glow}` : undefined,
                  outlineColor: isSelected ? c.border : undefined,
                  backgroundColor: isSelected ? `${c.color}18` : undefined,
                }}
              >
                {/* Prominently Scaled Continent Silhouette Shape */}
                <div className="my-2 sm:my-3 flex h-28 w-28 sm:h-32 sm:w-32 md:h-36 md:w-36 items-center justify-center">
                  <ContinentSilhouette id={c.id} color={c.color} />
                </div>

                {/* Continent Name & Regional Subtitle (No star, No dot, No temperature) */}
                <div className="mt-3 w-full">
                  <p className="font-ui text-base sm:text-lg font-semibold text-ivory tracking-wide">
                    {c.name}
                  </p>
                  <p className="mt-1 font-stencil text-[10px] sm:text-[10.5px] uppercase tracking-wider text-parchment/75 truncate">
                    {c.sampleCity}
                  </p>
                </div>
              </button>
            )
          })}
        </div>

        {/* Footer Actions */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-ivory/10 pt-5">
          <div className="flex items-center gap-2">
            <span className="font-stencil text-[10px] sm:text-[11px] uppercase tracking-wider text-parchment">Target:</span>
            <span className="font-ui text-sm sm:text-base font-semibold text-ivory">
              {selectedItem ? selectedItem.name : 'Asia'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              id="continent-modal-cancel-btn"
              type="button"
              onClick={() => dispatch({ type: 'CONTINENT_MODAL', open: false })}
              className="rounded-md border border-ivory/20 px-4 py-2.5 font-stencil text-[10px] sm:px-5 sm:text-[11px] uppercase tracking-[0.2em] text-parchment hover:border-ivory/50 hover:text-ivory transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="continent-modal-confirm-btn"
              type="button"
              onClick={handleConfirm}
              className="flex items-center gap-2 rounded-md border border-ember bg-ember/90 px-5 py-2.5 font-stencil text-[11px] sm:px-7 sm:text-[12px] uppercase tracking-[0.22em] text-[#121414] font-bold hover:bg-ember hover:shadow-lg hover:shadow-ember/30 transition-all cursor-pointer"
            >
              <span>See Continent</span>
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent
}
