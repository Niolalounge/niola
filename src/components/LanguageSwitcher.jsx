import { useLanguage } from '../hooks/useLanguage'

export default function LanguageSwitcher({ className = '' }) {
  const { copy, language, toggleLanguage } = useLanguage()

  return (
    <button
      type="button"
      className={`language-switcher ${className}`.trim()}
      onClick={toggleLanguage}
      aria-label={
        language === 'ar'
          ? copy.a11y.switchToEnglish
          : copy.a11y.switchToArabic
      }
    >
      <span>{copy.languageSwitcher.shortLabel}</span>
    </button>
  )
}
