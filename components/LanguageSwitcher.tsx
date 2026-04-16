import React from 'react';
import { useTranslation } from 'react-i18next';

const LANGUAGE_OPTIONS = [
  { code: 'vi', labelKey: 'language.vi' },
  { code: 'en', labelKey: 'language.en' },
] as const;

type LanguageSwitcherProps = {
  compact?: boolean;
};

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ compact = false }) => {
  const { t, i18n } = useTranslation('common');
  const currentLanguage = i18n.resolvedLanguage === 'en' ? 'en' : 'vi';

  return (
    <div className={`flex items-center ${compact ? 'gap-2' : 'justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2'}`}>
      {!compact && <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{t('language.label')}</span>}
      <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
        {LANGUAGE_OPTIONS.map((option) => {
          const isActive = currentLanguage === option.code;

          return (
            <button
              key={option.code}
              type="button"
              onClick={() => void i18n.changeLanguage(option.code)}
              className={`rounded-md px-2.5 py-1 text-xs font-bold transition-colors ${isActive ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}
              aria-pressed={isActive}
            >
              {t(option.labelKey)}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default LanguageSwitcher;
