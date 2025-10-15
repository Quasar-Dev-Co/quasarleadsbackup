import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';

export const useLanguage = () => {
  // @ts-ignore
  const language = useSelector((state: RootState) => state.language.language);
  const translations = useSelector((state: RootState) => state.language.translations);

  const t = (key: string): string | string[] => {
    // @ts-ignore
    return translations[language][key] || key;
  };

  return { t, language };
}; 