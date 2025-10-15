# Language Switching in QuasarLeads

This application supports both English (EN) and Dutch (NL) languages using Redux Toolkit for state management.

## Usage

1. Import the LanguageSwitcher component:
```tsx
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
```

2. Use translations in your components:
```tsx
import { useTranslations } from '@/hooks/use-translations';

export function YourComponent() {
  const { t } = useTranslations();
  return <h1>{t('welcome')}</h1>;
}
```

## Available Translations

The following keys are available for translation:
- welcome
- settings
- leads
- booking
- emailPrompting

## Adding New Translations

To add new translations, update the translations object in `redux/features/languageSlice.ts`:

```typescript
translations: {
  en: {
    // Add English translations
  },
  nl: {
    // Add Dutch translations
  }
}
```