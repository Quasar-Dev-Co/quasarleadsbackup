"use client";

import { useState, useEffect } from "react";
import { SectionHeader } from "@/components/ui/section-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Mail, 
  Send, 
  RefreshCw, 
  Settings, 
  Bot, 
  MessageSquare, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Eye,
  Edit,
  Trash2,
  Plus,
  Sparkles,
  Brain,
  Zap,
  X,
  Copy,
  Reply,
  Star,
  Building
} from "lucide-react";
import { toast } from "sonner";
import { useEmailResponseTranslations } from "@/hooks/use-email-response-translations";
import { auth } from "@/lib/auth";

// Type definitions
interface IncomingEmail {
  id: string;
  leadId: string;
  leadName: string;
  leadEmail: string;
  leadCompany: string;
  subject: string;
  content: string;
  receivedAt: string;
  status: 'unread' | 'read' | 'responded' | 'pending_ai';
  originalEmailId?: string; // Reference to the email they're replying to
  sentiment: 'positive' | 'negative' | 'neutral' | 'interested' | 'not_interested';
  isReply: boolean; // Whether this is a reply to our outgoing email
  isRecent: boolean; // Whether this is from the last 20 minutes
  threadId?: string; // Thread ID for email grouping
  metadata?: {
    originalEmailStage?: string; // Which stage of our email sequence this is replying to
    isReplyToSequence?: boolean; // Whether this is a reply to our email sequence
  };
}

interface AIResponse {
  id: string;
  incomingEmailId: string;
  generatedSubject: string;
  generatedContent: string;
  confidence: number;
  reasoning: string;
  status: 'draft' | 'approved' | 'sent' | 'rejected';
  createdAt: string;
  sentAt?: string;
  responseType: 'interested' | 'objection_handling' | 'meeting_request' | 'pricing_inquiry' | 'general';
}

interface AISettings {
  isEnabled: boolean;
  autoSendThreshold: number; // Confidence threshold for auto-sending (0-100)
  defaultTone: 'professional' | 'friendly' | 'casual' | 'formal';
  includeCompanyInfo: boolean;
  maxResponseLength: number;
  customInstructions: string;
  responsePrompt: string;
  companyName: string;
  senderName: string;
  senderEmail: string;
  signature: string;
}

// Add validation helpers above the component
const isValidEmail = (email: string) => /\S+@\S+\.\S+/.test(email);

