"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  X, 
  Phone, 
  Mail, 
  Link, 
  Circle,
  RefreshCw,
  Play,
  Pause,
  Square
} from "lucide-react";
import EmailAutomationProgress from "./EmailAutomationProgress";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/hooks/use-translations";
import toast from "react-hot-toast";

// Type definitions - Updated to match CRM page
export type PipelineStage = 
  | "new_leads" 
  | "called_once" 
  | "called_twice" 
  | "called_three_times" 
  | "called_four_times"
  | "called_five_times"
  | "called_six_times"
  | "called_seven_times"
  | "meeting" 
  | "deal";

export type LeadSource = 
  | "website" 
  | "linkedin" 
  | "referral" 
  | "cold_email" 
  | "event" 
  | "other";

export type LossReason = 
  | "not_interested" 
  | "no_budget" 
  | "no_response" 
  | "competitor" 
  | "too_early" 
  | "no_fit" 
  | "other";

export type ActivityType = 
  | "phone_call_scheduled" 
  | "demo_meeting" 
  | "whatsapp" 
  | "email" 
  | "linkedin" 
  | "incoming_call" 
  | "outgoing_call";

export interface Activity {
  id: string;
  type: ActivityType;
  date: string;
  notes: string;
  leadId: string;
}

export interface Lead {
  id: string;
  name: string;
  company: string;
  position: string;
  email: string;
  phone: string;
  source: LeadSource;
  stage: PipelineStage;
  notes?: string;
  tags: string[];
  activities: Activity[];
  lastContact?: string;
  lossReason?: LossReason;
  lossComment?: string;
  emailHistory?: any[];
  emailSequenceActive?: boolean;
  emailSequenceStage?: string;
  emailSequenceStep?: number;
  nextScheduledEmail?: string;
  // Deal closure tracking
  budget?: number;
  closedDate?: string;
  closedReason?: string;
  lossDescription?: string;
  // Enriched author/company info
  authInformation?: {
    company_name?: string;
    company_email?: string;
    owner_name?: string;
    owner_email?: string;
    manager_name?: string;
    manager_email?: string;
    hr_name?: string;
    hr_email?: string;
    executive_name?: string;
    executive_email?: string;
  };
}

interface LeadDetailsProps {
  lead: Lead;
  onUpdate: (updatedLead: Lead) => void;
  onClose: () => void;
}

// Pipeline stage options - Updated
const PIPELINE_STAGES: { value: PipelineStage; label: string }[] = [
  { value: "new_leads", label: "New Leads" },
  { value: "called_once", label: "Called Once" },
  { value: "called_twice", label: "Called Twice" },
  { value: "called_three_times", label: "Called Three Times" },
  { value: "called_four_times", label: "Called Four Times" },
  { value: "called_five_times", label: "Called Five Times" },
  { value: "called_six_times", label: "Called Six Times" },
  { value: "called_seven_times", label: "Called Seven Times" },
  { value: "meeting", label: "Meeting" },
  { value: "deal", label: "Deal" }
];

// Lead source options
const LEAD_SOURCES: { value: LeadSource; label: string }[] = [
  { value: "website", label: "Website" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "referral", label: "Referral" },
  { value: "cold_email", label: "Cold Email" },
  { value: "event", label: "Event" },
  { value: "other", label: "Other" }
];

// Loss reason options
const LOSS_REASONS: { value: LossReason; label: string }[] = [
  { value: "not_interested", label: "Not Interested" },
  { value: "no_budget", label: "No Budget" },
  { value: "no_response", label: "No Response" },
  { value: "competitor", label: "Already with a Competitor" },
  { value: "too_early", label: "Too Early in the Funnel" },
  { value: "no_fit", label: "No Match / No Fit" },
  { value: "other", label: "Other" }
];

