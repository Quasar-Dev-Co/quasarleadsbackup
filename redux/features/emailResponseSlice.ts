import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type LanguageCode = 'en' | 'nl';

export type EmailResponseTranslations = Record<string, string>;

interface EmailResponseLanguageState {
  translations: {
    en: EmailResponseTranslations;
    nl: EmailResponseTranslations;
  };
}

const initialState: EmailResponseLanguageState = {
  translations: {
    en: {
      // Page header
      emailResponseManager: 'Email Response Manager',
      emailResponseManagerDescription: 'Manage and respond to incoming emails with AI-powered automation',
      refresh: 'Refresh',
      settings: 'Settings',
      saving: 'Saving...',
      
      // Tabs
      inbox: 'Inbox',
      aiResponses: 'AI Responses',
      
      // Inbox Section
      incomingEmails: 'Incoming Emails',
      noEmailsFound: 'No emails found',
      emailDetails: 'Email Details',
      from: 'From',
      subject: 'Subject',
      received: 'Received',
      status: 'Status',
      sentiment: 'Sentiment',
      actions: 'Actions',
      viewEmail: 'View Email',
      generateResponse: 'Generate Response',
      markAsRead: 'Mark as Read',
      markAsUnread: 'Mark as Unread',
      deleteEmail: 'Delete Email',
      
      // Email Status
      unread: 'Unread',
      read: 'Read',
      responded: 'Responded',
      pendingAI: 'Pending AI',
      
      // Sentiment
      positive: 'Positive',
      negative: 'Negative',
      neutral: 'Neutral',
      interested: 'Interested',
      notInterested: 'Not Interested',
      
      // AI Responses Section
      aiGeneratedResponses: 'AI Generated Responses',
      noResponsesFound: 'No responses found',
      responseDetails: 'Response Details',
      confidence: 'Confidence',
      reasoning: 'Reasoning',
      responseType: 'Response Type',
      created: 'Created',
      viewResponse: 'View Response',
      approveResponse: 'Approve Response',
      sendResponse: 'Send Response',
      rejectResponse: 'Reject Response',
      deleteResponse: 'Delete Response',
      
      // Response Types
      objectionHandling: 'Objection Handling',
      meetingRequest: 'Meeting Request',
      pricingInquiry: 'Pricing Inquiry',
      general: 'General',
      
      // Response Status
      draft: 'Draft',
      approved: 'Approved',
      rejected: 'Rejected',
      
      // Settings Section
      aiSettings: 'AI Settings',
      aiSettingsDescription: 'Configure AI response generation and automation settings',
      enableAI: 'Enable AI',
      enableAIDescription: 'Allow AI to automatically generate responses to incoming emails',
      autoSendThreshold: 'Auto Send Threshold',
      autoSendThresholdDescription: 'Confidence level required for automatic sending (0-100)',
      defaultTone: 'Default Tone',
      professional: 'Professional',
      friendly: 'Friendly',
      casual: 'Casual',
      formal: 'Formal',
      includeCompanyInfo: 'Include Company Info',
      includeCompanyInfoDescription: 'Automatically include company information in responses',
      maxResponseLength: 'Max Response Length',
      maxResponseLengthDescription: 'Maximum number of characters for AI responses',
      customInstructions: 'Custom Instructions',
      customInstructionsDescription: 'Additional instructions for AI response generation',
      customInstructionsPlaceholder: 'Enter custom instructions for AI responses...',
      responsePrompt: 'Response Prompt',
      responsePromptDescription: 'Custom prompt template for AI response generation',
      responsePromptPlaceholder: 'Enter custom response prompt...',
      
      // Company Information
      companyInformation: 'Company Information',
      companyName: 'Company Name',
      companyNamePlaceholder: 'Your company name',
      senderName: 'Sender Name',
      senderNamePlaceholder: 'Your name',
      senderEmail: 'Sender Email',
      senderEmailPlaceholder: 'your@email.com',
      signature: 'Signature',
      signaturePlaceholder: 'Your email signature',
      
      // Email Preview Dialog
      emailPreview: 'Email Preview',
      originalEmail: 'Original Email',
      aiResponse: 'AI Response',
      close: 'Close',
      
      // Additional UI Elements
      isReply: 'Reply to our email',
      isRecent: 'Recent (last 20 minutes)',
      date: 'Date',
      copyContent: 'Copy Content',
      copyEmailAddress: 'Copy Email Address',
      
      // Response Editor Dialog
      editResponse: 'Edit Response',
      editResponseDescription: 'Review and edit the AI-generated response before sending',
      subjectPlaceholder: 'Enter email subject...',
      content: 'Content',
      contentPlaceholder: 'Enter email content...',
      saveChanges: 'Save Changes',
      cancel: 'Cancel',
      sendEmail: 'Send Email',
      sending: 'Sending...',
      
      // Validation Messages
      companyNameRequired: 'Company Name is required',
      senderNameRequired: 'Sender Name is required',
      senderEmailRequired: 'Sender Email is required',
      senderEmailInvalid: 'Sender Email must be a valid email address',
      autoSendThresholdInvalid: 'Auto Send Threshold must be between 0 and 100',
      maxResponseLengthInvalid: 'Max Response Length must be between 50 and 1000',
      subjectRequired: 'Subject is required',
      contentRequired: 'Content is required',
      
      // Success Messages
      settingsSaved: 'Settings saved successfully!',
      saveAllSettings: 'Save All Settings',
      responseGenerated: 'AI response generated successfully!',
      responseSent: 'Response sent successfully!',
      responseUpdated: 'Response updated successfully!',
      responseDeleted: 'Response deleted successfully!',
      emailMarkedAsRead: 'Email marked as read',
      emailMarkedAsUnread: 'Email marked as unread',
      emailDeleted: 'Email deleted successfully!',
      
      // Error Messages
      failedToLoadEmails: 'Failed to load incoming emails',
      failedToLoadResponses: 'Failed to load AI responses',
      failedToLoadSettings: 'Failed to load AI settings',
      failedToSaveSettings: 'Failed to save settings',
      failedToGenerateResponse: 'Failed to generate AI response',
      failedToSendResponse: 'Failed to send response',
      failedToUpdateResponse: 'Failed to update response',
      failedToDeleteResponse: 'Failed to delete response',
      failedToMarkEmail: 'Failed to mark email',
      failedToDeleteEmail: 'Failed to delete email',
      
      // Loading States
      loadingEmails: 'Loading emails...',
      loadingResponses: 'Loading responses...',
      loadingSettings: 'Loading settings...',
      generatingResponse: 'Generating response...',
      sendingResponse: 'Sending response...',
      savingSettings: 'Saving settings...',
      
      // Filter and Search
      filterByStatus: 'Filter by Status',
      filterBySentiment: 'Filter by Sentiment',
      filterByResponseType: 'Filter by Response Type',
      searchEmails: 'Search emails...',
      searchResponses: 'Search responses...',
      clearFilters: 'Clear Filters',
      
      // Statistics
      totalEmails: 'Total Emails',
      unreadEmails: 'Unread Emails',
      respondedEmails: 'Responded Emails',
      pendingResponses: 'Pending Responses',
      averageResponseTime: 'Average Response Time',
      responseRate: 'Response Rate',
      
      // Recent Activity
      recentActivity: 'Recent Activity',
      noRecentActivity: 'No recent activity',
      emailReceived: 'Email received from {sender}',
      responseGeneratedFor: 'AI response generated for {email}',
      responseSentTo: 'Response sent to {recipient}',
      settingsUpdated: 'AI settings updated',
      
      // Time Formats
      justNow: 'Just now',
      minutesAgo: '{minutes} minutes ago',
      hoursAgo: '{hours} hours ago',
      daysAgo: '{days} days ago',
      
      // Confidence Levels
      highConfidence: 'High Confidence',
      mediumConfidence: 'Medium Confidence',
      lowConfidence: 'Low Confidence',
      
      // Response Quality
      excellent: 'Excellent',
      good: 'Good',
      fair: 'Fair',
      poor: 'Poor',
      
      // Additional
      completed: 'completed'
    },
    nl: {
      // Page header
      emailResponseManager: 'E-mail Reactie Beheerder',
      emailResponseManagerDescription: 'Beheer en reageer op binnenkomende e-mails met AI-aangedreven automatisering',
      refresh: 'Vernieuwen',
      settings: 'Instellingen',
      saving: 'Opslaan...',
      
      // Tabs
      inbox: 'Postvak In',
      aiResponses: 'AI Reacties',
      
      // Inbox Section
      incomingEmails: 'Binnenkomende E-mails',
      noEmailsFound: 'Geen e-mails gevonden',
      emailDetails: 'E-mail Details',
      from: 'Van',
      subject: 'Onderwerp',
      received: 'Ontvangen',
      status: 'Status',
      sentiment: 'Sentiment',
      actions: 'Acties',
      viewEmail: 'E-mail Bekijken',
      generateResponse: 'Reactie Genereren',
      markAsRead: 'Als Gelezen Markeren',
      markAsUnread: 'Als Ongelezen Markeren',
      deleteEmail: 'E-mail Verwijderen',
      
      // Email Status
      unread: 'Ongelezen',
      read: 'Gelezen',
      responded: 'Beantwoord',
      pendingAI: 'Wachtend op AI',
      
      // Sentiment
      positive: 'Positief',
      negative: 'Negatief',
      neutral: 'Neutraal',
      interested: 'Geïnteresseerd',
      notInterested: 'Niet Geïnteresseerd',
      
      // AI Responses Section
      aiGeneratedResponses: 'AI Gegenereerde Reacties',
      noResponsesFound: 'Geen reacties gevonden',
      responseDetails: 'Reactie Details',
      confidence: 'Vertrouwen',
      reasoning: 'Redenering',
      responseType: 'Reactie Type',
      created: 'Aangemaakt',
      viewResponse: 'Reactie Bekijken',
      approveResponse: 'Reactie Goedkeuren',
      sendResponse: 'Reactie Verzenden',
      rejectResponse: 'Reactie Afwijzen',
      deleteResponse: 'Reactie Verwijderen',
      
      // Response Types
      objectionHandling: 'Bezwaar Afhandeling',
      meetingRequest: 'Meeting Verzoek',
      pricingInquiry: 'Prijzen Vraag',
      general: 'Algemeen',
      
      // Response Status
      draft: 'Concept',
      approved: 'Goedgekeurd',
      rejected: 'Afgewezen',
      
      // Settings Section
      aiSettings: 'AI Instellingen',
      aiSettingsDescription: 'Configureer AI reactie generatie en automatisering instellingen',
      enableAI: 'AI Inschakelen',
      enableAIDescription: 'Sta AI toe om automatisch reacties te genereren op binnenkomende e-mails',
      autoSendThreshold: 'Auto Verzend Drempel',
      autoSendThresholdDescription: 'Vertrouwensniveau vereist voor automatisch verzenden (0-100)',
      defaultTone: 'Standaard Toon',
      professional: 'Professioneel',
      friendly: 'Vriendelijk',
      casual: 'Informeel',
      formal: 'Formeel',
      includeCompanyInfo: 'Bedrijfsinformatie Inclusief',
      includeCompanyInfoDescription: 'Automatisch bedrijfsinformatie opnemen in reacties',
      maxResponseLength: 'Max Reactie Lengte',
      maxResponseLengthDescription: 'Maximum aantal karakters voor AI reacties',
      customInstructions: 'Aangepaste Instructies',
      customInstructionsDescription: 'Extra instructies voor AI reactie generatie',
      customInstructionsPlaceholder: 'Voer aangepaste instructies in voor AI reacties...',
      responsePrompt: 'Reactie Prompt',
      responsePromptDescription: 'Aangepaste prompt sjabloon voor AI reactie generatie',
      responsePromptPlaceholder: 'Voer aangepaste reactie prompt in...',
      
      // Company Information
      companyInformation: 'Bedrijfsinformatie',
      companyName: 'Bedrijfsnaam',
      companyNamePlaceholder: 'Uw bedrijfsnaam',
      senderName: 'Afzender Naam',
      senderNamePlaceholder: 'Uw naam',
      senderEmail: 'Afzender E-mail',
      senderEmailPlaceholder: 'uw@email.nl',
      signature: 'Handtekening',
      signaturePlaceholder: 'Uw e-mail handtekening',
      
      // Email Preview Dialog
      emailPreview: 'E-mail Voorvertoning',
      originalEmail: 'Originele E-mail',
      aiResponse: 'AI Reactie',
      close: 'Sluiten',
      
      // Additional UI Elements
      isReply: 'Antwoord op onze e-mail',
      isRecent: 'Recent (laatste 20 minuten)',
      date: 'Datum',
      copyContent: 'Inhoud Kopiëren',
      copyEmailAddress: 'E-mailadres Kopiëren',
      
      // Response Editor Dialog
      editResponse: 'Reactie Bewerken',
      editResponseDescription: 'Bekijk en bewerk de AI-gegenereerde reactie voordat u verzendt',
      subjectPlaceholder: 'Voer e-mail onderwerp in...',
      content: 'Inhoud',
      contentPlaceholder: 'Voer e-mail inhoud in...',
      saveChanges: 'Wijzigingen Opslaan',
      cancel: 'Annuleren',
      sendEmail: 'E-mail Verzenden',
      sending: 'Verzenden...',
      
      // Validation Messages
      companyNameRequired: 'Bedrijfsnaam is vereist',
      senderNameRequired: 'Afzender Naam is vereist',
      senderEmailRequired: 'Afzender E-mail is vereist',
      senderEmailInvalid: 'Afzender E-mail moet een geldig e-mailadres zijn',
      autoSendThresholdInvalid: 'Auto Verzend Drempel moet tussen 0 en 100 liggen',
      maxResponseLengthInvalid: 'Max Reactie Lengte moet tussen 50 en 1000 liggen',
      subjectRequired: 'Onderwerp is vereist',
      contentRequired: 'Inhoud is vereist',
      
      // Success Messages
      settingsSaved: 'Instellingen succesvol opgeslagen!',
      saveAllSettings: 'Alle Instellingen Opslaan',
      responseGenerated: 'AI reactie succesvol gegenereerd!',
      responseSent: 'Reactie succesvol verzonden!',
      responseUpdated: 'Reactie succesvol bijgewerkt!',
      responseDeleted: 'Reactie succesvol verwijderd!',
      emailMarkedAsRead: 'E-mail als gelezen gemarkeerd',
      emailMarkedAsUnread: 'E-mail als ongelezen gemarkeerd',
      emailDeleted: 'E-mail succesvol verwijderd!',
      
      // Error Messages
      failedToLoadEmails: 'Kan binnenkomende e-mails niet laden',
      failedToLoadResponses: 'Kan AI reacties niet laden',
      failedToLoadSettings: 'Kan AI instellingen niet laden',
      failedToSaveSettings: 'Kan instellingen niet opslaan',
      failedToGenerateResponse: 'Kan AI reactie niet genereren',
      failedToSendResponse: 'Kan reactie niet verzenden',
      failedToUpdateResponse: 'Kan reactie niet bijwerken',
      failedToDeleteResponse: 'Kan reactie niet verwijderen',
      failedToMarkEmail: 'Kan e-mail niet markeren',
      failedToDeleteEmail: 'Kan e-mail niet verwijderen',
      
      // Loading States
      loadingEmails: 'E-mails laden...',
      loadingResponses: 'Reacties laden...',
      loadingSettings: 'Instellingen laden...',
      generatingResponse: 'Reactie genereren...',
      sendingResponse: 'Reactie verzenden...',
      savingSettings: 'Instellingen opslaan...',
      
      // Filter and Search
      filterByStatus: 'Filter op Status',
      filterBySentiment: 'Filter op Sentiment',
      filterByResponseType: 'Filter op Reactie Type',
      searchEmails: 'E-mails zoeken...',
      searchResponses: 'Reacties zoeken...',
      clearFilters: 'Filters Wissen',
      
      // Statistics
      totalEmails: 'Totaal E-mails',
      unreadEmails: 'Ongelezen E-mails',
      respondedEmails: 'Beantwoorde E-mails',
      pendingResponses: 'Wachtende Reacties',
      averageResponseTime: 'Gemiddelde Reactietijd',
      responseRate: 'Reactiepercentage',
      
      // Recent Activity
      recentActivity: 'Recente Activiteit',
      noRecentActivity: 'Geen recente activiteit',
      emailReceived: 'E-mail ontvangen van {sender}',
      responseGeneratedFor: 'AI reactie gegenereerd voor {email}',
      responseSentTo: 'Reactie verzonden naar {recipient}',
      settingsUpdated: 'AI instellingen bijgewerkt',
      
      // Time Formats
      justNow: 'Zojuist',
      minutesAgo: '{minutes} minuten geleden',
      hoursAgo: '{hours} uur geleden',
      daysAgo: '{days} dagen geleden',
      
      // Confidence Levels
      highConfidence: 'Hoge Vertrouwen',
      mediumConfidence: 'Gemiddeld Vertrouwen',
      lowConfidence: 'Lage Vertrouwen',
      
      // Response Quality
      excellent: 'Uitstekend',
      good: 'Goed',
      fair: 'Redelijk',
      poor: 'Slecht',
      
      // Additional
      completed: 'voltooid'
    }
  }
};

const emailResponseSlice = createSlice({
  name: 'emailResponse',
  initialState,
  reducers: {
    // Add any specific reducers if needed in the future
  }
});

export default emailResponseSlice.reducer; 