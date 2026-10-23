/**
 * Country Search Bar with Type + Voice Search capabilities.
 *
 * Allows users to search for any country worldwide either by typing
 * or speaking into the microphone via Web Speech API.
 * Selecting or recognizing a country automatically pans & zooms the map
 * to that country's exact boundaries with custom spotlight highlighting.
 */

import { useState, useRef, useEffect } from 'react'
import { usePreview } from '../state/PreviewContext'
import { searchCountries, findCountry } from '../lib/countries'

export default function CountrySearchBar() {
  const { dispatch, state } = usePreview()
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [voiceNotice, setVoiceNotice] = useState(null)
  const [selectedIndex, setSelectedIndex] = useState(-1)

  const inputRef = useRef(null)
  const containerRef = useRef(null)
  const recognitionRef = useRef(null)

  // Initialize SpeechRecognition if supported
  useEffect(() => {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition
    if (SpeechRec) {
      const rec = new SpeechRec()
      rec.continuous = false
      rec.interimResults = false
      rec.lang = 'en-US'

      rec.onstart = () => {
        setIsListening(true)
        setVoiceNotice('Listening... Speak a country name')
      }

      rec.onresult = (event) => {
        setIsListening(false)
        if (event.results && event.results[0] && event.results[0][0]) {
          const spokenText = event.results[0][0].transcript.trim()
          setQuery(spokenText)
          handleSelectCountry(spokenText)
        }
      }

      rec.onerror = (e) => {
        setIsListening(false)
        if (e.error === 'not-allowed') {
          setVoiceNotice('Microphone access denied')
        } else if (e.error === 'no-speech') {
          setVoiceNotice('No speech detected')
        } else {
          setVoiceNotice('Voice search error')
        }
        setTimeout(() => setVoiceNotice(null), 3000)
      }

      rec.onend = () => {
        setIsListening(false)
        setTimeout(() => setVoiceNotice(null), 2500)
      }

      recognitionRef.current = rec
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort()
        } catch (_) { }
      }
    }
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Sync suggestions when query changes
  const handleInputChange = (e) => {
    const val = e.target.value
    setQuery(val)
    setSelectedIndex(-1)
    if (val.trim()) {
      const results = searchCountries(val, 6)
      setSuggestions(results)
      setIsOpen(true)
    } else {
      setSuggestions([])
      setIsOpen(false)
    }
  }

  const handleSelectCountry = (target) => {
    const country = typeof target === 'string' ? findCountry(target) : target
    if (country) {
      setQuery(country.name)
      setIsOpen(false)
      dispatch({ type: 'FOCUS_COUNTRY', country })
    } else if (typeof target === 'string') {
      const results = searchCountries(target, 6)
      setSuggestions(results)
      setIsOpen(true)
      setVoiceNotice(`"${target}" not found. Try another country.`)
      setTimeout(() => setVoiceNotice(null), 3500)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (suggestions.length > 0) {
        setSelectedIndex((prev) => (prev + 1) % suggestions.length)
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (suggestions.length > 0) {
        setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length)
      }
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        handleSelectCountry(suggestions[selectedIndex])
      } else if (query.trim()) {
        handleSelectCountry(query)
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  const toggleVoiceSearch = () => {
    if (!recognitionRef.current) {
      setVoiceNotice('Voice recognition not supported in this browser')
      setTimeout(() => setVoiceNotice(null), 3500)
      return
    }

    if (isListening) {
      try {
        recognitionRef.current.stop()
      } catch (_) { }
      setIsListening(false)
    } else {
      try {
        setVoiceNotice('Listening... Speak a country name')
        recognitionRef.current.start()
      } catch (err) {
        console.warn('Voice start failed:', err)
      }
    }
  }

  const clearSearch = () => {
    setQuery('')
    setSuggestions([])
    setIsOpen(false)
    dispatch({ type: 'CLEAR_FOCUSED_COUNTRY' })
    if (inputRef.current) inputRef.current.focus()
  }

  return (
    <div ref={containerRef} className="relative z-50 flex items-center">
      {/* Search Input Box */}
      <div
        className={`group flex items-center rounded border bg-[#141617] px-3 py-1.5 transition-all duration-200 shadow-md ${isListening
          ? 'border-ember shadow-[0_0_12px_rgba(212,165,91,0.35)] ring-1 ring-ember/60'
          : isOpen
            ? 'border-ivory/60 shadow-lg'
            : 'border-ivory/25 hover:border-ivory/50'
          }`}
      >
        {/* Search Icon */}
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mr-2 text-ivory/60 group-hover:text-ivory transition-colors shrink-0"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>

        {/* Text Input */}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (query.trim() && suggestions.length > 0) setIsOpen(true)
          }}
          placeholder={isListening ? 'Listening for country name...' : 'Search country (e.g. Chile, Japan)...'}
          className="w-40 sm:w-52 md:w-64 bg-transparent font-ui text-[12.5px] text-ivory placeholder:text-cream/40 focus:outline-none tracking-normal"
          aria-label="Search country by name or voice"
        />

        {/* Clear Button (when text exists) */}
        {query && (
          <button
            type="button"
            onClick={clearSearch}
            className="mr-1 text-ivory/40 hover:text-white transition-colors cursor-pointer p-0.5"
            title="Clear search"
            aria-label="Clear country search"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}

        {/* Microphone Voice Button */}
        <button
          type="button"
          onClick={toggleVoiceSearch}
          className={`flex items-center justify-center rounded p-1 transition-all duration-200 cursor-pointer shrink-0 ${isListening
            ? 'bg-ember text-black shadow-[0_0_8px_#d4a55b] animate-pulse'
            : 'text-ivory/70 hover:text-white hover:bg-white/10'
            }`}
          title={isListening ? 'Listening... click to stop' : 'Search by Voice (Click and speak country name)'}
          aria-label={isListening ? 'Stop voice search' : 'Start voice search'}
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        </button>
      </div>

      {/* Voice notice / status popup toast */}
      {voiceNotice && (
        <div
          role="status"
          className="absolute top-full left-0 mt-1.5 flex items-center gap-2 rounded border border-ember/50 bg-black/95 px-3 py-1.5 font-stencil text-[10.5px] uppercase tracking-wider text-ember shadow-2xl backdrop-blur-md animate-fade-in whitespace-nowrap z-50"
        >
          <span className="h-2 w-2 rounded-full bg-ember animate-ping" />
          <span>{voiceNotice}</span>
        </div>
      )}

      {/* Suggestions Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <ul
          role="listbox"
          className="absolute top-full left-0 right-0 mt-1.5 max-h-64 overflow-y-auto rounded border border-ivory/30 bg-[#141617] shadow-[0_12px_36px_rgba(0,0,0,0.98)] z-50 divide-y divide-white/5 py-1"
        >
          {suggestions.map((country, idx) => {
            const isSelected = idx === selectedIndex
            return (
              <li
                key={country.name + country.iso3}
                role="option"
                aria-selected={isSelected}
                onMouseDown={() => handleSelectCountry(country)}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`flex items-center justify-between px-3.5 py-2 cursor-pointer transition-colors ${isSelected ? 'bg-white/15 text-white' : 'text-cream/90 hover:bg-white/10 hover:text-white'
                  }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-ui text-[13px] font-medium text-white">{country.name}</span>
                  {country.iso2 && (
                    <span className="font-stencil text-[9px] uppercase tracking-wider text-parchment/60">
                      {country.iso2}
                    </span>
                  )}
                </div>
                <span className="font-stencil text-[9.5px] uppercase tracking-[0.16em] text-beige/70">
                  {country.continent}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
