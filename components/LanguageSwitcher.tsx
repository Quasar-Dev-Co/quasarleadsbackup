'use client';

import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { setLanguage } from '@/redux/features/languageSlice';
import { Switch } from '@/components/ui/switch';

export function LanguageSwitcher() {
  const dispatch = useDispatch();
  const currentLanguage = useSelector((state: RootState) => state.language.currentLanguage);

  const toggleLanguage = () => {
    const newLanguage = currentLanguage === 'en' ? 'nl' : 'en';
    dispatch(setLanguage(newLanguage));
  };

  return (
    <div className="flex items-center gap-2">
      <span>EN</span>
      <Switch
        checked={currentLanguage === 'nl'}
        onCheckedChange={toggleLanguage}
        aria-label="Toggle language"
      />
      <span>NL</span>
    </div>
  );
}