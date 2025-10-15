import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type LanguageCode = 'en' | 'nl';

export type EmailPromptingTranslations = Record<string, string>;

interface EmailPromptingLanguageState {
  translations: {
    en: EmailPromptingTranslations;
    nl: EmailPromptingTranslations;
  };
}

const initialState: EmailPromptingLanguageState = {
  translations: {
    en: {
      // Page header
      emailTemplateManager: 'Email Template Manager',
      emailTemplateManagerDescription: 'Create, customize, and manage automated email templates for your CRM system',
      refresh: 'Refresh',
      saveTemplate: 'Save Template',
      saving: 'Saving...',
      
      // Company Settings
      companySettings: 'Company Settings',
      companyName: 'Company Name',
      companyNamePlaceholder: 'Your company name',
      mainService: 'Main Service',
      mainServicePlaceholder: 'e.g. Web development',
      targetIndustry: 'Target Industry',
      targetIndustryPlaceholder: 'e.g. E-commerce',
      senderName: 'Sender Name',
      senderNamePlaceholder: 'Your name',
      senderEmail: 'Sender Email',
      senderEmailPlaceholder: 'your@email.com',
      websiteURL: 'Website URL',
      websiteURLPlaceholder: 'https://yoursite.com',
      saveSettings: 'Save Settings',
      savingSettings: 'Saving...',
      
      // Email Timing
      emailTiming: 'Email Timing',
      configureEmailTiming: 'Configure when emails are sent',
      configure: 'Configure',
      hide: 'Hide',
      emailScheduleConfiguration: 'Email Schedule Configuration',
      resetToDefault: 'Reset to Default',
      waitTime: 'Wait Time',
      timeUnit: 'Time Unit',
      minutes: 'Minutes',
      hours: 'Hours',
      days: 'Days',
      firstEmail: 'First Email',
      startingPoint: 'Starting point of email sequence',
      followsPreviousEmail: 'Follows previous email by {delay} {unit}',
      saveChanges: 'Save Changes',
      unsaved: 'Unsaved',
      emailTimingSettingsSaved: 'Email Timing Settings Saved',
      emailTimingSettingsSavedSuccess: '📧 Email timing settings saved successfully!',
      failedToSaveSettings: 'Failed to save settings. Please try again.',
      
      // Development Testing
      developmentTesting: 'Development Testing',
      devTestingDescription: 'Test email automation with minute-by-minute sending for development',
      disabled: 'DISABLED (Caused Fast Emails)',
      showScriptCommand: 'Show Script Command',
      devEmailAutomationDisabled: '🚨 DEV Email Automation DISABLED - This was causing timing conflicts! Use the production system instead.',
      runScriptCommand: '📧 Run: node scripts/dev-email-automation.js',
      
      // Template Variables
      availableVariables: 'Available Variables',
      leadNameVar: "Lead's first name",
      companyNameVar: "Lead's company name",
      senderNameDesc: 'Your name',
      senderEmailDesc: 'Your email address',
      companyService: "Your company's main service",
      targetIndustryDesc: 'Target industry',
      websiteURLDesc: 'Your website URL',
      
      // Test Email
      testEmail: 'Test Email',
      testEmailPlaceholder: 'test@example.com',
      testName: 'Test Name*',
      testCompany: 'Test Company*',
      sendTest: 'Send Test',
      sending: 'Sending...',
      
      // Validation
      validationStatus: 'Validation Status',
      validationCompanyName: 'Company Name',
      validationMainService: 'Main Service',
      validationSenderName: 'Sender Name',
      validationSenderEmail: 'Sender Email',
      validationWebsiteURL: 'Website URL',
      
      // Template Editor
      emailTemplates: 'Email Templates',
      showPreview: 'Show Preview',
      hidePreview: 'Hide Preview',
      quickGenerate: 'Quick Generate',
      generating: 'Generating...',
      customAI: 'Custom AI',
      emailSubject: 'Email Subject',
      emailSubjectPlaceholder: 'Enter email subject...',
      active: 'Active',
      htmlContent: 'HTML Content',
      htmlContentPlaceholder: 'Enter HTML email content...',
      plainTextContent: 'Plain Text Content',
      plainTextRecommended: '(recommended)',
      plainTextPlaceholder: 'Enter plain text version...',
      emailPreview: 'Email Preview',
      plainTextPreview: 'Plain Text Preview',
      copyHTML: 'Copy HTML',
      htmlCopiedToClipboard: 'HTML copied to clipboard',
      
      // Pipeline Stages
      firstCallEmail: 'First Call Email',
      firstCallDescription: 'Initial outreach email after first contact attempt',
      secondFollowUp: 'Second Follow-up',
      secondFollowUpDescription: 'Follow-up email after second contact attempt',
      thirdFollowUp: 'Third Follow-up',
      thirdFollowUpDescription: 'Question-based email after third contact attempt',
      fourthFollowUp: 'Fourth Follow-up',
      fourthFollowUpDescription: 'Case study and social proof email',
      fifthFollowUp: 'Fifth Follow-up',
      fifthFollowUpDescription: 'Priority check and feedback request email',
      sixthFollowUp: 'Sixth Follow-up',
      sixthFollowUpDescription: 'Value-add resource email before final outreach',
      finalEmail: 'Final Email',
      finalEmailDescription: 'Humorous breakup email - last contact attempt',
      
      // Template Status
      templateStatusOverview: 'Template Status Overview',
      updated: 'Updated',
      thisIsFirstEmail: 'This is the first email in the sequence',
      emailWillBeSent: 'This email will be sent {delay} {unit} after the previous email',
      
      // AI Generation Modal
      customAIEmailGenerator: 'Custom AI Email Generator',
      customAIDescription: 'Describe what type of email design you want, and AI will generate it with the proper format and placeholders.',
      describeEmailDesign: 'Describe your email design',
      describeEmailDesignPlaceholder: "e.g., 'Create a friendly follow-up email with a special discount offer for new customers. Use a modern design with a clear call-to-action button.'",
      availablePlaceholders: '📋 Available Placeholders',
      leadNameDesc: "Lead's first name",
      companyNameDesc: "Lead's company name",
      senderNameDescModal: 'Your name',
      senderEmailDescModal: 'Your email address',
      companyServiceDesc: "Your company's main service",
      targetIndustryDescModal: 'Target industry',
      websiteURLDescModal: 'Your website URL',
      aiWillIncludePlaceholders: '✨ The AI will automatically include these placeholders in the generated template',
      cancel: 'Cancel',
      generateTemplate: 'Generate Template',
      
      // Error Messages
      testEmailRequired: 'Test Email address is required',
      testEmailInvalid: 'Test Email must be a valid email address',
      testLeadNameRequired: 'Test Lead Name is required',
      testCompanyRequired: 'Test Company Name is required',
      saveTemplateFirst: 'Please save the current template before sending a test email',
      companyNameRequired: 'Company Name is required',
      mainServiceRequired: 'Main Service is required',
      senderNameRequired: 'Sender Name is required',
      senderEmailRequired: 'Sender Email is required',
      senderEmailInvalid: 'Sender Email must be a valid email address',
      websiteURLInvalid: 'Website URL must be a valid URL',
      emailSubjectRequired: 'Email Subject is required',
      htmlContentRequired: 'HTML Content is required',
      failedToLoadTemplates: 'Failed to load email templates',
      failedToSaveTemplate: 'Failed to save template',
      failedToSaveTemplateError: 'Failed to save template: {error}',
      templateSavedSuccess: 'Template saved successfully!',
      testEmailSentSuccess: 'Test email sent successfully!',
      failedToSendTestEmail: 'Failed to send test email',
      failedToSendTestEmailError: 'Failed to send test email: {error}',
      failedToGenerateTemplate: 'Failed to generate template',
      failedToGenerateTemplateError: 'Failed to generate template: {error}',
      templateGeneratedSuccess: 'Template generated successfully!',
      
      // Status Messages
      statusNotConfigured: 'Not Configured',
      statusActive: 'Active',
      statusInactive: 'Inactive',
      statusDraft: 'Draft',
      statusReady: 'Ready',
      statusError: 'Error',
      
      // Timing Descriptions
      sendImmediately: 'Send immediately',
      sendAfter7Days: 'Send after 7 days',
      sendAfter14Days: 'Send after 14 days',
      sendAfter21Days: 'Send after 21 days',
      sendAfter28Days: 'Send after 28 days',
      sendAfter35Days: 'Send after 35 days',
      sendAfter42Days: 'Send after 42 days'
    },
    nl: {
      // Page header
      emailTemplateManager: 'E-mail Sjabloon Beheerder',
      emailTemplateManagerDescription: 'Maak, pas aan en beheer geautomatiseerde e-mailsjablonen voor uw CRM systeem',
      refresh: 'Vernieuwen',
      saveTemplate: 'Sjabloon Opslaan',
      saving: 'Opslaan...',
      
      // Company Settings
      companySettings: 'Bedrijfsinstellingen',
      companyName: 'Bedrijfsnaam',
      companyNamePlaceholder: 'Uw bedrijfsnaam',
      mainService: 'Hoofddienst',
      mainServicePlaceholder: 'bijv. Webontwikkeling',
      targetIndustry: 'Doelbranche',
      targetIndustryPlaceholder: 'bijv. E-commerce',
      senderName: 'Afzender Naam',
      senderNamePlaceholder: 'Uw naam',
      senderEmail: 'Afzender E-mail',
      senderEmailPlaceholder: 'uw@email.nl',
      websiteURL: 'Website URL',
      websiteURLPlaceholder: 'https://uwsite.nl',
      saveSettings: 'Instellingen Opslaan',
      savingSettings: 'Opslaan...',
      
      // Email Timing
      emailTiming: 'E-mail Timing',
      configureEmailTiming: 'Configureer wanneer e-mails worden verzonden',
      configure: 'Configureren',
      hide: 'Verbergen',
      emailScheduleConfiguration: 'E-mail Schema Configuratie',
      resetToDefault: 'Herstel naar Standaard',
      waitTime: 'Wachttijd',
      timeUnit: 'Tijdsseenheid',
      minutes: 'Minuten',
      hours: 'Uren',
      days: 'Dagen',
      firstEmail: 'Eerste E-mail',
      startingPoint: 'Startpunt van e-mailreeks',
      followsPreviousEmail: 'Volgt vorige e-mail na {delay} {unit}',
      saveChanges: 'Wijzigingen Opslaan',
      unsaved: 'Niet opgeslagen',
      emailTimingSettingsSaved: 'E-mail Timing Instellingen Opgeslagen',
      emailTimingSettingsSavedSuccess: '📧 E-mail timing instellingen succesvol opgeslagen!',
      failedToSaveSettings: 'Kan instellingen niet opslaan. Probeer het opnieuw.',
      
      // Development Testing
      developmentTesting: 'Ontwikkeling Testen',
      devTestingDescription: 'Test e-mailautomatisering met minuut-voor-minuut verzending voor ontwikkeling',
      disabled: 'UITGESCHAKELD (Veroorzaakte Snelle E-mails)',
      showScriptCommand: 'Toon Script Commando',
      devEmailAutomationDisabled: '🚨 DEV E-mail Automatisering UITGESCHAKELD - Dit veroorzaakte timing conflicten! Gebruik het productiesysteem.',
      runScriptCommand: '📧 Voer uit: node scripts/dev-email-automation.js',
      
      // Template Variables
      availableVariables: 'Beschikbare Variabelen',
      leadNameVar: 'Voornaam van lead',
      companyNameVar: 'Bedrijfsnaam van lead',
      senderNameDesc: 'Uw naam',
      senderEmailDesc: 'Uw e-mailadres',
      companyService: 'Hoofddienst van uw bedrijf',
      targetIndustryDesc: 'Doelbranche',
      websiteURLDesc: 'Uw website URL',
      
      // Test Email
      testEmail: 'Test E-mail',
      testEmailPlaceholder: 'test@voorbeeld.nl',
      testName: 'Test Naam*',
      testCompany: 'Test Bedrijf*',
      sendTest: 'Test Verzenden',
      sending: 'Verzenden...',
      
      // Validation
      validationStatus: 'Validatie Status',
      validationCompanyName: 'Bedrijfsnaam',
      validationMainService: 'Hoofddienst',
      validationSenderName: 'Afzender Naam',
      validationSenderEmail: 'Afzender E-mail',
      validationWebsiteURL: 'Website URL',
      
      // Template Editor
      emailTemplates: 'E-mail Sjablonen',
      showPreview: 'Voorbeeld Tonen',
      hidePreview: 'Voorbeeld Verbergen',
      quickGenerate: 'Snel Genereren',
      generating: 'Genereren...',
      customAI: 'Aangepaste AI',
      emailSubject: 'E-mail Onderwerp',
      emailSubjectPlaceholder: 'Voer e-mail onderwerp in...',
      active: 'Actief',
      htmlContent: 'HTML Inhoud',
      htmlContentPlaceholder: 'Voer HTML e-mail inhoud in...',
      plainTextContent: 'Platte Tekst Inhoud',
      plainTextRecommended: '(aanbevolen)',
      plainTextPlaceholder: 'Voer platte tekst versie in...',
      emailPreview: 'E-mail Voorbeeld',
      plainTextPreview: 'Platte Tekst Voorbeeld',
      copyHTML: 'HTML Kopiëren',
      htmlCopiedToClipboard: 'HTML gekopieerd naar klembord',
      
      // Pipeline Stages
      firstCallEmail: 'Eerste Gesprek E-mail',
      firstCallDescription: 'Initiële outreach e-mail na eerste contactpoging',
      secondFollowUp: 'Tweede Opvolging',
      secondFollowUpDescription: 'Opvolgings e-mail na tweede contactpoging',
      thirdFollowUp: 'Derde Opvolging',
      thirdFollowUpDescription: 'Vraag-gebaseerde e-mail na derde contactpoging',
      fourthFollowUp: 'Vierde Opvolging',
      fourthFollowUpDescription: 'Case study en sociale bewijzen e-mail',
      fifthFollowUp: 'Vijfde Opvolging',
      fifthFollowUpDescription: 'Prioriteitscontrole en feedbackverzoek e-mail',
      sixthFollowUp: 'Zesde Opvolging',
      sixthFollowUpDescription: 'Waarde-toevoegende resource e-mail voor laatste outreach',
      finalEmail: 'Laatste E-mail',
      finalEmailDescription: 'Humoristische afscheids e-mail - laatste contactpoging',
      
      // Template Status
      templateStatusOverview: 'Sjabloon Status Overzicht',
      updated: 'Bijgewerkt',
      thisIsFirstEmail: 'Dit is de eerste e-mail in de reeks',
      emailWillBeSent: 'Deze e-mail wordt verzonden {delay} {unit} na de vorige e-mail',
      
      // AI Generation Modal
      customAIEmailGenerator: 'Aangepaste AI E-mail Generator',
      customAIDescription: 'Beschrijf welk type e-mailontwerp u wilt, en AI zal het genereren met het juiste formaat en placeholders.',
      describeEmailDesign: 'Beschrijf uw e-mailontwerp',
      describeEmailDesignPlaceholder: "bijv., 'Maak een vriendelijke opvolgings e-mail met een speciale kortingsaanbieding voor nieuwe klanten. Gebruik een modern ontwerp met een duidelijke call-to-action knop.'",
      availablePlaceholders: '📋 Beschikbare Placeholders',
      leadNameDesc: 'Voornaam van lead',
      companyNameDesc: 'Bedrijfsnaam van lead',
      senderNameDescModal: 'Uw naam',
      senderEmailDescModal: 'Uw e-mailadres',
      companyServiceDesc: 'Hoofddienst van uw bedrijf',
      targetIndustryDescModal: 'Doelbranche',
      websiteURLDescModal: 'Uw website URL',
      aiWillIncludePlaceholders: '✨ AI zal automatisch deze placeholders opnemen in het gegenereerde sjabloon',
      cancel: 'Annuleren',
      generateTemplate: 'Sjabloon Genereren',
      
      // Error Messages
      testEmailRequired: 'Test E-mail adres is vereist',
      testEmailInvalid: 'Test E-mail moet een geldig e-mailadres zijn',
      testLeadNameRequired: 'Test Lead Naam is vereist',
      testCompanyRequired: 'Test Bedrijfsnaam is vereist',
      saveTemplateFirst: 'Sla het huidige sjabloon eerst op voordat u een test e-mail verzendt',
      companyNameRequired: 'Bedrijfsnaam is vereist',
      mainServiceRequired: 'Hoofddienst is vereist',
      senderNameRequired: 'Afzender Naam is vereist',
      senderEmailRequired: 'Afzender E-mail is vereist',
      senderEmailInvalid: 'Afzender E-mail moet een geldig e-mailadres zijn',
      websiteURLInvalid: 'Website URL moet een geldige URL zijn',
      emailSubjectRequired: 'E-mail Onderwerp is vereist',
      htmlContentRequired: 'HTML Inhoud is vereist',
      failedToLoadTemplates: 'Kan e-mail sjablonen niet laden',
      failedToSaveTemplate: 'Kan sjabloon niet opslaan',
      failedToSaveTemplateError: 'Kan sjabloon niet opslaan: {error}',
      templateSavedSuccess: 'Sjabloon succesvol opgeslagen!',
      testEmailSentSuccess: 'Test e-mail succesvol verzonden!',
      failedToSendTestEmail: 'Kan test e-mail niet verzenden',
      failedToSendTestEmailError: 'Kan test e-mail niet verzenden: {error}',
      failedToGenerateTemplate: 'Kan sjabloon niet genereren',
      failedToGenerateTemplateError: 'Kan sjabloon niet genereren: {error}',
      templateGeneratedSuccess: 'Sjabloon succesvol gegenereerd!',
      
      // Status Messages
      statusNotConfigured: 'Niet Geconfigureerd',
      statusActive: 'Actief',
      statusInactive: 'Inactief',
      statusDraft: 'Concept',
      statusReady: 'Gereed',
      statusError: 'Fout',
      
      // Timing Descriptions
      sendImmediately: 'Direct verzenden',
      sendAfter7Days: 'Verzenden na 7 dagen',
      sendAfter14Days: 'Verzenden na 14 dagen',
      sendAfter21Days: 'Verzenden na 21 dagen',
      sendAfter28Days: 'Verzenden na 28 dagen',
      sendAfter35Days: 'Verzenden na 35 dagen',
      sendAfter42Days: 'Verzenden na 42 dagen'
    }
  }
};

const emailPromptingSlice = createSlice({
  name: 'emailPrompting',
  initialState,
  reducers: {},
});

export default emailPromptingSlice.reducer; 