export default function EmailResponses() {
  const { t } = useEmailResponseTranslations();
  
  // State management
  const [activeTab, setActiveTab] = useState("inbox");
  const [incomingEmails, setIncomingEmails] = useState<IncomingEmail[]>([]);
  const [aiResponses, setAIResponses] = useState<AIResponse[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<IncomingEmail | null>(null);
  const [selectedResponse, setSelectedResponse] = useState<AIResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  
  // Dialog states
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [showResponseEditor, setShowResponseEditor] = useState(false);
  
  // AI Settings
  const [aiSettings, setAISettings] = useState<AISettings>({
    isEnabled: true,
    autoSendThreshold: 85,
    defaultTone: 'professional',
    includeCompanyInfo: true,
    maxResponseLength: 300,
    customInstructions: 'Always be helpful and focus on booking meetings. Mention our AI-powered lead generation services when relevant.',
    responsePrompt: `**CRITICAL DIRECTIVES: Failure to follow these rules will result in an error. This is not a suggestion.**\n\n1.  **SIGNATURE:** The response MUST end with **EXACTLY** this signature:\n    Warmly,\n    Team QuasarSEO\n\n2.  **NO PLACEHOLDERS:** You MUST NOT use placeholders like \`[Your Name]\` or \`[insert their concern]\` in your final output. You are to generate the content naturally based on the user's email.\n3.  **TONE:** The tone must be warm, human, and helpful. ABSOLUTELY NO sales pressure.\n\n---\n\n**Your Persona:** You are a calm, engaged entrepreneur who truly listens. Your goal is to establish a connection and gently guide them to schedule a casual Zoom meeting.\n\n**Response Structure (Follow this EXACTLY):**\n\n**1. Acknowledge with Genuine Attention:**\nShow empathy and understanding based on the client's email.\n\n**2. Ask an Open-Ended Follow-up Question:**\nInvite dialogue with a soft, open question.\n\n**3. Gently Suggest a Zoom Call (If appropriate):**\nOffer a low-pressure call and provide the booking link.\n*Rule:* When user asked for meeting then ,You have to suggest a call, ONLY send or mention this link: https://testqlagain.vercel.app/clientbooking dont asked for any date and time, just send the link and tell got to the link and book the meeting.\n\n**4. End with a Friendly, Open Tone:**\nLet them know they can reply at their convenience.\n\n---\n\n**PERFECT RESPONSE EXAMPLE (This is a model for tone and structure, not for copy-pasting):**\n\nHi [Client's Name],\n\nThanks so much for reaching out. I completely understand what you're looking for and how important it is to find the right path forward. It sounds like you're really thinking about [their specific concern, which you will identify] right now, and I’d love to help however I can.\n\nWhat has been the most important factor for you in this decision? I’d love to hear more about what’s on your mind.\n\nIf it feels right, maybe we can take a few minutes to look at this together. I’d be happy to jump on a quick Zoom call to brainstorm ideas and see what could work best for you. Here’s a link to book a time that works for you: https://testqlagain.vercel.app/clientbooking\n\nNo rush at all — feel free to reach out when it’s convenient for you. I’m looking forward to hearing from you soon.\n\nWarmly,\nTeam QuasarSEO\n\n---\n**FINAL CHECK: Before responding, verify you have followed all CRITICAL DIRECTIVES.**`,
    companyName: 'QuasarSEO',
    senderName: 'Team QuasarSEO',
    senderEmail: 'info@quasarseo.nl',
    signature: 'Warmly,\nTeam QuasarSEO'
  });

  // Form states
  const [editingResponse, setEditingResponse] = useState({
    subject: '',
    content: ''
  });

  // Add validation state
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});

  // Credentials gating state
  const [credentials, setCredentials] = useState<any>(null);
  const [missingCreds, setMissingCreds] = useState<string[]>([]);
  const [credsLoading, setCredsLoading] = useState<boolean>(true);
  const requiredCreds = [
    'IMAP_HOST','IMAP_PORT','IMAP_USER','IMAP_PASSWORD',
    'SMTP_HOST','SMTP_PORT','SMTP_USER','SMTP_PASSWORD',
    'OPENAI_API_KEY'
  ];

  // Load credentials for current user
  useEffect(() => {
    (async () => {
      try {
        setCredsLoading(true);
        const authHeader = auth.getAuthHeader();
        const res = await fetch('/api/credentials', {
          headers: authHeader ? { Authorization: authHeader } : undefined,
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setCredentials(data.credentials || {});
          const missing = requiredCreds.filter((k) => !data.credentials || !data.credentials[k]);
          setMissingCreds(missing);
        } else {
          setMissingCreds(requiredCreds);
        }
      } catch {
        setMissingCreds(requiredCreds);
      } finally {
        setCredsLoading(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const credsOK = !credsLoading && missingCreds.length === 0;

  // Load data only when credentials are present
  useEffect(() => {
    if (credsOK) {
      loadIncomingEmails();
      loadAIResponses();
      loadAISettings();
    }
  }, [credsOK]);

  // Load incoming emails from API
  const loadIncomingEmails = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/email-responses/incoming', {
        headers: (() => {
          const h = auth.getAuthHeader();
          return h ? { Authorization: h } : { 'Content-Type': 'application/json' } as any;
        })()
      });
      const data = await response.json();
      
      if (data.success) {
        // Filter emails for:
        // 1. Replied emails (isReply = true)
        // 2. Emails from the last 20 minutes (isRecent = true)
        // 3. Unread emails that need processing
        const filteredEmails = (data.emails || []).filter((email: IncomingEmail) => {
          // Always show unread emails
          if (email.status === 'unread') return true;
          
          // Show recent emails (from last 20 minutes)
          if (email.isRecent) return true;
          
          // Show replied emails
          if (email.isReply) return true;
          
          // Show emails that haven't been responded to yet
          if (email.status !== 'responded') return true;
          
          return false;
        });

        setIncomingEmails(filteredEmails);
        console.log(`📧 Loaded ${filteredEmails.length} filtered emails (unread, recent, and replies)`);
      } else {
        toast.error(t('failedToLoadEmails'));
      }
    } catch (error) {
      console.error('Error loading incoming emails:', error);
      toast.error(t('failedToLoadEmails'));
    } finally {
      setLoading(false);
    }
  };

  // Load AI responses from API
  const loadAIResponses = async () => {
    try {
      const response = await fetch('/api/email-responses/ai-responses', {
        headers: (() => {
          const h = auth.getAuthHeader();
          return h ? { Authorization: h } : {} as any;
        })()
      });
      const data = await response.json();
      
      if (data.success) {
        setAIResponses(data.responses || []);
      }
    } catch (error) {
      console.error('Error loading AI responses:', error);
    }
  };

  // Load AI settings
  const loadAISettings = async () => {
    try {
      const response = await fetch('/api/email-responses/settings', {
        headers: (() => {
          const h = auth.getAuthHeader();
          return h ? { Authorization: h } : { 'Content-Type': 'application/json' } as any;
        })()
      });
      const data = await response.json();
      
      if (data.success && data.settings) {
        setAISettings(prev => ({ ...prev, ...data.settings }));
      }
    } catch (error) {
      console.error('Error loading AI settings:', error);
    }
  };

  // Generate AI response for an email
  const generateAIResponse = async (email: IncomingEmail) => {
    try {
      setGenerating(true);
      toast.loading(`🤖 ${t('generatingResponse')}`, { duration: 10000 });
      
      const response = await fetch('/api/email-responses/generate', {
        method: 'POST',
        headers: (() => {
          const h = auth.getAuthHeader();
          return { 'Content-Type': 'application/json', ...(h ? { Authorization: h } : {}) } as any;
        })(),
        body: JSON.stringify({
          incomingEmailId: email.id,
          leadInfo: {
            name: email.leadName,
            email: email.leadEmail,
            company: email.leadCompany
          },
          emailContent: email.content,
          emailSubject: email.subject,
          aiSettings
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success(`🤖 ${t('responseGenerated')} (${data.response.confidence}% ${t('confidence').toLowerCase()})`);
        setSelectedResponse(data.response);
        setEditingResponse({
          subject: data.response.generatedSubject,
          content: data.response.generatedContent
        });
        setShowResponseEditor(true);
        
        // Refresh AI responses
        loadAIResponses();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error('Error generating AI response:', error);
              toast.error(`${t('failedToGenerateResponse')}: ${error.message}`);
    } finally {
      setGenerating(false);
    }
  };

  // Send AI response
  const sendAIResponse = async (responseId: string) => {
    try {
      setSending(true);
              toast.loading(`📧 ${t('sendingResponse')}`, { duration: 5000 });
      
      const response = await fetch('/api/email-responses/send', {
        method: 'POST',
        headers: (() => {
          const h = auth.getAuthHeader();
          return { 'Content-Type': 'application/json', ...(h ? { Authorization: h } : {}) } as any;
        })(),
        body: JSON.stringify({
          responseId,
          customSubject: editingResponse.subject,
          customContent: editingResponse.content
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success(`✅ ${t('responseSent')}`);
        setShowResponseEditor(false);
        
        // Refresh data
        loadIncomingEmails();
        loadAIResponses();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error('Error sending AI response:', error);
              toast.error(`${t('failedToSendResponse')}: ${error.message}`);
    } finally {
      setSending(false);
    }
  };

  // Save AI settings
  const saveAISettings = async () => {
    try {
      const authHeader = auth.getAuthHeader();
      const headers: any = { 'Content-Type': 'application/json' };
      if (authHeader) {
        headers.Authorization = authHeader;
      }

      const response = await fetch('/api/email-responses/settings', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(aiSettings)
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success(`⚙️ ${t('settingsSaved')}`);
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error('Error saving AI settings:', error);
              toast.error(`${t('failedToSaveSettings')}: ${error.message}`);
    }
  };

  // Refresh all data
  const handleRefresh = () => {
    setRefreshing(true);
    Promise.all([
      loadIncomingEmails(),
      loadAIResponses()
    ]).then(() => {
      setRefreshing(false);
              toast.success(`🔄 ${t('refresh')} ${t('completed')}`);
    });
  };

  // Get status badge color
  const getStatusBadge = (status: string) => {
    const variants = {
      'unread': 'bg-blue-100 text-blue-800',
      'read': 'bg-gray-100 text-gray-800', 
      'responded': 'bg-green-100 text-green-800',
      'pending_ai': 'bg-yellow-100 text-yellow-800'
    };
    return variants[status as keyof typeof variants] || 'bg-gray-100 text-gray-800';
  };

  // Get sentiment badge
  const getSentimentBadge = (sentiment: string) => {
    const variants = {
      'positive': 'bg-green-100 text-green-800',
      'interested': 'bg-blue-100 text-blue-800',
      'neutral': 'bg-gray-100 text-gray-800',
      'negative': 'bg-red-100 text-red-800',
      'not_interested': 'bg-orange-100 text-orange-800'
    };
    return variants[sentiment as keyof typeof variants] || 'bg-gray-100 text-gray-800';
  };

  // Filter emails by status
  const getFilteredEmails = () => {
    // First apply the tab filter
    let filtered = [...incomingEmails];
    
    switch (activeTab) {
      case 'unread':
        filtered = filtered.filter(email => email.status === 'unread');
        break;
      case 'pending':
        filtered = filtered.filter(email => email.status === 'pending_ai');
        break;
      case 'responded':
        filtered = filtered.filter(email => email.status === 'responded');
        break;
    }

    // Sort by date, newest first
    filtered.sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());
    
    return filtered;
  };

  const filteredEmails = getFilteredEmails();

  // Validation logic
  const validateSettings = (settings: AISettings) => {
    const errors: { [key: string]: string } = {};
    if (!settings.companyName) errors.companyName = 'Company name is required.';
    if (!settings.senderName) errors.senderName = 'Sender name is required.';
    if (!settings.senderEmail) errors.senderEmail = 'Sender email is required.';
    else if (!isValidEmail(settings.senderEmail)) errors.senderEmail = 'Invalid email address.';
    if (settings.maxResponseLength < 50 || settings.maxResponseLength > 1000) errors.maxResponseLength = 'Must be between 50 and 1000.';
    if (settings.autoSendThreshold < 0 || settings.autoSendThreshold > 100) errors.autoSendThreshold = 'Must be between 0 and 100.';
    if (!settings.responsePrompt) errors.responsePrompt = 'Prompt is required.';
    if (!settings.signature) errors.signature = 'Signature is required.';
    return errors;
  };

  // Validate on change
  useEffect(() => {
    setValidationErrors(validateSettings(aiSettings));
  }, [aiSettings]);

  // Compute isValid
  const isValid = Object.keys(validationErrors).length === 0;

  if (credsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] text-zinc-400">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" /> Loading email response configuration...
      </div>
    );
  }

  if (!credsOK) {
    return (
      <div className="space-y-8 p-6">
        <SectionHeader title="Email Responses" description="Manage and respond to incoming emails" />
        <Card className="border-red-300 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" /> Email Responses Disabled
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-red-800">
            <p>Missing required credentials. Please add the following in Account Settings → Credentials:</p>
            <ul className="list-disc ml-6">
              {missingCreds.map((k) => (<li key={k}>{k}</li>))}
            </ul>
            <div className="pt-2">
              <Button onClick={() => window.location.assign('/account-settings')}>Go to Credentials</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      {/* Header Section */}
      <div className="flex justify-between items-start">
        <SectionHeader
          title={t('emailResponseManager')}
          description={t('emailResponseManagerDescription')}
        />
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={refreshing}
            title={t('refresh')}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="bg-zinc-900/50 border-zinc-700">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-400">{t('totalEmails')}</p>
                <p className="text-2xl font-bold text-zinc-200">{incomingEmails.length}</p>
              </div>
              <Mail className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-zinc-900/50 border-zinc-700">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-400">{t('unreadEmails')}</p>
                <p className="text-2xl font-bold text-zinc-200">
                  {incomingEmails.filter(e => e.status === 'unread').length}
                </p>
              </div>
              <MessageSquare className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-zinc-900/50 border-zinc-700">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-400">{t('aiGeneratedResponses')}</p>
                <p className="text-2xl font-bold text-zinc-200">{aiResponses.length}</p>
              </div>
              <Bot className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-zinc-900/50 border-zinc-700">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-400">{t('respondedEmails')}</p>
                <p className="text-2xl font-bold text-zinc-200">
                  {incomingEmails.filter(e => e.status === 'responded').length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-zinc-900/50 border-zinc-700">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-400">Sequence Replies</p>
                <p className="text-2xl font-bold text-zinc-200">
                  {incomingEmails.filter(e => e.metadata?.isReplyToSequence).length}
                </p>
              </div>
              <Sparkles className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card className="bg-zinc-900/50 border-zinc-700">
        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="inbox">{t('inbox')}</TabsTrigger>
              <TabsTrigger value="unread">{t('unread')}</TabsTrigger>
              <TabsTrigger value="pending">{t('pendingAI')}</TabsTrigger>
              <TabsTrigger value="responded">{t('responded')}</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-8 w-8 animate-spin text-zinc-400" />
                  <span className="ml-2 text-zinc-400">{t('loadingEmails')}</span>
                </div>
              ) : filteredEmails.length === 0 ? (
                <div className="text-center py-12">
                  <Mail className="h-16 w-16 text-zinc-400 mx-auto mb-4" />
                  <p className="text-zinc-400 text-lg">{t('noEmailsFound')}</p>
                  <p className="text-zinc-500 text-sm">{t('emailResponseManagerDescription')}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredEmails.map((email) => (
                    <Card key={email.id} className="bg-zinc-800/50 border-zinc-600 hover:bg-zinc-800/70 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-medium text-zinc-200 truncate">
                                {email.leadName} ({email.leadCompany})
                              </h3>
                              <Badge className={getStatusBadge(email.status)}>
                                {email.status.replace('_', ' ')}
                              </Badge>
                              <Badge className={getSentimentBadge(email.sentiment)}>
                                {email.sentiment.replace('_', ' ')}
                              </Badge>
                              {email.metadata?.isReplyToSequence && (
                                <Badge className="bg-green-600 hover:bg-green-700 text-white">
                                  <Sparkles className="h-3 w-3 mr-1" />
                                  Sequence Reply
                                </Badge>
                              )}
                              {email.metadata?.originalEmailStage && (
                                <Badge className="bg-blue-600 hover:bg-blue-700 text-white">
                                  {email.metadata.originalEmailStage.replace('_', ' ')}
                                </Badge>
                              )}
                              {(email as any).conversationCount && (
                                <Badge className={`${(email as any).conversationCount >= 3 ? 'bg-red-600 hover:bg-red-700' : 'bg-yellow-600 hover:bg-yellow-700'} text-white`}>
                                  Reply #{(email as any).conversationCount}
                                </Badge>
                              )}
                              {(email as any).isThirdReply && (
                                <Badge className="bg-orange-600 hover:bg-orange-700 text-white">
                                  <MessageSquare className="h-3 w-3 mr-1" />
                                  Dutch Template
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-zinc-300 font-medium mb-1">
                              {t('subject')}: {email.subject}
                            </p>
                            <p className="text-sm text-zinc-400 line-clamp-2">
                              {email.content}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-zinc-500">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(email.receivedAt).toLocaleDateString()}
                              </span>
                              <span>{email.leadEmail}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedEmail(email);
                                setShowEmailPreview(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {email.status !== 'responded' && !(email as any).isThirdReply && (
                              <Button
                                size="sm"
                                onClick={() => generateAIResponse(email)}
                                disabled={generating}
                                className="bg-purple-600 hover:bg-purple-700 text-white"
                              >
                                {generating ? (
                                  <RefreshCw className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <Bot className="h-4 w-4 mr-1" />
                                    {t('generateResponse')}
                                  </>
                                )}
                              </Button>
                            )}
                            {(email as any).isThirdReply && (
                              <Badge className="bg-orange-600 text-white px-3 py-1">
                                <MessageSquare className="h-3 w-3 mr-1" />
                                Auto Dutch Template
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Email Preview Dialog */}
      <Dialog open={showEmailPreview} onOpenChange={setShowEmailPreview}>
        <DialogContent className="min-w-[70vw] max-w-[1200px] max-h-[90vh] bg-zinc-900 border-zinc-700 flex flex-col">
          <DialogHeader className="border-b border-zinc-700 pb-4 flex-shrink-0">
            <DialogTitle className="text-zinc-200 flex items-center gap-2">
              <Mail className="h-5 w-5" />
              {t('emailPreview')}
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              {t('emailPreview')}
            </DialogDescription>
          </DialogHeader>
          
          {selectedEmail && (
            <div className="flex flex-col flex-1 min-h-0">
              {/* Email Header */}
              <div className="bg-zinc-800/50 p-6 border-b border-zinc-700 flex-shrink-0">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold text-sm">
                          {selectedEmail.leadName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-zinc-200">
                          {selectedEmail.leadName}
                        </h3>
                        <p className="text-sm text-zinc-400">{selectedEmail.leadEmail}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-zinc-400">
                      <Building className="h-4 w-4" />
                      <span>{selectedEmail.leadCompany}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusBadge(selectedEmail.status)}>
                      {selectedEmail.status.replace('_', ' ')}
                    </Badge>
                    <Badge className={getSentimentBadge(selectedEmail.sentiment)}>
                      {selectedEmail.sentiment.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-zinc-400" />
                    <span className="text-sm text-zinc-400">
                      {t('received')}: {new Date(selectedEmail.receivedAt).toLocaleString()}
                    </span>
                  </div>
                  {selectedEmail.isReply && (
                    <div className="flex items-center gap-2">
                      <Reply className="h-4 w-4 text-green-400" />
                      <span className="text-sm text-green-400">{t('isReply')}</span>
                    </div>
                  )}
                  {selectedEmail.isRecent && (
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-yellow-400" />
                      <span className="text-sm text-yellow-400">{t('isRecent')}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Email Content */}
              <div className="flex-1 overflow-y-auto p-6 min-h-0">
                <div className="max-w-3xl mx-auto">
                  {/* Subject Line */}
                  <div className="mb-6">
                    <h2 className="text-xl font-semibold text-zinc-200 mb-2">{t('subject')}</h2>
                    <div className="bg-zinc-800/50 p-4 rounded-lg border border-zinc-600">
                      <p className="text-zinc-200 font-medium">{selectedEmail.subject}</p>
                    </div>
                  </div>

                  {/* Email Body */}
                  <div>
                    <h3 className="text-lg font-semibold text-zinc-200 mb-3">{t('content')}</h3>
                    <div className="bg-white text-zinc-900 rounded-lg shadow-lg overflow-hidden">
                      {/* Email Header */}
                      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-600">{t('from')}:</p>
                            <p className="font-medium">{selectedEmail.leadName} &lt;{selectedEmail.leadEmail}&gt;</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-600">{t('date')}:</p>
                            <p className="text-sm">{new Date(selectedEmail.receivedAt).toLocaleDateString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Email Content */}
                      <div className="px-6 py-6">
                        <div className="prose prose-sm max-w-none">
                          <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                            {selectedEmail.content}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Email Metadata */}
                  <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="bg-zinc-800/50 p-4 rounded-lg border border-zinc-600">
                      <h4 className="font-medium text-zinc-200 mb-2">{t('emailDetails')}</h4>
                      <div className="space-y-1 text-zinc-400">
                        <div className="flex justify-between">
                                                      <span>{t('status')}:</span>
                          <span className="text-zinc-200">{selectedEmail.status.replace('_', ' ')}</span>
                        </div>
                        <div className="flex justify-between">
                                                      <span>{t('sentiment')}:</span>
                          <span className="text-zinc-200">{selectedEmail.sentiment.replace('_', ' ')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Thread ID:</span>
                          <span className="text-zinc-200">{selectedEmail.threadId || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Lead ID:</span>
                          <span className="text-zinc-200">{selectedEmail.leadId}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-zinc-800/50 p-4 rounded-lg border border-zinc-600">
                      <h4 className="font-medium text-zinc-200 mb-2">{t('actions')}</h4>
                      <div className="space-y-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => {
                            navigator.clipboard.writeText(selectedEmail.content);
                            toast.success(`${t('copyContent')} ${t('completed')}`);
                          }}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          {t('copyContent')}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => {
                            navigator.clipboard.writeText(selectedEmail.leadEmail);
                            toast.success(`${t('copyEmailAddress')} ${t('completed')}`);
                          }}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          {t('copyEmailAddress')}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="border-t border-zinc-700 pt-4 flex-shrink-0">
            <Button
              variant="outline"
              onClick={() => setShowEmailPreview(false)}
            >
              {t('close')}
            </Button>
            {selectedEmail && selectedEmail.status !== 'responded' && (
              <Button
                onClick={() => {
                  setShowEmailPreview(false);
                  generateAIResponse(selectedEmail);
                }}
                disabled={generating}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {generating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    {t('generatingResponse')}
                  </>
                ) : (
                  <>
                    <Bot className="h-4 w-4 mr-2" />
                    {t('generateResponse')}
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Response Editor Dialog */}
      <Dialog open={showResponseEditor} onOpenChange={setShowResponseEditor}>
        <DialogContent className="max-w-4xl bg-zinc-900 border-zinc-700">
          <DialogHeader>
            <DialogTitle className="text-zinc-200 flex items-center gap-2">
              <Brain className="h-5 w-5" />
              {t('editResponse')}
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              {t('editResponseDescription')}
            </DialogDescription>
          </DialogHeader>
          {selectedResponse && (
            <div className="space-y-4">
              {/* AI Confidence and Reasoning */}
              <div className="bg-zinc-800/50 p-4 rounded-lg border border-zinc-600">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-zinc-300">{t('confidence')}</span>
                  <Badge className={selectedResponse.confidence >= 80 ? 'bg-green-100 text-green-800' : 
                                  selectedResponse.confidence >= 60 ? 'bg-yellow-100 text-yellow-800' : 
                                  'bg-red-100 text-red-800'}>
                    {selectedResponse.confidence}%
                  </Badge>
                </div>
                <p className="text-sm text-zinc-400">{selectedResponse.reasoning}</p>
              </div>

              {/* Edit Subject */}
              <div>
                <Label className="text-zinc-300">Subject</Label>
                <Input
                  value={editingResponse.subject}
                  onChange={(e) => setEditingResponse(prev => ({ ...prev, subject: e.target.value }))}
                  className="bg-zinc-800 border-zinc-600 text-zinc-200"
                  placeholder="Email subject..."
                />
              </div>

              {/* Edit Content */}
              <div>
                <Label className="text-zinc-300">Email Content</Label>
                <Textarea
                  value={editingResponse.content}
                  onChange={(e) => setEditingResponse(prev => ({ ...prev, content: e.target.value }))}
                  className="bg-zinc-800 border-zinc-600 text-zinc-200 min-h-[200px]"
                  placeholder="Email content..."
                />
                <p className="text-xs text-zinc-500 mt-1">
                  {editingResponse.content.length} characters
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowResponseEditor(false)}
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                // Copy to clipboard functionality
                navigator.clipboard.writeText(editingResponse.content);
                                            toast.success(`${t('copyContent')} ${t('completed')}`);
              }}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </Button>
            <Button
              onClick={() => selectedResponse && sendAIResponse(selectedResponse.id)}
              disabled={sending || !editingResponse.subject || !editingResponse.content}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {sending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Response
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Settings Section - Always Visible */}
      <Card className="bg-zinc-900/50 border-zinc-700 mt-8">
        <CardHeader>
          <CardTitle className="text-zinc-200 flex items-center gap-2">
            <Settings className="h-5 w-5" />
            AI Response Configuration
          </CardTitle>
          <p className="text-zinc-400 text-sm">
            Configure how AI generates and sends email responses
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Top row - Enable AI and Auto-send */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-zinc-300">Enable AI Responses</Label>
                <p className="text-sm text-zinc-400">Automatically generate responses for incoming emails</p>
              </div>
              <Switch
                checked={aiSettings.isEnabled}
                onCheckedChange={(checked) => setAISettings(prev => ({ ...prev, isEnabled: checked }))}
              />
            </div>

            <div>
              <Label className="text-zinc-300">Auto-send Threshold (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={aiSettings.autoSendThreshold}
                onChange={(e) => setAISettings(prev => ({ ...prev, autoSendThreshold: parseInt(e.target.value) || 0 }))}
                className="bg-zinc-800 border-zinc-600 text-zinc-200 mt-1"
              />
              <p className="text-sm text-zinc-400 mt-1">
                Responses with confidence above this threshold will be sent automatically
              </p>
              {validationErrors.autoSendThreshold && (
                <p className="text-xs text-red-500 mt-1">{validationErrors.autoSendThreshold}</p>
              )}
            </div>
          </div>

          <Separator className="bg-zinc-700" />

          {/* Company Information */}
          <div>
            <h3 className="text-lg font-medium text-zinc-200 mb-4">Company Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-zinc-300">Company Name</Label>
                <Input
                  value={aiSettings.companyName}
                  onChange={(e) => setAISettings(prev => ({ ...prev, companyName: e.target.value }))}
                  className="bg-zinc-800 border-zinc-600 text-zinc-200 mt-1"
                  placeholder="Your Company Name"
                />
                {validationErrors.companyName && (
                  <p className="text-xs text-red-500 mt-1">{validationErrors.companyName}</p>
                )}
              </div>
              <div>
                <Label className="text-zinc-300">Sender Name</Label>
                <Input
                  value={aiSettings.senderName}
                  onChange={(e) => setAISettings(prev => ({ ...prev, senderName: e.target.value }))}
                  className="bg-zinc-800 border-zinc-600 text-zinc-200 mt-1"
                  placeholder="Your Name"
                />
                {validationErrors.senderName && (
                  <p className="text-xs text-red-500 mt-1">{validationErrors.senderName}</p>
                )}
              </div>
              <div>
                <Label className="text-zinc-300">Sender Email</Label>
                <Input
                  type="email"
                  value={aiSettings.senderEmail}
                  onChange={(e) => setAISettings(prev => ({ ...prev, senderEmail: e.target.value }))}
                  className="bg-zinc-800 border-zinc-600 text-zinc-200 mt-1"
                  placeholder="hello@yourcompany.com"
                />
                {validationErrors.senderEmail && (
                  <p className="text-xs text-red-500 mt-1">{validationErrors.senderEmail}</p>
                )}
              </div>
            </div>
          </div>

          <Separator className="bg-zinc-700" />

          {/* AI Response Configuration */}
          <div>
            <h3 className="text-lg font-medium text-zinc-200 mb-4">AI Response Configuration</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label className="text-zinc-300">Default Tone</Label>
                <Select value={aiSettings.defaultTone} onValueChange={(value) => setAISettings(prev => ({ ...prev, defaultTone: value as any }))}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-600 text-zinc-200 mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="friendly">Friendly</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                    <SelectItem value="formal">Formal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-zinc-300">Max Response Length</Label>
                <Input
                  type="number"
                  min="50"
                  max="1000"
                  value={aiSettings.maxResponseLength}
                  onChange={(e) => setAISettings(prev => ({ ...prev, maxResponseLength: parseInt(e.target.value) || 300 }))}
                  className="bg-zinc-800 border-zinc-600 text-zinc-200 mt-1"
                  placeholder="300"
                />
                <p className="text-sm text-zinc-400 mt-1">Maximum characters for AI responses</p>
                {validationErrors.maxResponseLength && (
                  <p className="text-xs text-red-500 mt-1">{validationErrors.maxResponseLength}</p>
                )}
              </div>
            </div>


          </div>

          <Separator className="bg-zinc-700" />

          {/* AI Response Prompt */}
          <div>
            <Label className="text-zinc-300 text-lg font-medium">AI Response Prompt</Label>
            <p className="text-sm text-zinc-400 mb-3">
              Write the main prompt that will guide AI responses. This is the core instruction for how AI should behave.
            </p>
            <Textarea
              value={aiSettings.responsePrompt}
              onChange={(e) => setAISettings(prev => ({ ...prev, responsePrompt: e.target.value }))}
              placeholder="You are a professional sales representative responding to email inquiries. Always be helpful, friendly, and focus on scheduling meetings. Keep responses concise and personalized."
              className="bg-zinc-800 border-zinc-600 text-zinc-200 min-h-[120px]"
              rows={5}
            />
            <p className="text-xs text-zinc-500 mt-1">
              {aiSettings.responsePrompt.length} characters
            </p>
            {validationErrors.responsePrompt && (
              <p className="text-xs text-red-500 mt-1">{validationErrors.responsePrompt}</p>
            )}
          </div>

          {/* Additional Instructions */}
          <div>
            <Label className="text-zinc-300">Additional Instructions</Label>
            <p className="text-sm text-zinc-400 mb-2">
              Extra guidelines and context for AI responses
            </p>
            <Textarea
              value={aiSettings.customInstructions}
              onChange={(e) => setAISettings(prev => ({ ...prev, customInstructions: e.target.value }))}
              placeholder="Additional instructions for AI responses..."
              className="bg-zinc-800 border-zinc-600 text-zinc-200"
              rows={3}
            />
          </div>

          {/* Email Signature */}
          <div>
            <Label className="text-zinc-300">Email Signature</Label>
            <p className="text-sm text-zinc-400 mb-2">
              Signature that will be automatically added to all AI responses
            </p>
            <Textarea
              value={aiSettings.signature}
              onChange={(e) => setAISettings(prev => ({ ...prev, signature: e.target.value }))}
              placeholder="Best regards,&#10;Your Name&#10;Your Company&#10;https://yourwebsite.com"
              className="bg-zinc-800 border-zinc-600 text-zinc-200"
              rows={4}
            />
            {validationErrors.signature && (
              <p className="text-xs text-red-500 mt-1">{validationErrors.signature}</p>
            )}
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4">
            <Button
              onClick={saveAISettings}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8"
              size="lg"
              disabled={!isValid}
            >
              <Settings className="h-4 w-4 mr-2" />
                              {t('saveAllSettings')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 