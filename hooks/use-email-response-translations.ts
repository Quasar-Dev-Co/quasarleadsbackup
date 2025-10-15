import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';

export const useEmailResponseTranslations = () => {
  const { currentLanguage } = useSelector((state: RootState) => state.language);
  const { translations } = useSelector((state: RootState) => state.emailResponse);
  
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