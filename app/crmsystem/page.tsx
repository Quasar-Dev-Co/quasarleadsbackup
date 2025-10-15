'use client';

import { useState, useEffect } from "react";
import { SectionHeader } from "@/components/ui/section-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Calendar, RefreshCw, Star, Mail, Search as SearchIcon } from "lucide-react";
import { useTranslations } from "@/hooks/use-translations";
import { useDispatch } from "react-redux";
import { setLanguage } from "@/redux/features/languageSlice";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from 'react-hot-toast'
import Pipeline from "@/components/crm/Pipeline";
import LeadDetails from "@/components/crm/LeadDetails";
import AddNewLead from "@/components/crm/AddNewLead";
import EmailConfig from "@/components/crm/EmailConfig";

// Define types
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

export type ActivityType =
  | "phone_call_scheduled"
  | "demo_meeting"
  | "whatsapp"
  | "email"
  | "linkedin"
  | "incoming_call"
  | "outgoing_call";

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
  stage: PipelineStage;
  source: LeadSource;
  lastContact?: string;
  notes?: string;
  activities: Activity[];
  lossReason?: LossReason;
  lossComment?: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  // Additional fields from MongoDB
  googleAds?: boolean;
  organicRanking?: number;
  location?: string;
  website?: string;
  dealValue?: number;
  probability?: number;
}

// High-Value Badge Component
const HighValueBadge = ({ googleAds, organicRanking }: { googleAds?: boolean; organicRanking?: number }) => {
  if (!googleAds) return null;
  
  const isHighValue = !organicRanking || organicRanking > 10;
  
  if (!isHighValue) return null;
  
  return (
    <div className="inline-flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-medium rounded-full">
      <Star className="w-3 h-3 fill-current" />
      High-Value
    </div>
  );
};

