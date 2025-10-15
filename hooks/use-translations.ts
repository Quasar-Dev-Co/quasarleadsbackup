import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';

export function useTranslations() {
  const { currentLanguage, translations } = useSelector((state: RootState) => state.language);

  const t = (key: keyof typeof translations.en) => {
    return translations[currentLanguage][key] || key;
  };

  return { t, currentLanguage };
}