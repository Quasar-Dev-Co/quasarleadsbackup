import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';

export const useEmailPromptingTranslations = () => {
  const { currentLanguage } = useSelector((state: RootState) => state.language);
  const { translations } = useSelector((state: RootState) => state.emailPrompting);
  
  const t = (key: string): string => {
    const translation = translations[currentLanguage][key];
    if (!translation) {
      console.warn(`Translation key "${key}" not found for language "${currentLanguage}"`);
      return key;
    }
    return translation;
  };

  return {
    t,
    currentLanguage,
  };
}; 