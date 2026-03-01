import React from 'react'
import { useLanguage } from '../context/LanguageContext'

export default function LanguageToggle() {
  const { language, toggleLanguage, languages } = useLanguage()

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center space-x-2 px-3 py-2 bg-white/10 backdrop-blur-sm rounded-xl hover:bg-white/20 transition-all duration-300 border border-white/20"
      title={language === 'en' ? 'Switch to Amharic' : 'ወደ እንግሊዝኛ ቀይር'}
    >
      <span className="text-lg">
        {language === 'en' ? languages.am.flag : languages.en.flag}
      </span>
      <span className="text-sm font-medium text-white">
        {language === 'en' ? 'አማርኛ' : 'English'}
      </span>
    </button>
  )
}