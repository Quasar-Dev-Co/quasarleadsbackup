"use client";

import { useState, useEffect, useRef } from "react";
import { SectionHeader } from "@/components/ui/section-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Mail, 
  Save, 
  RefreshCw, 
  Settings,
  TestTube,
  Copy,
  CheckCircle,
  AlertTriangle,
  Info,
  Sparkles,
  Clock,
  Download,
  Upload,
  Wand2
} from "lucide-react";
import { toast } from "sonner";
import { useEmailPromptingTranslations } from "@/hooks/use-email-prompting-translations";
import { auth } from "@/lib/auth";

interface EmailTemplate {
  id: string;
  stage: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  isActive: boolean;
  variables: string[];
  createdAt: string;
  updatedAt: string;
  timing?: {
    delay: number;
    unit: 'minutes' | 'hours' | 'days';
    description: string;
  };
}

interface TimingSettings {
  stage: string;
  delay: number;
  unit: 'minutes' | 'hours' | 'days';
  description: string;
}

interface CompanySettings {
  companyName: string;
  service: string;
  industry: string;
  senderName: string;
  senderEmail: string;
  websiteUrl: string;
  logoUrl: string;
  defaultOutreachRecipient?: 'lead' | 'company';
  defaultSenderIdentity?: 'company' | 'author';
  emailTimings?: TimingSettings[];
}

const PIPELINE_STAGES = (t: (key: string) => string) => [
  { value: "called_once", label: t('firstCallEmail'), description: t('firstCallDescription'), defaultTiming: { delay: 0, unit: 'minutes' as const, description: t('sendImmediately') } },
  { value: "called_twice", label: t('secondFollowUp'), description: t('secondFollowUpDescription'), defaultTiming: { delay: 7, unit: 'days' as const, description: t('sendAfter7Days') } },
  { value: "called_three_times", label: t('thirdFollowUp'), description: t('thirdFollowUpDescription'), defaultTiming: { delay: 7, unit: 'days' as const, description: t('sendAfter7Days') } },
  { value: "called_four_times", label: t('fourthFollowUp'), description: t('fourthFollowUpDescription'), defaultTiming: { delay: 7, unit: 'days' as const, description: t('sendAfter7Days') } },
  { value: "called_five_times", label: t('fifthFollowUp'), description: t('fifthFollowUpDescription'), defaultTiming: { delay: 7, unit: 'days' as const, description: t('sendAfter7Days') } },
  { value: "called_six_times", label: t('sixthFollowUp'), description: t('sixthFollowUpDescription'), defaultTiming: { delay: 7, unit: 'days' as const, description: t('sendAfter7Days') } },
  { value: "called_seven_times", label: t('finalEmail'), description: t('finalEmailDescription'), defaultTiming: { delay: 7, unit: 'days' as const, description: t('sendAfter7Days') } }
];

const TEMPLATE_VARIABLES = (t: (key: string) => string) => [
  { var: "{{LEAD_NAME}}", description: t('leadNameVar') },
  { var: "{{OWNER_NAME}}", description: "Lead's company owner name" },
  { var: "{{COMPANY_NAME}}", description: t('companyNameVar') },
  { var: "{{COMPANY_REVIEW}}", description: "Lead's company reviews and ratings" },
  { var: "{{SENDER_NAME}}", description: t('senderNameDesc') },
  { var: "{{SENDER_EMAIL}}", description: t('senderEmailDesc') },
  { var: "{{COMPANY_SERVICE}}", description: t('companyService') },
  { var: "{{TARGET_INDUSTRY}}", description: t('targetIndustryDesc') },
  { var: "{{WEBSITE_URL}}", description: t('websiteURLDesc') }
];

