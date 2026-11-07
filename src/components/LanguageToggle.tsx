import React from 'react'
import { useTranslation } from 'react-i18next'
import { Languages } from 'lucide-react'

interface LanguageToggleProps {
  className?: string
  compact?: boolean
}

export const LanguageToggle: React.FC<LanguageToggleProps> = ({
  className = '',
  compact = false,
}) => {
  const { i18n } = useTranslation()
  const currentLang = i18n.language.startsWith('hi') ? 'hi' : 'en'

  const toggleLanguage = () => {
    const nextLang = currentLang === 'en' ? 'hi' : 'en'
    i18n.changeLanguage(nextLang)
    try {
      localStorage.setItem('mednet_language', nextLang)
    } catch {
      // Ignore
    }
  }

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      aria-label="Toggle language between English and Hindi"
      title={`Switch to ${currentLang === 'en' ? 'हिन्दी (Hindi)' : 'English'}`}
      className={`h-10 px-3 rounded-2xl flex items-center justify-center gap-1.5 border transition-all duration-200 text-xs font-black shadow-xs bg-slate-50 dark:bg-slate-800 border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 ${className}`}
    >
      <Languages className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
      <span className="font-extrabold uppercase">
        {compact ? (currentLang === 'en' ? 'EN' : 'HI') : (currentLang === 'en' ? 'English' : 'हिन्दी')}
      </span>
    </button>
  )
}
