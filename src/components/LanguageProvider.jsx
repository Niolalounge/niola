import { useEffect, useMemo, useState } from 'react'
import translations, {
  defaultLanguage,
  languageMeta,
  supportedLanguages,
} from '../data/translations'
import { LanguageContext } from '../context/LanguageContext'

const STORAGE_KEY = 'niola-language'

function getStoredLanguage() {
  if (typeof window === 'undefined') return defaultLanguage

  try {
    const storedLanguage = window.localStorage.getItem(STORAGE_KEY)
    return supportedLanguages.includes(storedLanguage)
      ? storedLanguage
      : defaultLanguage
  } catch {
    return defaultLanguage
  }
}

function getNestedValue(object, path) {
  return path.split('.').reduce((value, key) => value?.[key], object)
}

export default function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(getStoredLanguage)
  const meta = languageMeta[language]

  useEffect(() => {
    const root = document.documentElement
    root.lang = language
    root.dir = meta.dir
    root.dataset.language = language

    try {
      window.localStorage.setItem(STORAGE_KEY, language)
    } catch {
      // The interface still works when storage is unavailable.
    }
  }, [language, meta.dir])

  const value = useMemo(() => {
    const copy = translations[language]

    return {
      language,
      direction: meta.dir,
      locale: meta.locale,
      copy,
      t: (key) => getNestedValue(copy, key) ?? key,
      setLanguage,
      toggleLanguage: () => setLanguage((current) => (current === 'ar' ? 'en' : 'ar')),
    }
  }, [language, meta.dir, meta.locale])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}