const CRM = () => {
  const { t } = useTranslations();
  const dispatch = useDispatch();
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [calendlyUrl, setCalendlyUrl] = useState("");
  const [showLeadDetails, setShowLeadDetails] = useState(false);
  const [showAddNewLead, setShowAddNewLead] = useState(false);
  const [showEmailConfig, setShowEmailConfig] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [stageCounts, setStageCounts] = useState<{ [key: string]: number }>({});
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debug state changes
  useEffect(() => {
    console.log('showAddNewLead state changed:', showAddNewLead);
  }, [showAddNewLead]);

  // Debug leads data
  useEffect(() => {
    console.log('Leads data updated:', leads.length, 'leads');
    if (leads.length > 0) {
      console.log('Sample leads:', leads.slice(0, 2));
    }
  }, [leads]);

  // Debounce search input
  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 300);
    return () => clearTimeout(handle);
  }, [searchTerm]);

  // Auto-refresh leads every 30 seconds to show real-time email updates
  useEffect(() => {
    if (!autoRefreshEnabled) return;

    const interval = setInterval(() => {
      console.log('🔄 Auto-refreshing leads for real-time updates...');
      fetchLeads(currentPage, undefined, debouncedSearch);
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [currentPage, autoRefreshEnabled, debouncedSearch]);

  // Fetch leads from MongoDB
  const fetchLeads = async (page: number = 1, stage?: string, search?: string) => {
    try {
      setLoading(true);
      
      // Get current user ID
      const { auth } = await import('@/lib/auth');
      const userId = await auth.getCurrentUserId();
      
      if (!userId) {
        toast.error('User authentication required. Please login again.');
        setLoading(false);
        return;
      }
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '100',
        userId: userId // Add user ID to the request
      });
      
      if (stage && stage !== 'all') {
        params.append('stage', stage);
      }
      if (search && search.length > 0) {
        params.append('search', search);
      }
      
      const response = await fetch(`/api/crm/leads?${params.toString()}`);
      const data = await response.json();
      
      if (data.success) {
        setLeads(data.leads);
        setStageCounts(data.stageCounts);
        setTotalCount(data.totalCount);
        setCurrentPage(page);
        
        // Count leads with active email automation for logging
        const activeEmailAutomation = data.leads.filter((lead: any) => lead.emailSequenceActive).length;
        console.log(`📊 CRM Update: ${data.leads.length} leads loaded, ${activeEmailAutomation} with active email automation`);
        
        // Show success message only on manual refresh
        if (refreshing) {
          toast.success(`🔄 Refreshed: ${data.leads.length} leads loaded (${activeEmailAutomation} with active email automation)`);
          setRefreshing(false);
        }
      } else {
        toast.error(data.error || 'Failed to load leads');
      }
    } catch (error: any) {
      console.error('Error fetching leads:', error);
      toast.error('Failed to connect to database');
    } finally {
      setLoading(false);
    }
  };

  // Load leads on component mount
  useEffect(() => {
    fetchLeads(1, undefined, debouncedSearch);
  }, [debouncedSearch]);

  // Refresh leads
  const handleRefresh = () => {
    setRefreshing(true);
    fetchLeads(currentPage, undefined, debouncedSearch);
  };

  const handleSelectLead = (lead: Lead) => {
    setSelectedLead(lead);
    setShowLeadDetails(true);
  };

  const handleUpdateLead = async (updatedLead: Lead) => {
    try {
      // Update in database
      const response = await fetch('/api/crm/leads', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leadId: updatedLead.id,
          stage: updatedLead.stage,
          notes: updatedLead.notes
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Update local state
        setLeads(leads.map(lead => lead.id === updatedLead.id ? updatedLead : lead));
        setSelectedLead(updatedLead);
        toast.success('Lead updated successfully');
        
        // Refresh stage counts
        fetchLeads(currentPage);
      } else {
        toast.error(data.error || 'Failed to update lead');
      }
    } catch (error: any) {
      console.error('Error updating lead:', error);
      toast.error('Failed to update lead');
    }
  };

  const handleStageChange = async (leadId: string, newStage: PipelineStage) => {
    console.log('🚀 CRM Stage Change: Starting stage change process', { leadId, newStage });
    
    try {
      // Update in database
      console.log('💾 CRM Stage Change: Updating stage in database...');
      const response = await fetch('/api/crm/leads', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leadId,
          stage: newStage
        }),
      });
      
      const data = await response.json();
      console.log('📨 CRM Stage Change: Database update response:', data);
      
      if (data.success) {
        // Update local state
        const updatedLeads = leads.map(lead =>
          lead.id === leadId ? { ...lead, stage: newStage } : lead
        );
        setLeads(updatedLeads);
        
        if (selectedLead?.id === leadId) {
          setSelectedLead({ ...selectedLead, stage: newStage });
        }
        
        console.log('✅ CRM Stage Change: Local state updated successfully');
        toast.success("Stage updated successfully");

        // Auto-send email for calling stages
        const emailStages = ['called_once', 'called_twice', 'called_three_times', 'called_four_times', 'called_five_times', 'called_six_times', 'called_seven_times'];
        if (emailStages.includes(newStage)) {
          console.log(`📧 CRM Stage Change: Email stage detected (${newStage}), attempting to send email...`);
          
          try {
            console.log(`🎯 CRM Stage Change: Sending automated email for stage: ${newStage}`);
            
            const emailResponse = await fetch('/api/crm/send-email', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                leadId,
                stage: newStage
              }),
            });
            
            console.log('📨 CRM Stage Change: Email API response status:', emailResponse.status);
            const emailData = await emailResponse.json();
            console.log('📨 CRM Stage Change: Email API response data:', emailData);
            
            if (emailData.success) {
              console.log('✅ CRM Stage Change: Email sent successfully!', emailData);
              toast.success(`📧 Email sent automatically for ${newStage.replace('_', ' ')}!`);
            } else {
              console.error('❌ CRM Stage Change: Email sending failed:', emailData.error);
              toast.error(`Email failed: ${emailData.error}`);
            }
          } catch (emailError: any) {
            console.error('💥 CRM Stage Change: Email sending error:', emailError);
            toast.error('Failed to send automated email: ' + emailError.message);
          }
        } else {
          console.log(`ℹ️ CRM Stage Change: Stage "${newStage}" does not trigger email sending`);
        }

        // Refresh stage counts
        console.log('🔄 CRM Stage Change: Refreshing leads...');
        fetchLeads(currentPage, undefined, debouncedSearch);
      } else {
        console.error('❌ CRM Stage Change: Database update failed:', data.error);
        toast.error(data.error || 'Failed to update stage');
      }
    } catch (error: any) {
      console.error('💥 CRM Stage Change: Unexpected error:', error);
      toast.error('Failed to update stage: ' + error.message);
    }
  };

  const handleCloseDetails = () => {
    setShowLeadDetails(false);
    setSelectedLead(null);
  };

  // Calculate high-value leads count
  const highValueLeadsCount = leads.filter(lead => 
    lead.googleAds && (!lead.organicRanking || lead.organicRanking > 10)
  ).length;

  const handleAddNewLead = () => {
    console.log('handleAddNewLead called');
    console.log('showAddNewLead before:', showAddNewLead);
    setShowAddNewLead(true);
    console.log('showAddNewLead set to true');
  };

  const handleCloseAddNewLead = () => {
    setShowAddNewLead(false);
  };

  const handleNewLeadSuccess = () => {
    // Refresh the leads list after successful creation
    fetchLeads(currentPage, undefined, debouncedSearch);
    setShowAddNewLead(false);
  };

  const handleShowEmailConfig = () => {
    setShowEmailConfig(true);
  };

  const handleCloseEmailConfig = () => {
    setShowEmailConfig(false);
  };

  return (
    <div className="animate-in">
      <SectionHeader
        title={String(t("crmSystem"))}
        description={`Managing ${totalCount} leads from your MongoDB database${highValueLeadsCount > 0 ? ` • ${highValueLeadsCount} high-value prospects ⭐` : ''}`}
        action={
          <div className="flex gap-4">
            {/* Search */}
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, company, or email"
                className="pl-9 w-[280px]"
              />
            </div>
            {/* Email Settings Button - Hidden 
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleShowEmailConfig}
              className="flex items-center gap-2"
            >
              <Mail className="w-4 h-4" />
              Email Settings
            </Button>
            */}
            
            <div className="flex items-center gap-4">
              <div className="text-sm text-muted-foreground">
                Total: {totalCount} leads
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
                  className={autoRefreshEnabled ? "bg-green-50 border-green-200 text-green-700" : ""}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${autoRefreshEnabled ? 'animate-pulse' : ''}`} />
                  Auto-refresh {autoRefreshEnabled ? 'ON' : 'OFF'}
                </Button>
                <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
                  <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  {loading ? 'Loading...' : 'Refresh'}
                </Button>
              </div>
            </div>
            
            <Select onValueChange={(value) => dispatch(setLanguage(
              // @ts-ignore
              value))}>
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder={String(t("language"))} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="nl">Nederlands</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              className="bg-fuchsia-600 hover:bg-fuchsia-500"
              onClick={handleAddNewLead}
            >
              {String(t("addNewLead"))}
            </Button>
          </div>
        }
      />

      {/* Database Status - Hidden
      {!loading && (
        <Card className="mt-4 border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-green-800">
                  Connected to MongoDB • {totalCount} total leads
                </span>
              </div>
              <div className="flex gap-4 text-xs text-green-600">
                <span>New: {stageCounts.new_leads || 0}</span>
                <span>Contacted: {stageCounts.called_once || 0}</span>
                <span>Meetings: {stageCounts.meeting || 0}</span>
                <span>Deals: {stageCounts.deal || 0}</span>
                {highValueLeadsCount > 0 && (
                  <span className="font-medium">⭐ High-Value: {highValueLeadsCount}</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      */}

      <Tabs defaultValue="pipeline" className="mt-6">
        <TabsList>
          <TabsTrigger value="pipeline">{String(t("salesPipeline"))}</TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="space-y-4">
          {loading ? (
            <Card>
              <CardContent className="p-8">
                <div className="flex items-center justify-center">
                  <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                  <span>Loading leads from MongoDB...</span>
                </div>
              </CardContent>
            </Card>
          ) : leads.length > 0 ? (
            <Pipeline
              // @ts-ignore
              leads={leads}
              // @ts-ignore
              onLeadSelect={handleSelectLead}
              onStageChange={handleStageChange}
            />
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-gray-500">No leads found in database.</p>
                <p className="text-sm text-gray-400 mt-2">
                  Generate some leads first using the lead generation system.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {showLeadDetails && selectedLead && (
        <LeadDetails
          lead={selectedLead}
          // @ts-ignore
          onUpdate={handleUpdateLead}
          onClose={handleCloseDetails}
        />
      )}

      {showAddNewLead && (
        <AddNewLead
          onClose={handleCloseAddNewLead}
          onSuccess={handleNewLeadSuccess}
        />
      )}

      {showEmailConfig && (
        <EmailConfig
          onClose={handleCloseEmailConfig}
        />
      )}
    </div>
  );
};

export default CRM;