export default function EmailPrompting() {
  const { t } = useEmailPromptingTranslations();
  
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [activeTab, setActiveTab] = useState("called_once");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [showTimingSettings, setShowTimingSettings] = useState(false);
  const [hasUnsavedTimingChanges, setHasUnsavedTimingChanges] = useState(false);
  
  // Company settings
  const [companySettings, setCompanySettings] = useState<CompanySettings>({
    companyName: "QuasarLeads",
    service: "AI-powered lead generation",
    industry: "Technology",
    senderName: "QuasarLeads Team",
    senderEmail: "",
    websiteUrl: "https://quasarleads.com",
    logoUrl: "",
    emailTimings: PIPELINE_STAGES(t).map(stage => ({
      stage: stage.value,
      ...stage.defaultTiming
    }))
  });

  // Current template being edited
  const [currentTemplate, setCurrentTemplate] = useState<Partial<EmailTemplate>>({
    stage: "called_once",
    subject: "",
    htmlContent: "",
    textContent: "",
    isActive: true
  });

  // Modular email components
  const [emailSubject, setEmailSubject] = useState("");
  const [contentPrompt, setContentPrompt] = useState("");
  const [emailSignature, setEmailSignature] = useState("");
  const [mediaLinks, setMediaLinks] = useState("");
  const [htmlDesign, setHtmlDesign] = useState("");
  const [generatedContent, setGeneratedContent] = useState("");
  const [generatingContent, setGeneratingContent] = useState(false);

  // Test email settings
  const [testEmail, setTestEmail] = useState("");
  const [testLead, setTestLead] = useState({
    name: "John Doe",
    company: "Example Corp"
  });
  const [bookingLink, setBookingLink] = useState<string>("");
  const [userId, setUserId] = useState<string>("");

  // Load userId to build booking link
  useEffect(() => {
    (async () => {
      try {
        const id = await auth.getCurrentUserId();
        if (id) {
          setUserId(id);
          if (typeof window !== 'undefined') {
            setBookingLink(`https://booking.quasarleads.com/${id}`);
          }
        }
      } catch {}
    })();
  }, []);

  // Load templates and settings on component mount
  useEffect(() => {
    loadTemplates();
    loadCompanySettings();
  }, []);

  // Update current template when active tab changes
  useEffect(() => {
    const template = templates.find(t => t.stage === activeTab);
    if (template) {
      setCurrentTemplate(template);
      // Load modular components from new structure
      setEmailSubject(template.subject || "");
      setContentPrompt((template as any).contentPrompt || "");
      setHtmlDesign((template as any).htmlDesign || "");
      setEmailSignature((template as any).emailSignature || "");
      setMediaLinks((template as any).mediaLinks || "");
      // Clear generated content since we're using prompt-based system
      setGeneratedContent("");
    } else {
      setCurrentTemplate({
        stage: activeTab,
        subject: "",
        htmlContent: "",
        textContent: "",
        isActive: true
      });
      setEmailSubject("");
      setContentPrompt("");
      setGeneratedContent("");
      setEmailSignature("");
      setMediaLinks("");
      setHtmlDesign("");
    }
  }, [activeTab, templates]);

  // Helper to extract content from HTML
  const extractContentFromHTML = (html: string): string => {
    // Basic extraction - can be enhanced
    return html;
  };

  // Helper to extract signature from HTML
  const extractSignatureFromHTML = (html: string): string => {
    // Basic extraction - can be enhanced
    return "";
  };

  // Load email templates from database
  const loadTemplates = async () => {
    try {
      setLoading(true);
      
      // Get current user ID
      const userId = await auth.getCurrentUserId();
      if (!userId) {
        toast.error('User authentication required. Please login again.');
        return;
      }
      
      const response = await fetch(`/api/email-templates?userId=${userId}`);
      const data = await response.json();
      
      if (data.success) {
        setTemplates(data.templates || []);
      } else {
        toast.error(data.error || t('failedToLoadTemplates'));
      }
    } catch (error) {
      console.error('Error loading templates:', error);
      toast.error(t('failedToLoadTemplates'));
    } finally {
      setLoading(false);
    }
  };

  // Load company settings
  const loadCompanySettings = async () => {
    try {
      // Get current user ID for user-specific settings
      const userId = await auth.getCurrentUserId();
      if (!userId) {
        console.warn('No user ID found, loading default company settings');
      }
      
      const url = userId ? `/api/company-settings?userId=${userId}` : '/api/company-settings';
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success && data.settings) {
        setCompanySettings(prev => ({ ...prev, ...data.settings }));
        console.log(`📋 Loaded ${data.isUserSpecific ? 'user-specific' : 'default'} company settings`);
      }
    } catch (error) {
      console.error('Error loading company settings:', error);
    }
  };

  // Assemble final template from modular components
  const assembleFinalTemplate = (): { htmlContent: string; textContent: string } => {
    // Combine all components into final HTML
    let finalHTML = htmlDesign || `<div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; background: #ffffff;">`;
    
    // If custom HTML design is provided, use it
    if (htmlDesign) {
      finalHTML = htmlDesign;
    } else {
      // Build default structure
      finalHTML += `
        <div style="padding: 40px 30px; background: white;">
          ${generatedContent}
          
          ${mediaLinks ? `<div style="margin: 20px 0;">${mediaLinks}</div>` : ''}
          
          ${emailSignature ? `<div style="margin-top: 30px;">${emailSignature}</div>` : ''}
        </div>
      </div>`;
    }
    
    // Generate text version (strip HTML)
    const textContent = `${generatedContent.replace(/<[^>]*>/g, '')}
    
${mediaLinks ? 'Media: ' + mediaLinks : ''}

${emailSignature.replace(/<[^>]*>/g, '')}`;
    
    return { htmlContent: finalHTML, textContent };
  };

  // Save template to database
  const saveTemplate = async () => {
    try {
      setSaving(true);
      console.log('Starting template save...');
      
      // Validate template
      if (!emailSubject.trim()) {
        toast.error("Email subject is required");
        setSaving(false);
        return;
      }
      
      if (!contentPrompt.trim()) {
        toast.error("Content prompt is required. This will be used to generate personalized content for each lead.");
        setSaving(false);
        return;
      }

      // Get current user ID
      const userId = await auth.getCurrentUserId();
      if (!userId) {
        toast.error('User authentication required. Please login again.');
        return;
      }

      // Get timing for current stage from company settings
      const currentTiming = getEmailTiming(activeTab);

      const templateData = {
        stage: activeTab,
        subject: emailSubject,
        contentPrompt: contentPrompt,
        htmlDesign: htmlDesign,
        emailSignature: emailSignature,
        mediaLinks: mediaLinks,
        isActive: currentTemplate.isActive !== undefined ? currentTemplate.isActive : true,
        variables: extractVariables(contentPrompt + emailSignature),
        timing: currentTiming,
        userId
      };

      console.log('Sending template data:', templateData);

      const response = await fetch('/api/email-templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(templateData),
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);

      if (data.success) {
        toast.success(t('templateSavedSuccess'));
        loadTemplates(); // Reload templates
      } else {
        console.error('Save template error:', data.error);
        toast.error(data.error || t('failedToSaveTemplate'));
      }
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error(t('failedToSaveTemplateError').replace('{error}', (error as Error).message));
    } finally {
      setSaving(false);
    }
  };

  // Save company settings
  const saveCompanySettings = async () => {
    try {
      setSavingSettings(true);
      console.log('Starting company settings save...', companySettings);
      
      // Validate company settings before saving
      if (!validateCompanySettings()) {
        return;
      }
      
      // Get current user ID for user-specific settings
      const userId = await auth.getCurrentUserId();
      if (!userId) {
        toast.error('User authentication required. Please login again.');
        return;
      }
      
      const response = await fetch('/api/company-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...companySettings, userId }),
      });

      console.log('Company settings response status:', response.status);
      const data = await response.json();
      console.log('Company settings response data:', data);

      if (data.success) {
        // Also update all template timings to match company settings
        await updateAllTemplateTimings();
        toast.success("Company settings saved successfully!");
      } else {
        console.error('Save company settings error:', data.error);
        toast.error(data.error || "Failed to save settings");
      }
    } catch (error) {
      console.error('Error saving company settings:', error);
      toast.error("Failed to save settings: " + (error as Error).message);
    } finally {
      setSavingSettings(false);
    }
  };

  // Update all template timings to match company settings
  const updateAllTemplateTimings = async () => {
    try {
      console.log('🔄 Updating all template timings...');
      
      // Get current user ID
      const userId = await auth.getCurrentUserId();
      if (!userId) {
        toast.error('User authentication required. Please login again.');
        return;
      }
      
      // Update each template with current timing settings
      for (const template of templates) {
        const currentTiming = getEmailTiming(template.stage);
        
        await fetch('/api/email-templates', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            stage: template.stage,
            timing: currentTiming,
            userId
          }),
        });
      }
      
      // Reload templates to reflect changes
      await loadTemplates();
      console.log('✅ All template timings updated');
      
    } catch (error) {
      console.error('Error updating template timings:', error);
      toast.error("Timing settings saved but failed to update templates");
    }
  };

  // Update timing for a specific stage
  const updateEmailTiming = (stage: string, delay: number, unit: 'minutes' | 'hours' | 'days') => {
    const description = delay === 0 ? 'Send immediately' : `Send after ${delay} ${unit}`;
    
    setCompanySettings(prev => ({
      ...prev,
      emailTimings: prev.emailTimings?.map(timing => 
        timing.stage === stage 
          ? { ...timing, delay, unit, description }
          : timing
      ) || []
    }));
    
    // Mark as having unsaved changes
    setHasUnsavedTimingChanges(true);
    
    // Auto-save timing settings after a short delay
    setTimeout(async () => {
      try {
        await saveCompanySettings();
        setHasUnsavedTimingChanges(false);
        toast.success("📧 Email timing saved!", { duration: 2000 });
      } catch (error) {
        toast.error("Failed to save timing. Please try again.");
      }
    }, 1500); // Save after 1.5 seconds to allow for rapid changes
  };

  // Get timing for a specific stage
  const getEmailTiming = (stage: string) => {
    return companySettings.emailTimings?.find(timing => timing.stage === stage) || 
           PIPELINE_STAGES(t).find(s => s.value === stage)?.defaultTiming || 
           { delay: 7, unit: 'days' as const, description: t('sendAfter7Days') };
  };

  // Reset all timings to default
  const resetTimingsToDefault = async () => {
    setCompanySettings(prev => ({
      ...prev,
      emailTimings: PIPELINE_STAGES(t).map(stage => ({
        stage: stage.value,
        ...stage.defaultTiming
      }))
    }));
    
    // Save the reset settings immediately
    try {
      await saveCompanySettings();
      setHasUnsavedTimingChanges(false);
      toast.success("Email timings reset to default values and saved!");
    } catch (error) {
      toast.error("Timings reset but failed to save. Please click Save manually.");
    }
  };


  // Quick Generate - Generate ALL 7 email templates with AI and save to database
  const quickGenerateAndSave = async () => {
    try {
      setGenerating(true);
      
      // Validate company settings
      if (!companySettings.companyName.trim() || !companySettings.service.trim()) {
        toast.error("Please fill in Company Name and Service in settings first");
        setGenerating(false);
        return;
      }
      
      // Get current user ID
      const userId = await auth.getCurrentUserId();
      if (!userId) {
        toast.error('User authentication required');
        setGenerating(false);
        return;
      }

      const allStages = PIPELINE_STAGES(t);
      let successCount = 0;
      let failCount = 0;

      toast.info(`🚀 Generating all ${allStages.length} email templates...`);

      // Generate and save each stage template
      for (const stageInfo of allStages) {
        try {
          // Create AI prompt to generate template with HTML design
          const prompt = `Generate a complete email template for ${stageInfo.label} in a CRM email automation system.

Company Information:
- Company: ${companySettings.companyName}
- Service: ${companySettings.service}
- Industry: ${companySettings.industry}
- Sender: ${companySettings.senderName}

Stage Context: ${stageInfo.description}

IMPORTANT: Generate these components separately:

1. EMAIL SUBJECT: A clear, compelling subject line (can include {{LEAD_NAME}} or {{COMPANY_NAME}})

2. CONTENT PROMPT: Write a detailed prompt that describes what the email should say. This prompt will be used by AI during email automation to generate personalized content for each lead. Include:
   - Main message and value proposition
   - Key points to mention based on the stage (${stageInfo.value})
   - Tone and style (professional, friendly, urgent, etc.)
   - Call-to-action appropriate for this follow-up stage
   - Instructions to reference {{COMPANY_REVIEW}} if available to show research
   - Any urgency or scarcity elements if appropriate for later stages
   Example: "Write a ${stageInfo.label} email. Start by acknowledging previous contact. Highlight our ${companySettings.service} and how it helps businesses in {{TARGET_INDUSTRY}}. If company reviews are available, mention them. Include a clear call-to-action to schedule a call. Keep it ${stageInfo.value.includes('three') || stageInfo.value.includes('four') ? 'direct and value-focused' : stageInfo.value.includes('six') || stageInfo.value.includes('seven') ? 'final and helpful' : 'professional and friendly'}."

3. HTML DESIGN: A complete HTML email template structure with placeholders. Use modern email-safe HTML with inline styles. Include:
   - Professional layout with proper spacing
   - Sections for: {{GENERATED_CONTENT}}, {{SIGNATURE}}, {{MEDIA_LINKS}}
   - Color scheme that matches professional B2B emails
   - Mobile-responsive design
   Example structure:
   <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f5f5f5; padding: 20px;">
     <div style="background: white; padding: 30px; border-radius: 8px;">
       <div style="margin-bottom: 20px;">
         {{GENERATED_CONTENT}}
       </div>
       <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
         {{MEDIA_LINKS}}
       </div>
       <div style="margin-top: 20px;">
         {{SIGNATURE}}
       </div>
     </div>
   </div>

4. EMAIL SIGNATURE: Professional signature with HTML formatting and placeholders:
   <p style="margin: 0;">Best regards,<br>
   <strong>{{SENDER_NAME}}</strong><br>
   {{SENDER_EMAIL}}<br>
   <a href="{{WEBSITE_URL}}" style="color: #0066cc;">{{WEBSITE_URL}}</a></p>

Return as JSON:
{
  "subject": "email subject here with optional {{LEAD_NAME}}",
  "contentPrompt": "detailed prompt for AI to generate content for this specific stage",
  "htmlDesign": "complete HTML template with {{GENERATED_CONTENT}}, {{SIGNATURE}}, {{MEDIA_LINKS}} placeholders",
  "signature": "email signature with HTML formatting and placeholders"
}`;

          const response = await fetch('/api/generate-email-template', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt,
              stage: stageInfo.value,
              companySettings
            }),
          });

          const data = await response.json();

          if (data.success) {
            const generated = data.template;
            
            // Get timing for this stage
            const stageTiming = companySettings.emailTimings?.find(t => t.stage === stageInfo.value) || stageInfo.defaultTiming;

            // Prepare template data with modular components
            const templateData = {
              stage: stageInfo.value,
              subject: generated.subject || `Follow-up: ${stageInfo.label}`,
              contentPrompt: generated.contentPrompt || `Write a professional ${stageInfo.label} email. Mention our ${companySettings.service} and include a call-to-action.`,
              htmlDesign: generated.htmlDesign || `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">{{GENERATED_CONTENT}}{{MEDIA_LINKS}}{{SIGNATURE}}</div>`,
              emailSignature: generated.signature || `<p>Best regards,<br>{{SENDER_NAME}}<br>{{SENDER_EMAIL}}<br>{{WEBSITE_URL}}</p>`,
              mediaLinks: '',
              isActive: true,
              variables: extractVariables((generated.contentPrompt || '') + (generated.signature || '') + (generated.htmlDesign || '')),
              timing: stageTiming,
              userId
            };

            // Save to database
            const saveResponse = await fetch('/api/email-templates', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(templateData),
            });

            const saveData = await saveResponse.json();

            if (saveData.success) {
              successCount++;
              console.log(`✅ Generated and saved template for ${stageInfo.label}`);
            } else {
              failCount++;
              console.error(`❌ Failed to save template for ${stageInfo.label}:`, saveData.error);
            }
          } else {
            failCount++;
            console.error(`❌ Failed to generate template for ${stageInfo.label}:`, data.error);
          }

          // Small delay between API calls to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error) {
          failCount++;
          console.error(`❌ Error generating template for ${stageInfo.label}:`, error);
        }
      }

      // Show final result
      if (successCount === allStages.length) {
        toast.success(`🎉 Successfully generated all ${successCount} email templates!`);
      } else if (successCount > 0) {
        toast.warning(`⚠️ Generated ${successCount} templates, ${failCount} failed`);
      } else {
        toast.error(`❌ Failed to generate templates`);
      }

      // Reload templates to show the new ones
      await loadTemplates();
      
    } catch (error) {
      console.error('Error in quick generate:', error);
      toast.error("Failed to generate templates: " + (error as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  // Test email sending
  const sendTestEmail = async () => {
    try {
      setTesting(true);
      
      // Validate test email data before sending
      if (!validateTestEmail()) {
        return;
      }

      // Resolve auth header and userId for per-user SMTP
      const header = auth.getAuthHeader();
      const currentUserId = await auth.getCurrentUserId();
      if (!currentUserId) {
        toast.error('Missing user session. Please login again.');
        setTesting(false);
        return;
      }

      const response = await fetch('/api/test-email-template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(header ? { 'authorization': header } : {}),
        },
        body: JSON.stringify({
          template: currentTemplate,
          testEmail,
          testLead,
          companySettings,
          userId: currentUserId
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(t('testEmailSentSuccess').replace('{email}', testEmail));
      } else {
        toast.error(data.error || t('failedToSendTestEmail'));
      }
    } catch (error) {
      console.error('Error sending test email:', error);
      toast.error(t('failedToSendTestEmailError').replace('{error}', (error as Error).message));
    } finally {
      setTesting(false);
    }
  };

  // Helper function to check if field is filled
  const isFieldValid = (value: string, isRequired: boolean = true): boolean => {
    if (!isRequired) return true;
    return value.trim().length > 0;
  };

  const isEmailValid = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Extract variables from template content
  const extractVariables = (content: string): string[] => {
    const matches = content.match(/\{\{[A-Z_]+\}\}/g) || [];
    return [...new Set(matches)];
  };

  // Get template status
  const getTemplateStatus = (stage: string) => {
    const template = templates.find(t => t.stage === stage);
    if (!template) return { status: "missing", color: "text-red-500", icon: AlertTriangle };
    if (!template.isActive) return { status: "inactive", color: "text-gray-500", icon: Info };
    return { status: "active", color: "text-green-500", icon: CheckCircle };
  };

  // Replace variables in preview
  const getPreviewContent = (content: string) => {
    if (!content) return "";
    
    const variables = {
      "{{LEAD_NAME}}": testLead.name,
      "{{OWNER_NAME}}": "John Smith",
      "{{COMPANY_NAME}}": testLead.company,
      "{{COMPANY_REVIEW}}": "4.5 stars with 127 positive reviews",
      "{{SENDER_NAME}}": companySettings.senderName,
      "{{SENDER_EMAIL}}": companySettings.senderEmail,
      "{{COMPANY_SERVICE}}": companySettings.service,
      "{{TARGET_INDUSTRY}}": companySettings.industry,
      "{{WEBSITE_URL}}": companySettings.websiteUrl
    };

    let preview = content;
    Object.entries(variables).forEach(([key, value]) => {
      preview = preview.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
    });
    
    return preview;
  };

  // Validation functions
  const validateCompanySettings = (): boolean => {
    const errors: string[] = [];

    if (!companySettings.companyName.trim()) {
      errors.push(t('companyNameRequired'));
    }

    if (!companySettings.service.trim()) {
      errors.push(t('mainServiceRequired'));
    }

    if (!companySettings.senderName.trim()) {
      errors.push(t('senderNameRequired'));
    }

    if (!companySettings.senderEmail.trim()) {
      errors.push(t('senderEmailRequired'));
    } else if (!isEmailValid(companySettings.senderEmail)) {
      errors.push(t('senderEmailInvalid'));
    }

    if (companySettings.websiteUrl.trim() && !/^https?:\/\/.+\..+/.test(companySettings.websiteUrl)) {
      errors.push(t('websiteURLInvalid'));
    }

    if (errors.length > 0) {
      errors.forEach(error => toast.error(error));
      return false;
    }

    return true;
  };

  const validateEmailTemplate = (): boolean => {
    const errors: string[] = [];

    if (!currentTemplate.subject?.trim()) {
      errors.push(t('emailSubjectRequired'));
    }

    if (!currentTemplate.htmlContent?.trim()) {
      errors.push(t('htmlContentRequired'));
    }

    // Check for required variables in the template
    const htmlContent = currentTemplate.htmlContent || "";
    
    // Check if either LEAD_NAME or OWNER_NAME is present (at least one required)
    const hasPersonName = htmlContent.includes("{{LEAD_NAME}}") || htmlContent.includes("{{OWNER_NAME}}");
    const hasCompanyName = htmlContent.includes("{{COMPANY_NAME}}");
    const hasSenderName = htmlContent.includes("{{SENDER_NAME}}");
    
    const missingVariables = [];
    if (!hasPersonName) {
      missingVariables.push("{{LEAD_NAME}} or {{OWNER_NAME}}");
    }
    if (!hasCompanyName) {
      missingVariables.push("{{COMPANY_NAME}}");
    }
    if (!hasSenderName) {
      missingVariables.push("{{SENDER_NAME}}");
    }

    if (missingVariables.length > 0) {
      errors.push(`Missing required variables: ${missingVariables.join(", ")}`);
    }

    // Warn if text content is missing (not an error, just a warning)
    if (!currentTemplate.textContent?.trim()) {
      toast.error("Text Content is recommended for better email compatibility", {
        duration: 3000,
        icon: "⚠️"
      });
    }

    if (errors.length > 0) {
      errors.forEach(error => toast.error(error));
      return false;
    }

    return true;
  };

  const validateTestEmail = (): boolean => {
    const errors: string[] = [];

    if (!testEmail.trim()) {
      errors.push(t('testEmailRequired'));
    } else if (!isEmailValid(testEmail)) {
      errors.push(t('testEmailInvalid'));
    }

    if (!testLead.name.trim()) {
      errors.push(t('testLeadNameRequired'));
    }

    if (!testLead.company.trim()) {
      errors.push(t('testCompanyRequired'));
    }

    if (!currentTemplate.subject?.trim() || !currentTemplate.htmlContent?.trim()) {
      errors.push(t('saveTemplateFirst'));
    }

    if (errors.length > 0) {
      errors.forEach(error => toast.error(error));
      return false;
    }

    return true;
  };

  // UI state for export options
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Export all templates (7 stages) as JSON bundle
  const exportAllTemplatesJSON = () => {
    const bundle = {
      version: 1,
      templates: templates.map(t => ({
        stage: t.stage,
        subject: t.subject,
        htmlContent: t.htmlContent,
        textContent: t.textContent,
        isActive: t.isActive,
        variables: t.variables,
        timing: t.timing
      }))
    };
    const data = JSON.stringify(bundle, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const filename = `email-templates-bundle.json`;
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('All templates exported as a single JSON file');
  };

  // Export current template as JSON
  const exportTemplateJSON = () => {
    const data = JSON.stringify(currentTemplate, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const filename = `email-template-${currentTemplate.stage || 'template'}.json`;
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Template exported as JSON');
  };

  // Export current template as PDF (simple formatting)
  const exportTemplatePDF = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const margin = 40;
      const maxWidth = doc.internal.pageSize.getWidth() - margin * 2;
      let y = margin;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text(`Template: ${currentTemplate.stage || ''}`, margin, y);
      y += 22;

      doc.setFontSize(12);
      doc.text('Subject:', margin, y);
      doc.setFont('helvetica', 'normal');
      const subjectLines = doc.splitTextToSize(currentTemplate.subject || '', maxWidth);
      doc.text(subjectLines, margin + 60, y);
      y += Math.max(18, subjectLines.length * 14) + 10;

      doc.setFont('helvetica', 'bold');
      doc.text('Text version:', margin, y);
      y += 16;
      doc.setFont('helvetica', 'normal');
      const textLines = doc.splitTextToSize(currentTemplate.textContent || '', maxWidth);
      textLines.forEach((line: string) => {
        if (y > doc.internal.pageSize.getHeight() - margin) {
          doc.addPage();
          y = margin;
        }
        doc.text(line, margin, y);
        y += 14;
      });

      const filename = `email-template-${currentTemplate.stage || 'template'}.pdf`;
      doc.save(filename);
      toast.success('Template exported as PDF');
    } catch (e) {
      console.error(e);
      toast.error('Failed to export PDF');
    }
  };

  // Export current template as DOCX
  const exportTemplateDOCX = async () => {
    try {
      const { Document, Packer, Paragraph, TextRun } = await import('docx');
      const doc = new Document({
        sections: [{
          children: [
            new Paragraph({ children: [ new TextRun({ text: `Template: ${currentTemplate.stage || ''}`, bold: true, size: 28 }) ] }),
            new Paragraph({ children: [ new TextRun({ text: `Subject: ${currentTemplate.subject || ''}`, size: 24 }) ] }),
            new Paragraph({ children: [ new TextRun({ text: '' }) ] }),
            new Paragraph({ children: [ new TextRun({ text: 'Text version:', bold: true, size: 24 }) ] }),
            new Paragraph({ children: [ new TextRun({ text: currentTemplate.textContent || '', size: 22 }) ] }),
          ]
        }]
      });
      const blob = await Packer.toBlob(doc);
      const filename = `email-template-${currentTemplate.stage || 'template'}.docx`;
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Template exported as DOCX');
    } catch (e) {
      console.error(e);
      toast.error('Failed to export DOCX');
    }
  };

  // Import templates: supports single-stage or full bundle
  const importFileRef = useRef<HTMLInputElement | null>(null);
  const importTemplateJSON = async (file: File) => {
    try {
      const isJson = file.name.toLowerCase().endsWith('.json');
      if (!isJson) {
        toast.error('Only JSON files are accepted');
        return;
      }
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data || typeof data !== 'object') {
        toast.error('Invalid JSON');
        return;
      }
      const userId = await auth.getCurrentUserId();
      if (!userId) {
        toast.error('User authentication required. Please login again.');
        return;
      }

      // If it looks like a bundle with templates array → bulk import to server
      if (Array.isArray((data as any).templates)) {
        const res = await fetch('/api/email-templates/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, templates: (data as any).templates })
        });
        const json = await res.json();
        if (json.success) {
          toast.success('All templates imported successfully');
          await loadTemplates();
        } else {
          toast.error(json.error || 'Failed to import bundle');
        }
      } else {
        // Single template fallback: load into editor only
        setCurrentTemplate(prev => ({
          ...prev,
          stage: (data as any).stage || prev.stage,
          subject: (data as any).subject || '',
          htmlContent: (data as any).htmlContent || '',
          textContent: (data as any).textContent || '',
          isActive: (data as any).isActive ?? true,
        }));
        toast.success('Template loaded. Click Save to store it.');
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to import JSON');
    } finally {
      if (importFileRef.current) importFileRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader 
        title={t('emailTemplateManager')} 
        description={t('emailTemplateManagerDescription')}
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadTemplates} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {t('refresh')}
            </Button>
            {/* Export button opens modal */}
            <Button type="button" variant="outline" onClick={() => setIsExportOpen(true)}>
              <Download className="h-4 w-4 mr-2" /> {t('export')}
            </Button>
            {/* Import JSON */}
            <input
              ref={importFileRef}
              type="file"
              accept=".json,application/json"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) importTemplateJSON(file);
              }}
              className="hidden"
              id="import-template-input"
            />
            <Button type="button" variant="outline" onClick={() => importFileRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" /> {t('import')}
            </Button>
            <Button onClick={saveTemplate} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? t('saving') : t('saveTemplate')}
            </Button>
          </div>
        }
      />

      {/* Export Modal */}
      <Dialog open={isExportOpen} onOpenChange={setIsExportOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Export Template</DialogTitle>
            <DialogDescription>
              Choose a format to export the current email template
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3">
            <Button onClick={() => { exportAllTemplatesJSON(); setIsExportOpen(false); }} className="flex items-center gap-2">
              <Download className="h-4 w-4" /> Export ALL (single JSON)
            </Button>
            <Button onClick={() => { exportTemplateJSON(); setIsExportOpen(false); }} className="flex items-center gap-2">
              <Download className="h-4 w-4" /> Export current stage JSON
            </Button>
            <Button onClick={async () => { await exportTemplatePDF(); setIsExportOpen(false); }} className="flex items-center gap-2">
              <Download className="h-4 w-4" /> Export as PDF
            </Button>
            <Button onClick={async () => { await exportTemplateDOCX(); setIsExportOpen(false); }} className="flex items-center gap-2">
              <Download className="h-4 w-4" /> Export as DOCX
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsExportOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Company Settings Sidebar */}
        <Card className="lg:col-span-1">
                      <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                {t('companySettings')}
              </CardTitle>
            </CardHeader>
          <CardContent className="space-y-4">
            {/* Booking Link */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-1">
                Booking Link
                <Badge variant="secondary" className="ml-1">auto</Badge>
              </Label>
              <div className="flex gap-2">
                <Input value={bookingLink} readOnly className="text-xs select-all" />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (bookingLink) {
                      navigator.clipboard.writeText(bookingLink);
                      toast.success('Booking link copied');
                    }
                  }}
                >
                  <Copy className="h-3 w-3 mr-1" /> Copy
                </Button>
              </div>
              {/* CTA preview snippet */}
              <div className="text-xs text-muted-foreground">
                This button snippet can be used in templates:
                <div className="mt-2 p-2 bg-muted rounded overflow-x-auto">
                  <code className="text-[11px] break-all">{`<div style="text-align: center; margin: 35px 0;">
  <a href="${bookingLink || '{{BOOKING_LINK}}'}" 
     style="background: #667eea; color: white; padding: 15px 35px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px 0 rgba(102, 126, 234, 0.4);">
    Let's Schedule a Call
  </a>
</div>`}</code>
                </div>
              </div>
            </div>


            <div className="space-y-2">
              <Label htmlFor="company-name" className="flex items-center gap-1">
                {t('companyName')}
                <span className="text-red-500">*</span>
              </Label>
              <Input 
                id="company-name" 
                value={companySettings.companyName}
                onChange={(e) => setCompanySettings(prev => ({ ...prev, companyName: e.target.value }))}
                placeholder={t('companyNamePlaceholder')}
                className={!isFieldValid(companySettings.companyName) ? "border-red-300 focus:border-red-500" : ""}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="service" className="flex items-center gap-1">
                {t('mainService')}
                <span className="text-red-500">*</span>
              </Label>
              <Input 
                id="service" 
                value={companySettings.service}
                onChange={(e) => setCompanySettings(prev => ({ ...prev, service: e.target.value }))}
                placeholder={t('mainServicePlaceholder')}
                className={!isFieldValid(companySettings.service) ? "border-red-300 focus:border-red-500" : ""}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="industry">{t('targetIndustry')}</Label>
              <Input 
                id="industry" 
                value={companySettings.industry}
                onChange={(e) => setCompanySettings(prev => ({ ...prev, industry: e.target.value }))}
                placeholder={t('targetIndustryPlaceholder')}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="sender-name" className="flex items-center gap-1">
                {t('senderName')}
                <span className="text-red-500">*</span>
              </Label>
              <Input 
                id="sender-name" 
                value={companySettings.senderName}
                onChange={(e) => setCompanySettings(prev => ({ ...prev, senderName: e.target.value }))}
                placeholder={t('senderNamePlaceholder')}
                className={!isFieldValid(companySettings.senderName) ? "border-red-300 focus:border-red-500" : ""}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="sender-email" className="flex items-center gap-1">
                {t('senderEmail')}
                <span className="text-red-500">*</span>
              </Label>
              <Input 
                id="sender-email" 
                type="email"
                value={companySettings.senderEmail}
                onChange={(e) => setCompanySettings(prev => ({ ...prev, senderEmail: e.target.value }))}
                placeholder={t('senderEmailPlaceholder')}
                className={
                  !isFieldValid(companySettings.senderEmail) || 
                  (companySettings.senderEmail.trim() && !isEmailValid(companySettings.senderEmail))
                    ? "border-red-300 focus:border-red-500" : ""
                }
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="website">{t('websiteURL')}</Label>
              <Input 
                id="website" 
                value={companySettings.websiteUrl}
                onChange={(e) => setCompanySettings(prev => ({ ...prev, websiteUrl: e.target.value }))}
                placeholder={t('websiteURLPlaceholder')}
                className={
                  companySettings.websiteUrl.trim() && 
                  !/^https?:\/\/.+\..+/.test(companySettings.websiteUrl)
                    ? "border-red-300 focus:border-red-500" : ""
                }
              />
            </div>

            <Button onClick={saveCompanySettings} className="w-full" variant="outline" disabled={savingSettings}>
              <Save className="h-4 w-4 mr-2" />
              {savingSettings ? t('savingSettings') : t('saveSettings')}
            </Button>

            <Separator />

            {/* Email Timing Settings - Perfect Design */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <Label className="text-sm font-medium">{t('emailTiming')}</Label>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowTimingSettings(!showTimingSettings)}
                  className="text-xs"
                >
                  {showTimingSettings ? t('hide') : t('configure')}
                </Button>
              </div>
              <p className="text-xs text-gray-600 ml-6">{t('configureEmailTiming')}</p>
              
              {showTimingSettings && (
                <div className="space-y-6 mt-6">
                  <div className="flex items-center justify-between ml-6 mr-2">
                    <span className="text-sm font-medium">{t('emailScheduleConfiguration')}</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={resetTimingsToDefault}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      {t('resetToDefault')}
                    </Button>
                  </div>
                  
                  {PIPELINE_STAGES(t).map((stage, index) => {
                    const timing = getEmailTiming(stage.value);
                    const isFirstEmail = index === 0;
                    
                    return (
                      <div key={stage.value} className="space-y-4">
                        <div className="flex items-center gap-4">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-medium ${
                            isFirstEmail 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h3 className="font-medium text-sm">{stage.label}</h3>
                              {isFirstEmail && (
                                <Badge className="text-xs bg-green-100 text-green-700 border-green-300 px-2 py-1">
                                  {t('firstEmail')}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-gray-600 mt-1">{stage.description}</p>
                          </div>
                        </div>
                        
                        <div className="ml-11 space-y-3">
                          <div className="flex gap-4">
                            <div className="flex-1">
                              <Label className="text-xs text-gray-700 block mb-2">{t('waitTime')}</Label>
                              <Input
                                type="number"
                                min="0"
                                max="365"
                                value={timing.delay}
                                onChange={(e) => updateEmailTiming(stage.value, parseInt(e.target.value) || 0, timing.unit)}
                                className="h-9 text-sm w-full"
                                placeholder="0"
                              />
                            </div>
                            <div className="flex-1">
                              <Label className="text-xs text-gray-700 block mb-2">{t('timeUnit')}</Label>
                              <Select 
                                value={timing.unit}
                                onValueChange={(unit: 'minutes' | 'hours' | 'days') => 
                                  updateEmailTiming(stage.value, timing.delay, unit)
                                }
                              >
                                <SelectTrigger className="h-9 text-sm w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="minutes">{t('minutes')}</SelectItem>
                                  <SelectItem value="hours">{t('hours')}</SelectItem>
                                  <SelectItem value="days">{t('days')}</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          
                          <div className={`p-3 rounded-md text-center text-sm font-medium ${
                            timing.delay === 0 
                              ? 'bg-green-100 text-green-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {timing.description}
                          </div>
                          
                          <div className="flex items-center gap-2 text-xs text-gray-500 mt-2">
                            <div className={`w-2 h-2 rounded-full ${
                              isFirstEmail ? 'bg-green-400' : 'bg-blue-400'
                            }`}></div>
                            <span>
                              {isFirstEmail ? 
                                t('startingPoint') : 
                                t('followsPreviousEmail').replace('{delay}', timing.delay.toString()).replace('{unit}', timing.unit)
                              }
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Save Email Timing Settings Button */}
                  <div className="flex justify-center mt-6 pt-4 border-t">
                    <Button
                      onClick={async () => {
                        try {
                          await saveCompanySettings();
                          setHasUnsavedTimingChanges(false);
                          toast.success(t('emailTimingSettingsSavedSuccess'));
                        } catch (error) {
                          toast.error(t('failedToSaveSettings'));
                        }
                      }}
                      disabled={savingSettings}
                      className={`px-6 py-2 transition-colors ${
                        hasUnsavedTimingChanges 
                          ? 'bg-orange-600 hover:bg-orange-700 text-white' 
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      {savingSettings ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : hasUnsavedTimingChanges ? (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          {t('saveChanges')} ({t('unsaved')})
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          {t('emailTimingSettingsSaved')}
                        </>
                      )}
                    </Button>
                  </div>
                  
                  {/* Development Email Testing */}
                  {process.env.NODE_ENV === 'development' && (
                    <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <TestTube className="h-4 w-4 text-yellow-600" />
                          <Label className="text-sm font-medium text-yellow-800">{t('developmentTesting')}</Label>
                        </div>
                      </div>
                      <p className="text-xs text-yellow-700 mb-3">
                        {t('devTestingDescription')}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => {
                            toast.error("🚨 DEV Email Automation DISABLED - This was causing timing conflicts! Use the production system instead.", { duration: 8000 });
                          }}
                          disabled={true}
                          variant="outline"
                          className="text-red-700 border-red-300 hover:bg-red-100 opacity-50"
                          size="sm"
                        >
                          <TestTube className="h-3 w-3 mr-1" />
                          {t('disabled')}
                        </Button>
                        <Button
                          onClick={() => {
                            toast.info(t('runScriptCommand'), { duration: 10000 });
                          }}
                          variant="ghost"
                          size="sm"
                          className="text-yellow-700"
                        >
                          <Info className="h-3 w-3 mr-1" />
                          {t('showScriptCommand')}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <Separator />

            {/* Template Variables Reference */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('availableVariables')}</Label>
              <div className="space-y-1">
                {TEMPLATE_VARIABLES(t).map((variable) => (
                  <div key={variable.var} className="text-xs">
                    <code className="bg-muted px-1 py-0.5 rounded text-xs">{variable.var}</code>
                    <p className="text-muted-foreground mt-1">{variable.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Test Email Section */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-1">
                {t('testEmail')}
                <span className="text-red-500">*</span>
              </Label>
              <Input 
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder={t('testEmailPlaceholder')}
                type="email"
                className={
                  !isFieldValid(testEmail) || 
                  (testEmail.trim() && !isEmailValid(testEmail))
                    ? "border-red-300 focus:border-red-500" : ""
                }
              />
              <div className="grid grid-cols-2 gap-2">
                <Input 
                  value={testLead.name}
                  onChange={(e) => setTestLead(prev => ({ ...prev, name: e.target.value }))}
                  placeholder={t('testName')}
                  className={`text-xs ${!isFieldValid(testLead.name) ? "border-red-300 focus:border-red-500" : ""}`}
                />
                <Input 
                  value={testLead.company}
                  onChange={(e) => setTestLead(prev => ({ ...prev, company: e.target.value }))}
                  placeholder={t('testCompany')}
                  className={`text-xs ${!isFieldValid(testLead.company) ? "border-red-300 focus:border-red-500" : ""}`}
                />
              </div>
              <Button 
                onClick={sendTestEmail} 
                disabled={testing || !testEmail}
                size="sm"
                className="w-full"
                variant="outline"
              >
                <TestTube className="h-3 w-3 mr-2" />
                {testing ? t('sending') : t('sendTest')}
              </Button>
            </div>

            <Separator />

            {/* Validation Summary */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('validationStatus')}</Label>
              <div className="space-y-1 text-xs">
                <div className={`flex items-center gap-2 ${isFieldValid(companySettings.companyName) ? 'text-green-600' : 'text-red-600'}`}>
                  {isFieldValid(companySettings.companyName) ? '✓' : '✗'} {t('validationCompanyName')}
                </div>
                <div className={`flex items-center gap-2 ${isFieldValid(companySettings.service) ? 'text-green-600' : 'text-red-600'}`}>
                  {isFieldValid(companySettings.service) ? '✓' : '✗'} {t('validationMainService')}
                </div>
                <div className={`flex items-center gap-2 ${isFieldValid(companySettings.senderName) ? 'text-green-600' : 'text-red-600'}`}>
                  {isFieldValid(companySettings.senderName) ? '✓' : '✗'} {t('validationSenderName')}
                </div>
                <div className={`flex items-center gap-2 ${isFieldValid(companySettings.senderEmail) && isEmailValid(companySettings.senderEmail) ? 'text-green-600' : 'text-red-600'}`}>
                  {isFieldValid(companySettings.senderEmail) && isEmailValid(companySettings.senderEmail) ? '✓' : '✗'} {t('validationSenderEmail')}
                </div>
                <div className={`flex items-center gap-2 ${!companySettings.websiteUrl.trim() || /^https?:\/\/.+\..+/.test(companySettings.websiteUrl) ? 'text-green-600' : 'text-orange-600'}`}>
                  {!companySettings.websiteUrl.trim() || /^https?:\/\/.+\..+/.test(companySettings.websiteUrl) ? '✓' : '⚠'} {t('validationWebsiteURL')}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Template Editor */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                {t('emailTemplates')}
              </CardTitle>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 rounded-md mr-2">
                  <Sparkles className="h-4 w-4 text-blue-600" />
                  <span className="text-xs text-blue-700 font-medium">
                    AI generates content during email automation
                  </span>
                </div>
                <Button 
                  onClick={quickGenerateAndSave}
                  disabled={generating}
                  variant="default"
                  size="sm"
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  {generating ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Generating All 7 Templates...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Quick Generate All 7 Templates
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4 w-full">
                {PIPELINE_STAGES(t).map((stage) => {
                  const status = getTemplateStatus(stage.value);
                  const StatusIcon = status.icon;
                  return (
                    <TabsTrigger key={stage.value} value={stage.value} className="flex-1">
                      <div className="flex items-center gap-2">
                        <StatusIcon className={`h-3 w-3 ${status.color}`} />
                        <span>{stage.label}</span>
                      </div>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
              
              {PIPELINE_STAGES(t).map((stage) => {
                const currentTiming = getEmailTiming(stage.value);
                return (
                <TabsContent key={stage.value} value={stage.value} className="space-y-4">
                  {/* Timing Display */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-800">{t('emailTiming')}</span>
                      </div>
                      <Badge variant="outline" className="text-blue-700 border-blue-300">
                        {currentTiming.description}
                      </Badge>
                    </div>
                    <div className="text-xs text-blue-600 mt-1">
                      {stage.value === 'called_once' ? 
                        t('thisIsFirstEmail') : 
                        t('emailWillBeSent').replace('{delay}', currentTiming.delay.toString()).replace('{unit}', currentTiming.unit)
                      }
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="subject" className="flex items-center gap-1">
                        {t('emailSubject')}
                        <span className="text-red-500">*</span>
                      </Label>
                      <div className="flex items-center gap-2">
                        <Label htmlFor="active" className="text-sm">{t('active')}</Label>
                        <Switch 
                          id="active"
                          checked={currentTemplate.isActive || false}
                          onCheckedChange={(checked) => 
                            setCurrentTemplate(prev => ({ ...prev, isActive: checked }))
                          }
                        />
                      </div>
                    </div>
                    <Input 
                      id="subject"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      placeholder="Enter plain email subject (no AI)"
                      className={!isFieldValid(emailSubject) ? "border-red-300 focus:border-red-500" : ""}
                    />
                  </div>
                  
                  <div className="space-y-4">
                    {/* Content Prompt - AI will generate during email automation */}
                    <div className="space-y-2">
                      <Label htmlFor="content-prompt" className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-blue-600" />
                        Content Prompt (AI generates during email automation)
                        <span className="text-red-500">*</span>
                      </Label>
                      <div className="mb-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-xs text-blue-700">
                          <strong>How it works:</strong> This prompt will be used by AI to generate personalized content for each lead when the email automation runs. The AI will combine your prompt with lead data (name, company, reviews, etc.) to create unique content.
                        </p>
                      </div>
                      <Textarea 
                        id="content-prompt"
                        value={contentPrompt}
                        onChange={(e) => setContentPrompt(e.target.value)}
                        className="min-h-[120px]"
                        placeholder="Example: 'Write about how we can help them improve their lead generation using AI. Reference their company reviews to show we did research. Mention our proven track record. Keep it friendly but professional. Include a call-to-action to schedule a call.'"
                      />
                      <div className="text-xs text-gray-600">
                        💡 <strong>Tip:</strong> Be specific about tone, key points to mention, and what action you want the lead to take. The AI will personalize this for each recipient.
                      </div>
                    </div>

                    {/* Signature - Manual */}
                    <div className="space-y-2">
                      <Label htmlFor="email-signature">
                        Signature (Manual - No AI)
                      </Label>
                      <Textarea 
                        id="email-signature"
                        value={emailSignature}
                        onChange={(e) => setEmailSignature(e.target.value)}
                        className="min-h-[100px] font-mono text-sm"
                        placeholder={`Best regards,<br>\n{​{SENDER_NAME}​}<br>\n{​{SENDER_EMAIL}​}<br>\n{​{WEBSITE_URL}​}`}
                      />
                    </div>

                    {/* Media Links */}
                    <div className="space-y-2">
                      <Label htmlFor="media-links">
                        Media Content (Images, Videos - Optional)
                      </Label>
                      <Textarea 
                        id="media-links"
                        value={mediaLinks}
                        onChange={(e) => setMediaLinks(e.target.value)}
                        className="min-h-[80px] font-mono text-sm"
                        placeholder='<img src="https://example.com/image.jpg" style="max-width: 100%;" />\n<a href="https://youtube.com/video">Watch Video</a>'
                      />
                    </div>

                    {/* HTML Design - Optional */}
                    <div className="space-y-2">
                      <Label htmlFor="html-design">
                        Custom HTML Design (Optional - Advanced)
                      </Label>
                      <Textarea 
                        id="html-design"
                        value={htmlDesign}
                        onChange={(e) => setHtmlDesign(e.target.value)}
                        className="min-h-[150px] font-mono text-xs"
                        placeholder="Leave empty to use default design, or paste custom HTML wrapper here..."
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="text-sm text-muted-foreground">
                      {stage.description}
                    </div>
                  </div>
                </TabsContent>
                );
              })}
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Template Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle>{t('templateStatusOverview')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PIPELINE_STAGES(t).map((stage) => {
              const template = templates.find(t => t.stage === stage.value);
              const status = getTemplateStatus(stage.value);
              const timing = getEmailTiming(stage.value);
              const StatusIcon = status.icon;
              
              return (
                <div key={stage.value} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium">{stage.label}</h3>
                    <StatusIcon className={`h-4 w-4 ${status.color}`} />
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{stage.description}</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <Badge 
                        variant={template?.isActive ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {status.status}
                      </Badge>
                      {template && (
                        <span className="text-muted-foreground">
                          {t('updated')} {new Date(template.updatedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-blue-600">
                      <Clock className="h-3 w-3" />
                      <span>{timing.description}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}