// Activity type options - Updated
const ACTIVITY_TYPES: { value: ActivityType; label: string; icon: React.ReactNode }[] = [
  { value: "phone_call_scheduled", label: "Phone Call (Scheduled)", icon: <Phone className="h-4 w-4" /> },
  { value: "demo_meeting", label: "Demo / Meeting", icon: <Calendar className="h-4 w-4" /> },
  { value: "whatsapp", label: "WhatsApp", icon: <Phone className="h-4 w-4" /> },
  { value: "email", label: "Email", icon: <Mail className="h-4 w-4" /> },
  { value: "linkedin", label: "LinkedIn", icon: <Link className="h-4 w-4" /> },
  { value: "incoming_call", label: "Incoming Call", icon: <Phone className="h-4 w-4" /> },
  { value: "outgoing_call", label: "Outgoing Call", icon: <Phone className="h-4 w-4" /> }
];

const LeadDetails = ({ lead, onUpdate, onClose }: LeadDetailsProps) => {
  const { t } = useTranslations();
  const [isOpen, setIsOpen] = useState(false);
  const [editedLead, setEditedLead] = useState<Lead>(lead);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailHistory, setEmailHistory] = useState<any[]>([]);
  const [autoRefreshEmailHistory, setAutoRefreshEmailHistory] = useState(true);
  const [newActivity, setNewActivity] = useState<Partial<Activity>>({
    type: "phone_call_scheduled",
    date: new Date().toISOString().split('T')[0],
    notes: "",
    leadId: lead.id
  });
  const [newTag, setNewTag] = useState("");
  const [saving, setSaving] = useState(false);
  
  useEffect(() => {
    setEditedLead(lead);
    setEmailHistory(lead.emailHistory || []);
  }, [lead]);

  // Auto-refresh email history every 15 seconds when email automation is active
  useEffect(() => {
    if (!autoRefreshEmailHistory || !lead.emailSequenceActive) return;

    const interval = setInterval(async () => {
      try {
        console.log(`🔄 Auto-refreshing email history for ${lead.name}...`);
        const response = await fetch(`/api/crm/leads?leadId=${lead.id}`, {
          method: 'GET',
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.lead) {
            const updatedEmailHistory = data.lead.emailHistory || [];
            if (updatedEmailHistory.length !== emailHistory.length) {
              console.log(`📧 Email history updated for ${lead.name}: ${updatedEmailHistory.length} emails`);
              setEmailHistory(updatedEmailHistory);
              setEditedLead(prev => ({
                ...prev,
                emailHistory: updatedEmailHistory,
                emailSequenceStep: data.lead.emailSequenceStep,
                emailSequenceStage: data.lead.emailSequenceStage,
                nextScheduledEmail: data.lead.nextScheduledEmail,
                emailSequenceActive: data.lead.emailSequenceActive
              }));
            }
          }
        }
      } catch (error) {
        console.error('Error refreshing email history:', error);
      }
    }, 15000); // Refresh every 15 seconds

    return () => clearInterval(interval);
  }, [lead.id, lead.name, lead.emailSequenceActive, emailHistory.length, autoRefreshEmailHistory]);

  // Function to format date for display
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch (error) {
      return dateString;
    }
  };

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditedLead(prev => ({ ...prev, [name]: value }));
  };

  // Handle dropdown changes
  const handleSelectChange = (name: string) => (value: string) => {
    setEditedLead(prev => ({ ...prev, [name]: value }));
  };

  // Handle new activity input changes
  const handleActivityInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewActivity(prev => ({ ...prev, [name]: value }));
  };

  // Handle new activity type change
  const handleActivityTypeChange = (value: string) => {
    setNewActivity(prev => ({ ...prev, type: value as ActivityType }));
  };

  // Add new activity
  const handleAddActivity = async () => {
    if (!newActivity.notes) {
      toast.error("Please add notes for the activity");
      return;
    }
    
    try {
      const activity: Activity = {
        id: `a${Date.now()}`,
        type: newActivity.type as ActivityType,
        date: newActivity.date || new Date().toISOString().split('T')[0],
        notes: newActivity.notes || "",
        leadId: lead.id
      };
      
      // Update local state immediately for better UX
      const updatedActivities = [...editedLead.activities, activity];
      setEditedLead(prev => ({ 
        ...prev, 
        activities: updatedActivities, 
        lastContact: activity.date 
      }));
      
      // Reset form
      setNewActivity({
        type: "phone_call_scheduled",
        date: new Date().toISOString().split('T')[0],
        notes: "",
        leadId: lead.id
      });
      
      toast.success("Activity added successfully");
    } catch (error) {
      console.error('Error adding activity:', error);
      toast.error("Failed to add activity");
    }
  };

  // Add new tag
  const handleAddTag = () => {
    if (!newTag || editedLead.tags.includes(newTag)) {
      if (!newTag) {
        toast.error("Please enter a tag");
      } else {
        toast.error("Tag already exists");
      }
      return;
    }
    
    setEditedLead(prev => ({
      ...prev,
      tags: [...prev.tags, newTag]
    }));
    
    setNewTag("");
    toast.success("Tag added");
  };

  // Remove tag
  const handleRemoveTag = (tagToRemove: string) => {
    setEditedLead(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
    toast.success("Tag removed");
  };

  // Save changes to database
  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Validate required fields
      if (!editedLead.name || !editedLead.email || !editedLead.company) {
        toast.error("Please fill in all required fields (Name, Email, Company)");
        return;
      }
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(editedLead.email)) {
        toast.error("Please enter a valid email address");
        return;
      }

      // Save to database via API
      const response = await fetch('/api/crm/leads', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leadId: editedLead.id,
          stage: editedLead.stage,
          notes: editedLead.notes,
          name: editedLead.name,
          company: editedLead.company,
          position: editedLead.position,
          email: editedLead.email,
          phone: editedLead.phone,
          source: editedLead.source,
          tags: editedLead.tags,
          activities: editedLead.activities,
          lossReason: editedLead.lossReason,
          lossComment: editedLead.lossComment,
          lastContact: editedLead.lastContact,
          budget: editedLead.budget,
          lossDescription: editedLead.lossDescription,
          closedDate: editedLead.stage === "deal" || editedLead.lossReason ? new Date().toISOString() : undefined
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Update parent component
        onUpdate(editedLead);
        toast.success("Lead updated successfully!");
        onClose();
      } else {
        toast.error(data.error || "Failed to update lead");
      }
    } catch (error) {
      console.error('Error saving lead:', error);
      toast.error("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  // Handle stage change with automatic email sending for calling stages
  const handleStageChange = async (newStage: string) => {
    const oldStage = editedLead.stage;
    
    // Update stage immediately for better UX
    setEditedLead(prev => ({ ...prev, stage: newStage as PipelineStage }));
    
    // Auto-send email for calling stages
    const emailStages = ['called_once', 'called_twice', 'called_three_times', 'called_four_times', 'called_five_times', 'called_six_times', 'called_seven_times'];
    if (emailStages.includes(newStage) && !emailStages.includes(oldStage)) {
      try {
        const emailResponse = await fetch('/api/crm/send-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            leadId: lead.id,
            stage: newStage
          }),
        });
        
        const emailData = await emailResponse.json();
        
        if (emailData.success) {
          toast.success(`📧 Email sent automatically for ${newStage.replace('_', ' ')}!`);
        } else {
          console.warn('Email sending failed:', emailData.error);
          toast.error(`Email failed: ${emailData.error}`);
        }
      } catch (emailError) {
        console.error('Email sending error:', emailError);
        toast.error('Failed to send automated email');
      }
    }
  };

  // Get icon for activity type
  const getActivityIcon = (type: ActivityType) => {
    const activityType = ACTIVITY_TYPES.find(a => a.value === type);
    return activityType?.icon || <Circle className="h-4 w-4" />;
  };

  // Handle manual email sending
  const handleManualEmail = async (stage: string, isResend: boolean = false) => {
    try {
      console.log(`📧 Manual email request - Stage: ${stage}, Resend: ${isResend}`);
      
      const response = await fetch('/api/crm/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leadId: lead.id,
          stage: stage,
          manual: true // Always manual when called from UI
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success(`✅ Email sent successfully to ${lead.email} for ${stage.replace('_', ' ')}!`);
        
        // Add activity to track manual email
        const emailActivity: Activity = {
          id: `a${Date.now()}`,
          type: 'email',
          date: new Date().toISOString().split('T')[0],
          notes: `Manual email sent for ${stage.replace('_', ' ')} stage${isResend ? ' (resend)' : ''}`,
          leadId: lead.id
        };
        
        setEditedLead(prev => ({
          ...prev,
          activities: [...prev.activities, emailActivity]
        }));
        
      } else {
        toast.error(`❌ Failed to send email: ${data.error}`);
      }
    } catch (error: any) {
      console.error('Manual email error:', error);
      toast.error('❌ Failed to send email');
    }
  };

  // Handle email automation controls
  const handleEmailAutomation = async (action: 'start' | 'stop' | 'pause' | 'resume') => {
    try {
      console.log(`📧 Email automation ${action} request for lead: ${lead.name}`);
      
      const response = await fetch('/api/crm/email-automation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leadId: lead.id,
          action: action,
          stage: action === 'start' ? editedLead.stage : undefined
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success(`✅ Email automation ${action}ed successfully!`);
        
        // Refresh the lead data or trigger a callback
        // For now, we'll just show the success message
        // In a real app, you might want to refresh the lead details
        
      } else {
        toast.error(`❌ Failed to ${action} email automation: ${data.error}`);
      }
    } catch (error: any) {
      console.error(`Email automation ${action} error:`, error);
      toast.error(`❌ Failed to ${action} email automation`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex justify-end">
      <div className="bg-background w-full max-w-md overflow-y-auto">
        <div className="p-4 flex justify-between items-center border-b">
          <h2 className="text-xl font-semibold">{String(t("leadDetails"))}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        <div className="p-4">
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="general">{String(t("general"))}</TabsTrigger>
              <TabsTrigger value="activities">{String(t("activities"))}</TabsTrigger>
              <TabsTrigger value="status">{String(t("status"))}</TabsTrigger>
              <TabsTrigger value="emails" className="relative">
                {String(t("emails"))}
                {emailHistory.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {emailHistory.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
            
            {/* Details Tab */}
            <TabsContent value="general" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="name">{String(t("name"))} *</Label>
                <Input 
                  id="name" 
                  name="name" 
                  value={editedLead.name} 
                  onChange={handleInputChange}
                  placeholder="Enter full name"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="company">{String(t("company"))} *</Label>
                <Input 
                  id="company" 
                  name="company" 
                  value={editedLead.company} 
                  onChange={handleInputChange}
                  placeholder="Enter company name" 
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="position">{String(t("position"))}</Label>
                <Input 
                  id="position" 
                  name="position" 
                  value={editedLead.position} 
                  onChange={handleInputChange}
                  placeholder="Enter job title"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">{String(t("email"))} *</Label>
                <Input 
                  id="email" 
                  name="email" 
                  type="email" 
                  value={editedLead.email} 
                  onChange={handleInputChange}
                  placeholder="Enter email address"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">{String(t("phone"))}</Label>
                <Input 
                  id="phone" 
                  name="phone" 
                  value={editedLead.phone} 
                  onChange={handleInputChange}
                  placeholder="Enter phone number"
                />
              </div>

              {/* Author Details (from enrichment) */}
              <div className="space-y-2 border rounded-md p-3 bg-muted/20">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Author Details</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        const res = await fetch('/api/leads/enrich-auth-info', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ leadId: editedLead.id })
                        });
                        const data = await res.json();
                        if (data.success && data.lead) {
                          setEditedLead(prev => ({ ...prev, authInformation: data.lead.authInformation || prev.authInformation }));
                        }
                      } catch {}
                    }}
                  >
                    Fetch
                  </Button>
                </div>
                {editedLead?.authInformation ? (
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="text-muted-foreground">Company Email</div>
                    <div className="col-span-2 break-words">{editedLead.authInformation.company_email || ''}</div>
                    <div className="text-muted-foreground">Owner</div>
                    <div className="col-span-2 break-words">{editedLead.authInformation.owner_name || ''}</div>
                    <div className="text-muted-foreground">Owner Email</div>
                    <div className="col-span-2 break-words">{editedLead.authInformation.owner_email || ''}</div>
                    <div className="text-muted-foreground">Executive</div>
                    <div className="col-span-2 break-words">{editedLead.authInformation.executive_name || ''}</div>
                    <div className="text-muted-foreground">Executive Email</div>
                    <div className="col-span-2 break-words">{editedLead.authInformation.executive_email || ''}</div>
                    <div className="text-muted-foreground">Manager</div>
                    <div className="col-span-2 break-words">{editedLead.authInformation.manager_name || ''}</div>
                    <div className="text-muted-foreground">Manager Email</div>
                    <div className="col-span-2 break-words">{editedLead.authInformation.manager_email || ''}</div>
                    <div className="text-muted-foreground">HR</div>
                    <div className="col-span-2 break-words">{editedLead.authInformation.hr_name || ''}</div>
                    <div className="text-muted-foreground">HR Email</div>
                    <div className="col-span-2 break-words">{editedLead.authInformation.hr_email || ''}</div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">No author details found</div>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="leadSource">{String(t("leadSource"))}</Label>
                <Select 
                  value={editedLead.source} 
                  onValueChange={handleSelectChange("source")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={String(t("selectSource"))} />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAD_SOURCES.map(source => (
                      <SelectItem key={source.value} value={source.value}>
                        {source.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="notes">{String(t("notes"))}</Label>
                <Textarea 
                  id="notes" 
                  name="notes" 
                  value={editedLead.notes || ''} 
                  onChange={handleInputChange} 
                  className="min-h-[100px]"
                  placeholder="Add notes about this lead..."
                />
              </div>
              
              <div className="space-y-2">
                <Label>{String(t("tags"))}</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {editedLead.tags.map(tag => (
                    <Badge 
                      key={tag}
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 rounded-full hover:bg-secondary"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input 
                    value={newTag}
                    onChange={e => setNewTag(e.target.value)}
                    placeholder="Add a tag..."
                    className="flex-1"
                    onKeyDown={e => e.key === 'Enter' && handleAddTag()}
                  />
                  <Button onClick={handleAddTag} type="button">{String(t("add"))}</Button>
                </div>
              </div>
            </TabsContent>
            
            {/* Activities Tab */}
            <TabsContent value="activities" className="space-y-4 pt-4">
              <div className="space-y-2 border rounded-md p-3 bg-muted/20">
                <h3 className="font-medium">{String(t("addNewActivity"))}</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="activityType">{String(t("type"))}</Label>
                    <Select 
                      value={newActivity.type as string} 
                      onValueChange={handleActivityTypeChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={String(t("selectType"))} />
                      </SelectTrigger>
                      <SelectContent>
                        {ACTIVITY_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              {type.icon}
                              <span>{type.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="activityDate">{String(t("date"))}</Label>
                    <Input 
                      id="activityDate" 
                      name="date" 
                      type="date" 
                      value={newActivity.date} 
                      onChange={handleActivityInputChange} 
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="activityNotes">{String(t("notes"))}</Label>
                  <Textarea 
                    id="activityNotes" 
                    name="notes" 
                    value={newActivity.notes} 
                    onChange={handleActivityInputChange} 
                    placeholder="Describe what happened in this activity..."
                    className="min-h-[70px]"
                  />
                </div>
                <Button 
                  onClick={handleAddActivity} 
                  className="w-full"
                  disabled={!newActivity.notes}
                >
                  {String(t("addActivity"))}
                </Button>
              </div>
              
              <Separator />
              
              <div className="space-y-3">
                <h3 className="font-medium">{String(t("activityHistory"))}</h3>
                {editedLead.activities.length > 0 ? (
                  <div className="space-y-3">
                    {[...editedLead.activities]
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map(activity => (
                        <Card key={activity.id} className="p-3">
                          <div className="flex items-center gap-2 mb-1">
                            {getActivityIcon(activity.type)}
                            <span className="font-medium">
                              {ACTIVITY_TYPES.find(t => t.value === activity.type)?.label || activity.type}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {formatDate(activity.date)}
                          </p>
                          <p className="text-sm">{activity.notes}</p>
                        </Card>
                      ))
                    }
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    <p>No activities recorded yet</p>
                  </div>
                )}
              </div>
            </TabsContent>
            
            {/* Status Tab */}
            <TabsContent value="status" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="stage">{String(t("pipelineStage"))}</Label>
                <Select 
                  value={editedLead.stage} 
                  onValueChange={handleStageChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={String(t("selectStage"))} />
                  </SelectTrigger>
                  <SelectContent>
                    {PIPELINE_STAGES.map(stage => (
                      <SelectItem key={stage.value} value={stage.value}>
                        {stage.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Email Management Section */}
              {['called_once', 'called_twice', 'called_three_times', 'called_four_times', 'called_five_times', 'called_six_times', 'called_seven_times'].includes(editedLead.stage) && (
                <div className="space-y-4">
                  {/* Email Automation Status */}
                  <div className="space-y-3 p-4 border rounded-lg bg-green-50 border-green-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-green-600" />
                        <h4 className="font-medium text-green-900">Email Automation</h4>
                      </div>
                      <div className="flex items-center gap-2">
                        {(lead as any).emailSequenceActive ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                            Inactive
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {(lead as any).emailSequenceActive && (
                      <div className="text-sm text-green-700 space-y-1">
                        <p>Stage: <span className="font-medium">{editedLead.emailSequenceStage?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'N/A'}</span></p>
                        <p>Step: <span className="font-medium">{(lead as any).emailSequenceStep || 1}/7</span></p>
                        <p>Next email: <span className="font-medium">
                          {(lead as any).nextScheduledEmail 
                            ? new Date((lead as any).nextScheduledEmail).toLocaleDateString()
                            : 'N/A'}
                        </span></p>
                      </div>
                    )}
                    
                    {(lead as any).emailStoppedReason && (
                      <p className="text-xs text-orange-600">
                        ⚠️ Stopped: {(lead as any).emailStoppedReason}
                      </p>
                    )}
                    
                    <div className="flex gap-2">
                      {!(lead as any).emailSequenceActive ? (
                        <Button 
                          size="sm"
                          onClick={() => handleEmailAutomation('start')}
                          className="bg-green-600 hover:bg-green-500 text-white"
                        >
                          <Play className="w-3 h-3 mr-1" />
                          Start Automation
                        </Button>
                      ) : (
                        <>
                          <Button 
                            size="sm"
                            variant="outline"
                            onClick={() => handleEmailAutomation('pause')}
                            className="border-orange-300 text-orange-700 hover:bg-orange-100"
                          >
                            <Pause className="w-3 h-3 mr-1" />
                            Pause
                          </Button>
                          <Button 
                            size="sm"
                            variant="outline"
                            onClick={() => handleEmailAutomation('stop')}
                            className="border-red-300 text-red-700 hover:bg-red-100"
                          >
                            <Square className="w-3 h-3 mr-1" />
                            Stop
                          </Button>
                        </>
                      )}
                    </div>
                    
                    <p className="text-xs text-green-600">
                      🤖 Automatic emails will be sent every 7 days when lead is in calling stages
                    </p>
                  </div>
                  
                  {/* Manual Email Section */}
                  <div className="space-y-3 p-4 border rounded-lg bg-blue-50 border-blue-200">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-blue-600" />
                      <h4 className="font-medium text-blue-900">Manual Email Actions</h4>
                    </div>
                    <p className="text-sm text-blue-700">
                      Current stage: <span className="font-medium">{editedLead.stage.replace('_', ' ')}</span>
                    </p>
                    <div className="flex gap-2">
                      <Button 
                        size="sm"
                        onClick={() => handleManualEmail(editedLead.stage)}
                        className="bg-blue-600 hover:bg-blue-500 text-white"
                      >
                        <Mail className="w-3 h-3 mr-1" />
                        Send Email Now
                      </Button>
                      <Button 
                        size="sm"
                        variant="outline"
                        onClick={() => handleManualEmail(editedLead.stage, true)}
                        className="border-blue-300 text-blue-700 hover:bg-blue-100"
                      >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Resend Email
                      </Button>
                    </div>
                    <p className="text-xs text-blue-600">
                      💡 Manual emails don't affect the automation sequence
                    </p>
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <Label>{String(t("dealStatus"))}</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    variant={editedLead.stage === "deal" ? "default" : "outline"}
                    onClick={() => handleStageChange("deal")}
                    className="w-full"
                  >
                    {String(t("won"))}
                  </Button>
                  <Button 
                    variant={editedLead.lossReason ? "destructive" : "outline"}
                    onClick={() => setEditedLead(prev => ({ 
                      ...prev, 
                      lossReason: prev.lossReason ? undefined : "not_interested" 
                    }))}
                    className="w-full"
                  >
                    {String(t("lost"))}
                  </Button>
                </div>
              </div>
              
              {editedLead.lossReason && (
                <div className="space-y-2">
                  <Label htmlFor="lossReason">{String(t("lossReason"))}</Label>
                  <Select 
                    value={editedLead.lossReason} 
                    onValueChange={handleSelectChange("lossReason")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={String(t("selectReason"))} />
                    </SelectTrigger>
                    <SelectContent>
                      {LOSS_REASONS.map(reason => (
                        <SelectItem key={reason.value} value={reason.value}>
                          {reason.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {/* Budget field for lost deals */}
                  <div className="space-y-1">
                    <Label htmlFor="budget">{String(t("budget"))} (€)</Label>
                    <Input 
                      id="budget" 
                      name="budget" 
                      type="number" 
                      value={editedLead.budget || ''} 
                      onChange={handleInputChange} 
                      placeholder="Enter budget amount..."
                      min="0"
                      step="100"
                    />
                  </div>
                  
                  {/* Description for why lost */}
                  <div className="space-y-1">
                    <Label htmlFor="lossDescription">{String(t("lossDescription"))}</Label>
                    <Textarea 
                      id="lossDescription" 
                      name="lossDescription" 
                      value={editedLead.lossDescription || ''} 
                      onChange={handleInputChange} 
                      placeholder="Describe why the deal was lost..."
                      className="min-h-[70px]"
                    />
                  </div>
                  
                  {editedLead.lossReason === "other" && (
                    <div className="space-y-1">
                      <Label htmlFor="lossComment">{String(t("comment"))}</Label>
                      <Textarea 
                        id="lossComment" 
                        name="lossComment" 
                        value={editedLead.lossComment || ''} 
                        onChange={handleInputChange} 
                        placeholder="Please specify the reason..."
                        className="min-h-[70px]"
                      />
                    </div>
                  )}
                </div>
              )}
              
              {/* Budget field for won deals */}
              {editedLead.stage === "deal" && (
                <div className="space-y-2">
                  <Label htmlFor="budget">{String(t("budget"))} (€)</Label>
                  <Input 
                    id="budget" 
                    name="budget" 
                    type="number" 
                    value={editedLead.budget || ''} 
                    onChange={handleInputChange} 
                    placeholder="Enter budget amount..."
                    min="0"
                    step="100"
                  />
                  <p className="text-xs text-green-600">
                    💰 Budget for this won deal
                  </p>
                </div>
              )}
              
              {editedLead.lastContact && (
                <div className="space-y-2">
                  <Label>Last Contact</Label>
                  <div className="text-sm text-muted-foreground">
                    {formatDate(editedLead.lastContact)}
                  </div>
                </div>
              )}
            </TabsContent>
            
            {/* Email Automation Tab */}
            <TabsContent value="emails" className="space-y-4 pt-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email Automation & Progress
                </h3>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAutoRefreshEmailHistory(!autoRefreshEmailHistory)}
                    className={autoRefreshEmailHistory ? "bg-green-50 border-green-200 text-green-700" : ""}
                  >
                    <div className={`w-2 h-2 rounded-full mr-2 ${autoRefreshEmailHistory ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                    Auto-refresh {autoRefreshEmailHistory ? 'ON' : 'OFF'}
                  </Button>
                </div>
              </div>

              {/* Detailed Email Automation Progress */}
              <EmailAutomationProgress 
                lead={editedLead} 
                onRefresh={() => {
                  // Refresh lead data after force progression
                  setEditedLead(prev => ({ ...prev }));
                  if (onUpdate) {
                    onUpdate(editedLead);
                  }
                }}
              />
            </TabsContent>
          </Tabs>
          
          <div className="flex justify-end gap-2 pt-4 mt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              {String(t("cancel"))}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : String(t("saveChanges"))}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadDetails;