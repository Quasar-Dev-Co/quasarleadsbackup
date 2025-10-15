"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SectionHeader } from "@/components/ui/section-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Filter, RotateCw, Search, Sparkles, ArrowUpRight, X, RefreshCw, Star, Zap, Clock, Play, Download, Mail, Upload } from "lucide-react";
import { useTranslations } from "@/hooks/use-translations";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { auth } from "@/lib/auth";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogClose,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { JobProgress } from "@/components/ui/job-progress";
import { SearchJobsProgress } from "@/components/ui/search-jobs-progress";
import EmailStatus from "@/components/ui/email-status";

// Define StatusType
type StatusType = "active" | "emailed" | "replied" | "booked";

// Define Lead type
type Lead = {
    _id: string;
    name: string;
    company: string;
    companyOwner?: string; // Company owner name from OpenAI lookup
    location: string;
    linkedinProfile: string;
    email: string;
    website?: string;
    status: StatusType;
    googleAds?: boolean;
    googleAdsChecked?: boolean;
    organicRanking?: number;
    tags?: string[];
    createdAt?: string;
    isHighValue: boolean;
    assignedTo?: string; // User ID who owns this lead
    leadsCreatedBy?: string; // User ID who created this lead
    rating?: string; // Google Maps business rating
    // Email automation fields
    emailSequenceActive?: boolean;
    emailSequenceStage?: string;
    emailSequenceStep?: number;
    emailStatus?: string;
    emailRetryCount?: number;
    emailFailureCount?: number;
    emailLastAttempt?: Date;
    nextScheduledEmail?: Date;
    emailErrors?: Array<{
        attempt: number;
        error: string;
        timestamp: Date;
    }>;
    emailHistory?: Array<{
        stage: string;
        sentAt: Date;
        status: string;
        retryCount?: number;
    }>;
    // Auth/Executive information from enrichment
    authInformation?: {
        company_name: string;
        company_email: string;
        owner_name: string;
        owner_email: string;
        manager_name: string;
        manager_email: string;
        hr_name: string;
        hr_email: string;
        executive_name: string;
        executive_email: string;
    };
};

// Define Job type
type Job = {
    jobId: string;
    type: 'lead-collection' | 'google-ads-check';
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
    priority: number;
    services: string[];
    locations: string[];
    leadQuantity: number;
    currentService: string;
    currentLocation: string;
    currentStep: number;
    totalSteps: number;
    progress: number;
    progressMessage: string;
    collectedLeads: number;
    totalLeadsCollected: number;
    errorMessage?: string;
    startedAt?: Date;
    completedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
    estimatedDuration: number;
    timeRemaining?: number;
    queuePosition?: number;
    retryCount: number;
    maxRetries: number;
    includeGoogleAdsAnalysis?: boolean;
    analyzeLeads?: boolean;
};

// HighValueBadge removed; simple leads only

// NEW: Google Ads Status Component
// GoogleAdsStatus removed from simple leads page

const LeadsCollection = () => {
    const { t } = useTranslations();
    
    // Get current user information
    const currentUser = auth.getCurrentUser();
    
    // Form state
    const [services, setServices] = useState("");
    const [locations, setLocations] = useState("");
    const [leadQuantity, setLeadQuantity] = useState("50");
    const [customLeadQuantity, setCustomLeadQuantity] = useState("");
    
    // Loading and progress state
    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [progressMessage, setProgressMessage] = useState("");
    const [collectedCount, setCollectedCount] = useState(0);
    
    // Data state
    const [newLeads, setNewLeads] = useState<Lead[]>([]);           // Leads without email automation
    const [processingLeads, setProcessingLeads] = useState<Lead[]>([]);  // Leads in email automation
    const [emailedLeads, setEmailedLeads] = useState<Lead[]>([]);    // Leads completed email sequence
    const [searchTerm, setSearchTerm] = useState("");
    const [activeTab, setActiveTab] = useState("new-leads");
    const [isViewAllOpen, setIsViewAllOpen] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isCleaningEmails, setIsCleaningEmails] = useState(false);
    const [isCleaningDuplicates, setIsCleaningDuplicates] = useState(false);
    
    // CRM Selection state
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
    const [isAddingToCRM, setIsAddingToCRM] = useState(false);
    const [isStartingEmailAutomation, setIsStartingEmailAutomation] = useState(false);
    const [isDeletingLeads, setIsDeletingLeads] = useState(false);
    
    // Job queue for reference (not used in new TemporaryLead system)
    const [jobQueue, setJobQueue] = useState<Job[]>([]);
    const [isExportOpen, setIsExportOpen] = useState(false);
    const [isImportOpen, setIsImportOpen] = useState(false);
    // Outreach configuration controls
    const [selectedRecipient, setSelectedRecipient] = useState<'lead' | 'company'>('lead');
    const [selectedSenderIdentity, setSelectedSenderIdentity] = useState<'company' | 'author'>('company');
    const [isEnrichingOwners, setIsEnrichingOwners] = useState(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    
    // Google Ads analysis is now integrated into main collection process

    // Load leads from MongoDB on initial render
    useEffect(() => {
        fetchLeads();
        fetchJobQueue();
    }, []);

    // Fetch leads from the backend
    const fetchLeads = async () => {
        setIsRefreshing(true);
        try {
            // Get current user ID
            const userId = await auth.getCurrentUserId();
            
            if (!userId) {
                console.error('No user ID available for fetching leads');
                setIsRefreshing(false);
                return;
            }
            
            // Fetch leads for this specific user only
            const allResponse = await fetch(`/api/leads?userId=${userId}`);
            if (!allResponse.ok) {
                throw new Error('Failed to fetch leads');
            }
            const allData = await allResponse.json();
            const allLeads = allData.leads || [];

            // Split leads by email automation status
            setNewLeads(allLeads.filter((l: Lead) => 
                // New leads: no email automation started yet
                !l.emailSequenceActive && (!l.emailHistory || l.emailHistory.length === 0)
            ));
            
            setProcessingLeads(allLeads.filter((l: Lead) => 
                // Processing: email automation is active and sequence not completed
                l.emailSequenceActive && 
                (!l.emailSequenceStage || l.emailSequenceStage !== 'called_seven_times')
            ));
            
            setEmailedLeads(allLeads.filter((l: Lead) => 
                // Emailed: email sequence completed (reached stage 7) or automation inactive with email history
                (!l.emailSequenceActive && l.emailHistory && l.emailHistory.length > 0) ||
                (l.emailSequenceStage === 'called_seven_times')
            ));
        } catch (error) {
            console.error('Error fetching leads:', error);
        } finally {
            setIsRefreshing(false);
        }
    };

    // NEW: Fetch job queue
    const fetchJobQueue = async () => {
        try {
            // Get current user ID
            const userId = await auth.getCurrentUserId();
            
            if (!userId) {
                console.error('No user ID available for fetching job queue');
                return;
            }
            
            const response = await fetch(`/api/jobs/queue?userId=${userId}`);
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setJobQueue(data.jobs || []);
                    
                    // NEW: Auto-start local processing for pending jobs in development
                    if (process.env.NODE_ENV === 'development') {
                        const pendingJobs = data.jobs?.filter((job: Job) => job.status === 'pending') || [];
                        for (const job of pendingJobs) {
                            console.log(`🔄 Auto-starting local job ${job.jobId} in development mode`);
                            startLocalJob(job.jobId);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching job queue:', error);
        }
    };

    // NEW: Start local job processing for development
    const startLocalJob = async (jobId: string) => {
        try {
            const response = await fetch('/api/jobs/process-local', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ jobId }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Local job processing error:', errorData);
            } else {
                const data = await response.json();
                console.log('Local job started:', data);
            }
        } catch (error) {
            console.error('Error starting local job:', error);
        }
    };

    // NEW: Handle starting background job collection
    const handleStartCollection = async () => {
        if (!services || !locations) {
            toast.error("Please enter both services and locations.");
            return;
        }

        // Validate custom quantity if selected
        if (leadQuantity === "custom") {
            if (!customLeadQuantity || parseInt(customLeadQuantity) < 1) {
                toast.error("Please enter a valid custom number of leads (minimum 1).");
                return;
            }
            if (parseInt(customLeadQuantity) > 10000) {
                toast.error("Maximum custom quantity is 10,000 leads.");
                return;
            }
        }

        setIsLoading(true);
        setProgress(0);
        setCollectedCount(0);
        
        try {
            // Determine the actual quantity to use
            const actualQuantity = leadQuantity === "custom" ? customLeadQuantity : leadQuantity;
            
            // Always use new TemporaryLead system
            const apiEndpoint = '/api/temporary-leads/search';
            const analysisType = 'SerpAPI → TemporaryLead → OpenAI enrichment';
            
            setProgressMessage(`Queuing job for background processing with ${analysisType}...`);
            
            // Get current user ID
            const userId = await auth.getCurrentUserId();
            
            if (!userId) {
                toast.error("User authentication required. Please login again.");
                setIsLoading(false);
                return;
            }

            // Queue the job for background processing
            const response = await fetch(apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    services,
                    locations,
                    userId: userId
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to queue job');
            }

            const data = await response.json();
            
            if (data.success) {
                toast.success(`🚀 ${data.message || 'Search jobs created successfully!'}`);
                console.log(`✅ Created ${data.jobsCreated} search jobs (${data.totalCombinations} combinations)`);
                console.log(`⏱️ Estimated completion time: ${data.estimatedTime}`);
                
                // Reset form
                setServices("");
                setLocations("");
                setLeadQuantity("50");
                setCustomLeadQuantity("");
                
                // Refresh leads list after a short delay to show new data
                setTimeout(() => {
                    fetchLeads();
                    toast.info("💡 Tip: Search jobs process every 5 minutes, auth checks every minute. Check back soon!");
                }, 2000);
            } else {
                throw new Error(data.error || 'Failed to create search jobs');
            }
        } catch (error: any) {
            console.error('Job queuing error:', error);
            toast.error(error.message || "Failed to queue job. Please try again.");
        } finally {
            setIsLoading(false);
            setProgress(0);
            setProgressMessage("");
        }
    };

    // Note: Job progress tracking removed - new TemporaryLead system uses background cron jobs

    // Removed high-value validation; only simple leads collection remains

    // Filter leads based on search term
    const getFilteredLeads = () => {
        let leadsToFilter;
        if (activeTab === "new-leads") {
            leadsToFilter = newLeads;
        } else if (activeTab === "processing-leads") {
            leadsToFilter = processingLeads;
        } else if (activeTab === "emailed-leads") {
            leadsToFilter = emailedLeads;
        } else {
            leadsToFilter = activeTab === "new-leads" ? newLeads : processingLeads;
        }
        if (!searchTerm) return leadsToFilter;
        return leadsToFilter.filter(lead =>
            lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            lead.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (lead.companyOwner && lead.companyOwner.toLowerCase().includes(searchTerm.toLowerCase())) ||
            lead.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
            lead.email.toLowerCase().includes(searchTerm.toLowerCase())
        );
    };

    const filteredLeads = getFilteredLeads();

    // For the dashboard
    const allLeads = [...newLeads, ...processingLeads, ...emailedLeads];

    // Google Ads analysis is now integrated into the main collection process

    // NEW: Get active jobs count
    const activeJobsCount = jobQueue.filter(job => 
        job.status === 'pending' || job.status === 'running'
    ).length;

    // Global toast deduplication system
    const lastToastRef = useRef<{message: string, time: number}>({message: '', time: 0});
    
    const showUniqueToast = (message: string, type: 'success' | 'error' = 'success') => {
        const now = Date.now();
        const timeDiff = now - lastToastRef.current.time;
        
        // Prevent duplicate toasts within 1 second
        if (lastToastRef.current.message === message && timeDiff < 1000) {
            return; // Block duplicate
        }
        
        lastToastRef.current = {message, time: now};
        
        if (type === 'success') {
            toast.success(message);
        } else {
            toast.error(message);
        }
    };
    
    const copyEmailToClipboard = async (event: React.MouseEvent, email: string) => {
        // Prevent event bubbling
        event.preventDefault();
        event.stopPropagation();
        
        try {
            await navigator.clipboard.writeText(email);
            showUniqueToast(`📧 Email copied: ${email}`);
        } catch (error) {
            // Fallback for older browsers
            try {
                const textArea = document.createElement('textarea');
                textArea.value = email;
                textArea.style.position = 'fixed';
                textArea.style.opacity = '0';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                const successful = document.execCommand('copy');
                document.body.removeChild(textArea);
                
                if (successful) {
                    showUniqueToast(`📧 Email copied: ${email}`);
                } else {
                    showUniqueToast('Failed to copy email to clipboard', 'error');
                }
            } catch (fallbackError) {
                showUniqueToast('Failed to copy email to clipboard', 'error');
            }
        }
    };

    // Show Auth Information dialog for a lead
    const [authInfoLead, setAuthInfoLead] = useState<Lead | null>(null);

    // CRM Selection functions
    const toggleSelectionMode = () => {
        setIsSelectionMode(!isSelectionMode);
        setSelectedLeads(new Set());
    };

    const toggleLeadSelection = (leadId: string) => {
        const newSelected = new Set(selectedLeads);
        if (newSelected.has(leadId)) {
            newSelected.delete(leadId);
        } else {
            newSelected.add(leadId);
        }
        setSelectedLeads(newSelected);
    };

    const toggleSelectAll = () => {
        const currentLeads = filteredLeads;
        if (selectedLeads.size === currentLeads.length && currentLeads.every(lead => selectedLeads.has(lead._id))) {
            setSelectedLeads(new Set());
        } else {
            setSelectedLeads(new Set(currentLeads.map(lead => lead._id)));
        }
    };

    const addSelectedToCRM = async () => {
        if (selectedLeads.size === 0) {
            showUniqueToast('Please select at least one lead', 'error');
            return;
        }

        setIsAddingToCRM(true);

        try {
            // Get leads from new leads tab (only new leads can start automation)
            const leadsToAdd = newLeads.filter(lead => selectedLeads.has(lead._id));
            
            let successCount = 0;
            let errorCount = 0;
            
            // Process each lead individually
            for (const lead of leadsToAdd) {
                try {
                    // Update lead status to "emailed" via CRM API
                    const response = await fetch('/api/crm/leads', {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            leadId: lead._id,
                            stage: 'called_once', // This automatically starts email automation
                            notes: `Added to email queue via lead selection on ${new Date().toLocaleDateString()}`
                        }),
                    });

                    const result = await response.json();
                    
                    if (result.success) {
                        // Email automation will be handled by the cron job - no need to send manually
                        successCount++;
                        console.log(`✅ Successfully added ${lead.name} to email automation queue`);
                    } else {
                        errorCount++;
                        console.error(`❌ Failed to add ${lead.name}: ${result.error}`);
                    }
                } catch (error) {
                    errorCount++;
                    console.error(`❌ Error adding ${lead.name}:`, error);
                }
                
                // Small delay between API calls
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            if (successCount > 0 && errorCount === 0) {
                showUniqueToast(`✅ Successfully added ${successCount} leads to email automation queue! Emails will be sent by the automation system.`);
            } else if (successCount > 0 && errorCount > 0) {
                showUniqueToast(`⚠️ Added ${successCount} leads to automation queue, ${errorCount} failed`);
            } else {
                showUniqueToast('❌ Failed to add leads to automation queue', 'error');
            }
            
            // Refresh leads data to show updated statuses
            await fetchLeads();
            
            // Reset selection
            setSelectedLeads(new Set());
            setIsSelectionMode(false);
            
        } catch (error) {
            console.error('Error adding leads to email queue:', error);
            showUniqueToast('Failed to add leads to email queue', 'error');
        } finally {
            setIsAddingToCRM(false);
        }
    };

    // Start Email Automation function
    const startEmailAutomation = async () => {
        if (selectedLeads.size === 0) {
            showUniqueToast('Please select at least one lead', 'error');
            return;
        }

        setIsStartingEmailAutomation(true);

        try {
            const leadIds = Array.from(selectedLeads);
            // Determine outreach config from UI selections if present
            const outreachRecipient = selectedRecipient || undefined; // 'lead' | 'company'
            const senderIdentity = selectedSenderIdentity || undefined; // 'company' | 'author'
            
            const userId = await auth.getCurrentUserId();
            const response = await fetch('/api/start-email-automation', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ leadIds, userId, outreachRecipient, senderIdentity }),
            });

            const result = await response.json();
            
            if (response.ok && result.success) {
                const { summary } = result;
                showUniqueToast(
                    `✅ Email automation started for ${summary.started} leads! 
                    ${summary.skipped > 0 ? `(${summary.skipped} already active)` : ''}
                    ${summary.errors > 0 ? `(${summary.errors} errors)` : ''}`
                );
                
                // Log detailed results for debugging
                console.log('📧 Email automation results:', result.results);
                
                // Refresh leads data to show updated statuses
                await fetchLeads();
                
                // Reset selection
                setSelectedLeads(new Set());
                setIsSelectionMode(false);
            } else {
                // Surface missing credentials clearly
                const msg = result?.error || 'Failed to start email automation';
                showUniqueToast(`❌ ${msg}`, 'error');
            }
            
        } catch (error) {
            console.error('Error starting email automation:', error);
            showUniqueToast('Failed to start email automation', 'error');
        } finally {
            setIsStartingEmailAutomation(false);
        }
    };

    // Export functions
    const exportLeads = async (format: 'csv' | 'pdf' | 'json') => {
        try {
            const allLeads = [...newLeads, ...processingLeads, ...emailedLeads];

            if (allLeads.length === 0) {
                toast.error("No leads to export");
                return;
            }

            // CSV export
            if (format === 'csv') {
                const headers = [
                    'Name', 'Company', 'Email', 'Location', 'LinkedIn Profile', 'Website',
                    'Status', 'Tags', 'Created Date'
                ];

                const csvRows = allLeads.map(lead => [
                    lead.name || '', lead.company || '', lead.email || '', lead.location || '',
                    lead.linkedinProfile ? `https://${lead.linkedinProfile}` : '', lead.website || '',
                    lead.status || '', (lead.googleAds || lead.isHighValue) ? 'Yes' : 'No',
                    lead.isHighValue ? 'Yes' : 'No', lead.organicRanking || '',
                    lead.tags?.join('; ') || '',
                    lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : ''
                ]);

                const content = [headers, ...csvRows]
                    .map(row => row.map(field => `"${field}"`).join(','))
                    .join('\n');
                const filename = `leads-export-${new Date().toISOString().split('T')[0]}.csv`;
                const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });

                const link = document.createElement('a');
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', filename);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                toast.success(`Exported ${allLeads.length} leads to CSV file`);
                return;
            }

            // JSON export
            if (format === 'json') {
                const content = JSON.stringify(allLeads, null, 2);
                const filename = `leads-export-${new Date().toISOString().split('T')[0]}.json`;
                const blob = new Blob([content], { type: 'application/json' });

                const link = document.createElement('a');
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', filename);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                toast.success(`Exported ${allLeads.length} leads to JSON file`);
                return;
            }

            // PDF export (real PDF)
            if (format === 'pdf') {
                const { jsPDF } = await import('jspdf');
                const doc = new jsPDF({ unit: 'pt', format: 'a4' });

                const margin = 40;
                const pageWidth = doc.internal.pageSize.getWidth();
                const pageHeight = doc.internal.pageSize.getHeight();
                const contentWidth = pageWidth - margin * 2;
                const lineHeight = 16;

                // Title
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(16);
                doc.text('Leads Export', margin, margin);

                // Subtitle (date)
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(10);
                doc.text(`Generated: ${new Date().toLocaleString()}`, margin, margin + 14);

                let y = margin + 32;

                // Column labels
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(11);
                const columns = [
                    { key: 'name', label: 'Name', width: Math.floor(contentWidth * 0.16) },
                    { key: 'company', label: 'Company', width: Math.floor(contentWidth * 0.18) },
                    { key: 'companyOwner', label: 'Owner', width: Math.floor(contentWidth * 0.16) },
                    { key: 'email', label: 'Email', width: Math.floor(contentWidth * 0.24) },
                    { key: 'location', label: 'Location', width: Math.floor(contentWidth * 0.14) },
                    { key: 'status', label: 'Status', width: Math.floor(contentWidth * 0.12) },
                ];

                let x = margin;
                columns.forEach(col => {
                    doc.text(col.label, x, y);
                    x += col.width;
                });

                // Separator line
                y += 6;
                doc.setLineWidth(0.5);
                doc.line(margin, y, pageWidth - margin, y);
                y += 10;

                // Rows
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(10);

                for (const lead of allLeads) {
                    // Compute wrapped lines per column
                    const values = [
                        String(lead.name || ''),
                        String(lead.company || ''),
                        String(lead.companyOwner || ''),
                        String(lead.email || ''),
                        String(lead.location || ''),
                        String(lead.status || ''),
                    ];

                    const wrappedPerCol = values.map((val, idx) => {
                        return doc.splitTextToSize(val, columns[idx].width - 6);
                    });

                    const rowHeight = Math.max(
                        ...wrappedPerCol.map(lines => Math.max(lines.length, 1) * lineHeight)
                    );

                    // Add new page if needed
                    if (y + rowHeight > pageHeight - margin) {
                        doc.addPage();
                        y = margin;

                        // redraw header on new page
                        doc.setFont('helvetica', 'bold');
                        doc.setFontSize(11);
                        let hx = margin;
                        columns.forEach(col => {
                            doc.text(col.label, hx, y);
                            hx += col.width;
                        });
                        y += 6;
                        doc.setLineWidth(0.5);
                        doc.line(margin, y, pageWidth - margin, y);
                        y += 10;
                        doc.setFont('helvetica', 'normal');
                        doc.setFontSize(10);
                    }

                    // Draw cell texts
                    let cx = margin;
                    wrappedPerCol.forEach((lines: string[], idx: number) => {
                        let lineY = y;
                        lines.forEach((line: string) => {
                            doc.text(line, cx + 2, lineY);
                            lineY += lineHeight;
                        });
                        cx += columns[idx].width;
                    });

                    y += rowHeight + 6;
                }

                const filename = `leads-export-${new Date().toISOString().split('T')[0]}.pdf`;
                doc.save(filename);

                toast.success(`Exported ${allLeads.length} leads to PDF file`);
                return;
            }
        } catch (error) {
            console.error('Error exporting leads:', error);
            toast.error(`Failed to export leads to ${format.toUpperCase()}`);
        }
    };

    // Import function
    const importLeads = async (file: File) => {
        try {
            const isJsonByType = file.type === 'application/json' || file.type === '';
            const isJsonByName = file.name.toLowerCase().endsWith('.json');
            if (!(isJsonByType && isJsonByName)) {
                toast.error("Only JSON files are accepted for import");
                return;
            }

            const userId = await auth.getCurrentUserId();
            if (!userId) {
                toast.error("You must be signed in to import leads");
                return;
            }

            const text = await file.text();
            const parsed = JSON.parse(text);
            const importedLeads = Array.isArray(parsed) ? parsed : [parsed];

            // Map to supported fields and validate
            const cleanedLeads = importedLeads
                .map((lead: any) => ({
                    name: lead.name,
                    company: lead.company,
                    email: lead.email,
                    location: lead.location || '',
                    website: lead.website || '',
                    phone: lead.phone || '',
                    linkedinProfile: lead.linkedinProfile || '',
                    status: lead.status || 'active',
                    notes: lead.notes || '',
                    tags: Array.isArray(lead.tags) ? lead.tags : [],
                    source: lead.source || 'import',
                    industry: lead.industry || '',
                    googleAds: !!lead.googleAds,
                    organicRanking: lead.organicRanking ?? null,
                    isHighValue: !!lead.isHighValue,
                }))
                .filter((lead: any) => lead.name && lead.company && lead.email);

            if (cleanedLeads.length === 0) {
                toast.error("No valid leads found. Each lead must include name, company, and email");
                return;
            }

            // Upload to backend; assign to current user via header
            let successCount = 0;
            let failureCount = 0;

            const results = await Promise.allSettled(
                cleanedLeads.map((lead: any) =>
                    fetch('/api/leads', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-user-id': userId,
                        },
                        body: JSON.stringify(lead),
                    }).then(async (res) => {
                        if (!res.ok) {
                            const data = await res.json().catch(() => ({}));
                            throw new Error(data?.error || `HTTP ${res.status}`);
                        }
                        return res.json();
                    })
                )
            );

            results.forEach((r) => {
                if (r.status === 'fulfilled' && r.value?.success) {
                    successCount += 1;
                } else {
                    failureCount += 1;
                }
            });

            if (successCount > 0) {
                toast.success(`Imported ${successCount} lead${successCount !== 1 ? 's' : ''}`);
            }
            if (failureCount > 0) {
                toast.error(`${failureCount} lead${failureCount !== 1 ? 's' : ''} failed (duplicates or validation)`);
            }

            // Refresh data to reflect new leads
            await fetchLeads();
            setIsImportOpen(false);

        } catch (error) {
            console.error('Error importing leads:', error);
            toast.error("Failed to import leads. Please check the JSON file.");
        }
    };

    // Enrich leads with company owner information
    const enrichLeadsWithOwners = async () => {
        try {
            setIsEnrichingOwners(true);
            toast.info("🔍 Starting company owner lookup for your leads...");
            
            const userId = await auth.getCurrentUserId();
            if (!userId) {
                toast.error("User not authenticated. Please log in to enrich leads.");
                return;
            }

            const response = await fetch('/api/leads/enrich-owners', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                toast.success(`✅ ${data.message}`);
                await fetchLeads(); // Refresh the leads to show updated owner information
            } else {
                toast.error(data.error || 'Failed to enrich leads with owner information');
            }
        } catch (error) {
            console.error('Error enriching leads with owners:', error);
            toast.error("Failed to enrich leads with owner information. Please try again.");
        } finally {
            setIsEnrichingOwners(false);
        }
    };

    // Delete Leads function
    const deleteSelectedLeads = async () => {
        if (selectedLeads.size === 0) {
            showUniqueToast('No leads selected', 'error');
            return;
        }

        if (!window.confirm(`Are you sure you want to delete ${selectedLeads.size} leads? This action cannot be undone.`)) {
            return;
        }

        setIsDeletingLeads(true);

        try {
            const leadIds = Array.from(selectedLeads);
            const response = await fetch('/api/leads/delete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ leadIds }),
            });

            const result = await response.json();

            if (result.success) {
                showUniqueToast(`✅ Successfully deleted ${result.deletedCount} leads!`, 'success');
                // Clear selection and refresh leads
                setSelectedLeads(new Set());
                fetchLeads();
                setIsSelectionMode(false);
            } else {
                showUniqueToast(`❌ Failed to delete leads: ${result.message}`, 'error');
            }
        } catch (error) {
            console.error('Error deleting leads:', error);
            showUniqueToast('Failed to delete leads', 'error');
        } finally {
            setIsDeletingLeads(false);
        }
    };

    return (
        <div className="animate-in">
            {/* Current User Information */}
            {currentUser && (
                <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                                {currentUser.username.charAt(0)}
                            </div>
                            <div>
                                <h3 className="font-semibold text-purple-800">
                                    Welcome, {currentUser.username}!
                                </h3>
                                <p className="text-sm text-purple-600">
                                    User ID: {currentUser.id} | Email: {currentUser.email}
                                </p>
                                <p className="text-xs text-purple-500 mt-1">
                                    All leads you create will be assigned to you automatically
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-sm font-medium text-purple-800">
                                Session Active
                            </div>
                            <div className="text-xs text-purple-600">
                                {auth.getRemainingTime()} hours remaining
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Enhanced Lead Collection Notification */}
            <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <Star className="h-5 w-5 text-green-600" />
                        <h3 className="font-semibold text-green-800">
                            {t("productionBackgroundJobSystem")}
                        </h3>
                    </div>
                    {process.env.NODE_ENV !== 'development' && (
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                    try {
                                        const response = await fetch('/api/cron/health');
                                        const data = await response.json();
                                        
                                        if (data.healthy) {
                                            toast.success(`✅ Cronjob System: ${data.message}`);
                                        } else {
                                            toast.error(`⚠️ Issues Detected: ${data.data?.issues?.join(', ') || 'Unknown issues'}`);
                                        }
                                    } catch (error) {
                                        toast.error('Failed to check system health');
                                    }
                                }}
                                className="text-xs"
                            >
                                {t("checkHealth")}
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                    try {
                                        toast.loading(t("testingCronjob"), { duration: 5000 });
                                        const response = await fetch('/api/cron/health', { method: 'POST' });
                                        const data = await response.json();
                                        
                                        if (data.success) {
                                            toast.success(t("cronjobTestSuccess"));
                                        } else {
                                            toast.error(`${t("cronjobTestFailed")}: ${data.error}`);
                                        }
                                    } catch (error) {
                                        toast.error(t("failedToTestCronjob"));
                                    }
                                }}
                                className="text-xs"
                            >
                                {t("testCronjob")}
                            </Button>
                        </div>
                    )}
                </div>
                <p className="text-sm text-green-700">
                    {process.env.NODE_ENV === 'development' ? (
                        <>
                            <strong>{t("localProcessing")}</strong> {t("localProcessingDesc")}
                        </>
                    ) : (
                        <>
                            <strong>{t("backgroundProcessing")}</strong> {t("backgroundProcessingDesc")}
                            <br />
                            <strong>{t("proTimeout")}</strong> {t("proTimeoutDesc")}
                        </>
                    )}
                </p>
                
                {/* NEW: Step-by-Step Processing Explanation */}
                <div className="mt-3 p-3 bg-white rounded border border-green-300">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        <span className="text-sm font-medium text-blue-800">Step-by-Step Processing System</span>
                    </div>
                    <div className="text-xs text-blue-700 space-y-1">
                        <div><strong>How it works:</strong></div>
                        <div>• Cron job runs every 5 minutes</div>
                        <div>• Processes ONE service-location combination per execution</div>
                        <div>• Example: "Web Design, SEO" + "Miami, Orlando" = 4 steps total</div>
                        <div>• Step 1: Web Design + Miami (5 min)</div>
                        <div>• Step 2: Web Design + Orlando (5 min)</div>
                        <div>• Step 3: SEO + Miami (5 min)</div>
                        <div>• Step 4: SEO + Orlando (5 min)</div>
                        <div>• Total time: ~20 minutes (4 steps × 5 min each)</div>
                    </div>
                </div>
            </div>

            <SectionHeader
                title={String(t("leadsCollectionTitle"))}
                description={String(t("leadsCollectionDescription"))}
            />

            {/* NEW: Active Jobs Summary */}
            {activeJobsCount > 0 && (
                <Card className="mb-6 border-blue-200 bg-blue-50">
                    <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Play className="h-5 w-5 text-blue-600" />
                                <span className="font-medium text-blue-800">
                                    {activeJobsCount} Active Job{activeJobsCount > 1 ? 's' : ''} in Queue
                                </span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={fetchJobQueue}
                                    className="ml-2"
                                >
                                    <RefreshCw className="h-4 w-4" />
                                </Button>
                            </div>
                            {/* Job progress controls removed - new system uses background cron jobs */}
                        </div>
                        {/* Debug info - remove in production */}
                        {process.env.NODE_ENV === 'development' && (
                            <div className="mt-2 text-xs text-blue-600">
                                Debug: {jobQueue.length} total jobs, {activeJobsCount} active
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Job Progress Section removed - new TemporaryLead system uses background cron jobs */}

            <Card className="mt-6 bg-card">
                <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <Label htmlFor="services">{String(t("enterServices"))}</Label>
                            <Input
                                id="services"
                                placeholder="Web Development, Web Design, SEO, Marketing"
                                value={services}
                                onChange={e => setServices(e.target.value)}
                                className="mt-1"
                                disabled={isLoading}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                {String(t("servicesListDescription"))}
                            </p>
                        </div>
                        <div>
                            <Label htmlFor="locations">{t("enterLocations")}</Label>
                            <Input
                                id="locations"
                                placeholder={String(t("locationsPlaceholder"))}
                                value={locations}
                                onChange={e => setLocations(e.target.value)}
                                className="mt-1"
                                disabled={isLoading}
                            />
                            <span className="text-muted-foreground text-xs">{t("locationsDescription")}</span>
                        </div>
                    </div>

                    {/* NEW: Processing Preview */}
                    {services && locations && (
                        <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                <span className="text-sm font-medium text-gray-800">Processing Preview</span>
                            </div>
                            <div className="text-xs text-gray-600 space-y-1">
                                {(() => {
                                    const servicesList = services.split(',').map(s => s.trim()).filter(Boolean);
                                    const locationsList = locations.split(',').map(l => l.trim()).filter(Boolean);
                                    const totalSteps = servicesList.length * locationsList.length;
                                    
                                    return (
                                        <>
                                            <div><strong>Total Steps:</strong> {totalSteps} combinations</div>
                                            <div><strong>Estimated Time:</strong> ~{Math.ceil(totalSteps * 5 / 60)} minutes</div>
                                            <div className="mt-2"><strong>Processing Order:</strong></div>
                                            {servicesList.map((service, serviceIndex) => (
                                                <div key={service} className="ml-2">
                                                    <div className="font-medium">{service}:</div>
                                                    {locationsList.map((location, locationIndex) => {
                                                        const stepNumber = serviceIndex * locationsList.length + locationIndex + 1;
                                                        return (
                                                            <div key={location} className="ml-4 text-gray-500">
                                                                Step {stepNumber}: {service} + {location}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ))}
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                    )}

                    {/* High Value Leads toggle removed */}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                        {/* Number of leads section - HIDDEN */}
                        {/* <div>
                            <Label htmlFor="leadQuantity">{String(t("Number Of Leads"))}</Label>
                            <Select value={leadQuantity} onValueChange={setLeadQuantity} disabled={isLoading}>
                                <SelectTrigger className="mt-1 w-full">
                                    <SelectValue placeholder={String(t("selectQuantity"))} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="5">5 {String(t("leads"))}</SelectItem>
                                    <SelectItem value="10">10 {String(t("leads"))}</SelectItem>
                                    <SelectItem value="20">20 {String(t("leads"))}</SelectItem>
                                    <SelectItem value="50">50 {String(t("leads"))}</SelectItem>
                                    <SelectItem value="100">100 {String(t("leads"))}</SelectItem>
                                    <SelectItem value="200">200 {String(t("leads"))}</SelectItem>
                                    <SelectItem value="500">500 {String(t("leads"))}</SelectItem>
                                    <SelectItem value="1000">1000 {String(t("leads"))}</SelectItem>
                                    <SelectItem value="custom">{String(t("customAmount"))}</SelectItem>
                                </SelectContent>
                            </Select>
                            
                            {leadQuantity === "custom" && (
                                <div className="mt-2">
                                    <Input
                                        type="number"
                                        placeholder="Enter custom number of leads"
                                        value={customLeadQuantity}
                                        onChange={(e) => setCustomLeadQuantity(e.target.value)}
                                        min="1"
                                        max="10000"
                                        disabled={isLoading}
                                        className="w-full"
                                    />
                                </div>
                            )}
                            
                            <p className="text-xs text-muted-foreground mt-1">
                                {String(t("Choose Leads Quantity"))}
                            </p>
                        </div> */}
                        <div className="flex flex-col items-start justify-end space-y-2 mt-6">
                            <Button
                                onClick={handleStartCollection}
                                disabled={!services || !locations || isLoading}
                                className="w-full md:w-auto text-zinc-50 bg-fuchsia-600 hover:bg-fuchsia-500"
                            >
                                {isLoading ? (
                                    <>
                                        <RotateCw className="mr-2 h-4 w-4 animate-spin" />
                                        {t("queuingJob")}
                                    </>
                                ) : (
                                    <>
                                        <Zap className="mr-2 h-4 w-4" />
                                        {t("startSimpleCollection")}
                                    </>
                                )}
                            </Button>
                            
                            {isLoading && (
                                <div className="w-full space-y-2">
                                    <Progress value={progress} className="w-full h-2" />
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                        <span>{progressMessage}</span>
                                        <span>{collectedCount} leads collected</span>
                                    </div>
                                </div>
                            )}
                            
                            {/* Google Ads analysis progress is now integrated into main job progress */}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Separator className="my-8" />

            <div className="flex justify-between items-center">
                <SectionHeader
                    title={String(t("Leads List"))}
                    description={String(t("View Manage Leads"))}
                />
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={fetchLeads}
                        disabled={isRefreshing}
                        title="Refresh leads"
                    >
                        <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </Button>
                    <Button 
                        variant="outline" 
                        className="flex items-center gap-1"
                        onClick={() => setIsExportOpen(true)}
                        title="Export leads in multiple formats"
                    >
                        <Download className="h-4 w-4" />
                        <span>Export</span>
                    </Button>
                    <Button 
                        variant="outline" 
                        className="flex items-center gap-1"
                        onClick={() => setIsImportOpen(true)}
                        title="Import leads from JSON file"
                    >
                        <Upload className="h-4 w-4" />
                        <span>Import</span>
                    </Button>
                    <Button 
                        variant="outline" 
                        className="flex items-center gap-1"
                        onClick={enrichLeadsWithOwners}
                        disabled={isEnrichingOwners}
                        title="Use AI to find company owners for your leads"
                    >
                        <span className="h-4 w-4">🔍</span>
                        <span>{isEnrichingOwners ? 'Enriching...' : 'Enrich Owners'}</span>
                    </Button>

                    <Button 
                        variant="outline" 
                        className="flex items-center gap-1 text-red-600 border-red-200 hover:bg-red-50"
                        onClick={async () => {
                            const confirmEmailCleanup = confirm("🤖 AI-Powered Email Validation\n\nThis will use OpenAI to intelligently analyze ALL emails and remove invalid ones.\n\n• Uses GPT-4o-mini for smart validation\n• Processes in batches of 30 emails\n• Large datasets use cronjob processing\n• Only removes obviously invalid emails\n\nContinue?");
                            if (!confirmEmailCleanup) return;
                            
                            setIsCleaningEmails(true);
                            
                            try {
                                toast.loading("🤖 AI analyzing emails with OpenAI... This may take a few minutes.", { duration: 15000 });
                                
                                const authHeader = auth.getAuthHeader();
                                const response = await fetch('/api/leads/cleanup-invalid-emails', {
                                    method: 'POST',
                                    headers: authHeader ? { Authorization: authHeader } : undefined
                                });
                                
                                if (!response.ok) {
                                    const err = await response.json().catch(() => ({}));
                                    if (err?.error === 'OPENAI_API_KEY_MISSING') {
                                        toast.error('Please enter your OpenAI API key in Account Settings → Credentials.');
                                    }
                                    throw new Error(err?.message || 'Failed to cleanup invalid emails');
                                }
                                
                                const result = await response.json();
                                
                                if (result.success) {
                                    if (result.cronjobStarted) {
                                        toast.success(
                                            `🤖 AI Email Cleanup Started!\n` +
                                            `• Total emails: ${result.totalEmails}\n` +
                                            `• Processing in ${result.totalBatches} batches\n` +
                                            `• Cronjob will process automatically\n` +
                                            `• Check logs for progress`,
                                            { duration: 10000 }
                                        );
                                    } else {
                                        toast.success(
                                            `🤖 AI Email Cleanup Complete!\n` +
                                            `• Processed: ${result.processed} emails\n` +
                                            `• Valid: ${result.valid} emails\n` +
                                            `• Invalid removed: ${result.invalid} emails\n` +
                                            `• Time: ${result.processingTime}ms`,
                                            { duration: 8000 }
                                        );
                                    }
                                    
                                    // Refresh the leads list
                                    fetchLeads();
                                } else {
                                    throw new Error(result.error);
                                }
                            } catch (error: any) {
                                console.error('AI Email cleanup error:', error);
                                toast.error(`Failed to cleanup invalid emails: ${error.message}`);
                            } finally {
                                setIsCleaningEmails(false);
                            }
                        }}
                        disabled={isCleaningEmails}
                        title="Use AI to intelligently validate and remove invalid emails"
                    >
                        {isCleaningEmails ? (
                            <>
                                <RotateCw className="h-4 w-4 animate-spin" />
                                <span>AI Analyzing...</span>
                            </>
                        ) : (
                            <>
                                <Sparkles className="h-4 w-4" />
                                <span>AI Clean Emails</span>
                            </>
                        )}
                    </Button>
                    <Button 
                        variant="outline" 
                        className="flex items-center gap-1 text-orange-600 border-orange-200 hover:bg-orange-50"
                        onClick={async () => {
                            const confirmCleanup = confirm("Clean duplicate leads by exact email match? This will delete newer duplicates and keep the oldest record. Continue?");
                            if (!confirmCleanup) return;

                            try {
                                const authHeader = auth.getAuthHeader();
                                const resp = await fetch('/api/leads/cleanup-duplicates?by=email&scope=user', {
                                    method: 'POST',
                                    headers: authHeader ? { Authorization: authHeader } : undefined
                                });
                                const data = await resp.json();
                                if (!resp.ok || !data.success) throw new Error(data?.error || 'Failed to clean duplicates');

                                toast.success(`Removed ${data?.stats?.duplicatesRemoved || 0} duplicate leads. Updated ${data?.stats?.leadsUpdated || 0} records.`);
                                fetchLeads();
                            } catch (e: any) {
                                console.error('Duplicate cleanup failed:', e);
                                toast.error(e?.message || 'Duplicate cleanup failed');
                            }
                        }}
                        title="Delete duplicate leads by exact email for this user"
                    >
                        <RotateCw className="h-4 w-4" />
                        <span>Clean Duplicate Leads</span>
                    </Button>
                    <Button 
                        variant="outline" 
                        className="flex items-center gap-1 text-blue-600 border-blue-200 hover:bg-blue-50"
                        onClick={toggleSelectionMode}
                        title={String(t("toggleLeadSelectionMode"))}
                    >
                        <Mail className="h-4 w-4" />
                        <span>{t(isSelectionMode ? "cancelSelection" : "selectLeadsForAutomation")}</span>
                    </Button>
                    <Button 
                        variant="outline" 
                        className="flex items-center gap-1"
                        onClick={() => setIsViewAllOpen(true)}
                        title={String(t("viewAllLeads"))}
                    >
                        <span>{t("viewAll")}</span>
                        <ArrowUpRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Email Queue Selection Status Panel */}
            {isSelectionMode && (
                <Card className="mt-6 border-blue-200 bg-blue-50">
                    <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Mail className="h-5 w-5 text-blue-600" />
                                <span className="font-medium text-blue-800">
                                    {`${t("leadSelection")}: ${selectedLeads.size} ${selectedLeads.size !== 1 ? t("leadsSelected") : t("leadSelected")}`}
                                </span>
                            </div>
                            <div className="flex gap-2 flex-wrap">
                                {/* Sending Name selector */}
                                <Select value={selectedSenderIdentity} onValueChange={(v) => setSelectedSenderIdentity(v as 'company' | 'author')}>
                                    <SelectTrigger className="w-[170px]">
                                        <SelectValue placeholder="Sending Name" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="company">Company Name</SelectItem>
                                        <SelectItem value="author">Owner Name</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSelectedLeads(new Set())}
                                    className="border-blue-300 text-blue-700 hover:bg-blue-100"
                                >
                                    {t("clearSelection")}
                                </Button>
                                {selectedLeads.size > 0 && (
                                    <>
                                        <Button
                                            size="sm"
                                            onClick={startEmailAutomation}
                                            disabled={isStartingEmailAutomation || isAddingToCRM}
                                            className="bg-blue-600 hover:bg-blue-700 text-white flex-1"
                                            title={String(t("startAutomatedEmailSequence"))}
                                        >
                                            {isStartingEmailAutomation ? (
                                                <>
                                                    <RotateCw className="h-4 w-4 animate-spin mr-2" />
                                                    {t("starting")}
                                                </>
                                            ) : (
                                                <>
                                                    🚀 {`${t("startAutomation")} (${selectedLeads.size})`}
                                                </>
                                            )}
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={deleteSelectedLeads}
                                            disabled={isAddingToCRM || isStartingEmailAutomation || isDeletingLeads}
                                            className="bg-red-500 text-white hover:bg-rose-400 flex-1 cursor-pointer"
                                            title={String(t("permanentlyDeleteSelectedLeads"))}
                                        >
                                            {isDeletingLeads ? (
                                                <>
                                                    <RotateCw className="h-4 w-4 animate-spin mr-2" />
                                                    {t("deleting")}
                                                </>
                                            ) : (
                                                <>
                                                    🗑️ {`${t("deleteLeads")} (${selectedLeads.size})`}
                                                </>
                                            )}
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>
                        {selectedLeads.size > 0 && (
                            <div className="mt-3 p-3 bg-white rounded border text-sm text-gray-600">
                                <div className="flex items-start gap-2">
                                    <div className="text-blue-600 font-semibold">{t("options")}:</div>
                                </div>
                                <div className="ml-2 mt-1 space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-blue-600">🚀</span>
                                        <span><strong>{t("startAutomation")}:</strong> {t("usesEmailTemplatesFromEmailPrompting")}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-red-600">🗑️</span>
                                        <span><strong>{t("permanentlyDeleteSelectedLeads")}:</strong> {t("permanentlyRemoveSelectedLeadsFromDatabase")}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Global progress for search jobs and temporary leads */}
            <div className="mt-6">
                <SearchJobsProgress />
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
                <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-4">
                    <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 lg:w-auto">
                        <TabsTrigger value="new-leads" className="text-xs sm:text-sm">
                            <span className="truncate">{t("newLeads")}</span>
                            {newLeads.length > 0 && (
                                <span className="ml-1 sm:ml-2 px-1 sm:px-2 py-0.5 text-xs bg-fuchsia-600 text-white rounded-full">
                                    {newLeads.length}
                                </span>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="processing-leads" className="text-xs sm:text-sm">
                            <span className="truncate">{t("processing")}</span>
                            {processingLeads.length > 0 && (
                                <span className="ml-1 sm:ml-2 px-1 sm:px-2 py-0.5 text-xs bg-fuchsia-600 text-white rounded-full">
                                    {processingLeads.length}
                                </span>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="emailed-leads" className="text-xs sm:text-sm">
                            <span className="truncate">{t("emailed")}</span>
                            {emailedLeads.length > 0 && (
                                <span className="ml-1 sm:ml-2 px-1 sm:px-2 py-0.5 text-xs bg-fuchsia-600 text-white rounded-full">
                                    {emailedLeads.length}
                                </span>
                            )}
                        </TabsTrigger>
                        {/* Removed High Value tab */}
                    </TabsList>
                    <div className="flex gap-2 flex-col sm:flex-row">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={String(t("Search Leads"))}
                                className="pl-8 w-full sm:w-[250px] min-w-0"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Button variant="outline" size="icon" className="shrink-0">
                            <Filter className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                <TabsContent value="new-leads">
                    <Card className="bg-card overflow-hidden">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        {isSelectionMode && (
                                            <TableHead className="w-[50px]">
                                                <input
                                                    type="checkbox"
                                                    checked={filteredLeads.length > 0 && filteredLeads.every(lead => selectedLeads.has(lead._id))}
                                                    onChange={toggleSelectAll}
                                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                />
                                            </TableHead>
                                        )}
                                        <TableHead className="min-w-[150px]">{String(t("name"))}</TableHead>
                                        <TableHead className="min-w-[200px]">{String(t("company"))}</TableHead>
                                        <TableHead className="min-w-[120px]">{String(t("location"))}</TableHead>
                                        <TableHead className="min-w-[180px]">{String(t("email"))}</TableHead>
                                        <TableHead className="min-w-[80px]">Rating</TableHead>
                                        <TableHead className="min-w-[200px]">Email Automation</TableHead>
                                        <TableHead className="min-w-[120px]">Auth Info</TableHead>
                                        <TableHead className="min-w-[100px]">{String(t("status"))}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredLeads.length > 0 ? (
                                        filteredLeads.map(lead => (
                                            <TableRow key={lead._id} className={lead.googleAds && (lead.organicRanking === undefined || lead.organicRanking > 10) ? "bg-amber-50/50" : ""}>
                                                {isSelectionMode && (
                                                    <TableCell>
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedLeads.has(lead._id)}
                                                            onChange={() => toggleLeadSelection(lead._id)}
                                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                        />
                                                    </TableCell>
                                                )}
                                                <TableCell className="font-medium">
                                                    <div className="flex items-center gap-2 max-w-[150px]">
                                                        <span className="truncate" title={lead.name}>{lead.name}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="truncate block max-w-[200px]" title={lead.company}>
                                                        {lead.company}
                                                    </span>
                                                </TableCell>
                                                
                                                <TableCell>
                                                    <span className="truncate block max-w-[120px]" title={lead.location}>
                                                        {lead.location}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <button
                                                        onClick={(e) => copyEmailToClipboard(e, lead.email)}
                                                        className="truncate block max-w-[180px] text-sm text-left hover:bg-blue-50 hover:text-blue-600 transition-colors duration-200 cursor-pointer p-1 rounded w-full"
                                                        title={`Click to copy: ${lead.email}`}
                                                    >
                                                        {lead.email}
                                                    </button>
                                                </TableCell>
                                                <TableCell>
                                                    {lead.rating ? (
                                                        <div className="flex items-center gap-1 text-sm">
                                                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                                            <span className="font-medium">{lead.rating}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted-foreground text-xs">-</span>
                                                    )}
                                                </TableCell>
                                                {/* Google Ads status removed */}
                                                <TableCell>
                                                    <EmailStatus lead={lead} onRefresh={fetchLeads} />
                                                </TableCell>
                                                <TableCell>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setAuthInfoLead(lead)}
                                                    >
                                                        View
                                                    </Button>
                                                </TableCell>
                                                <TableCell>
                                                    <StatusBadge status={lead.status} />
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={isSelectionMode ? 10 : 9} className="text-center py-6 text-muted-foreground">
                                                {isRefreshing ? (
                                                    <div className="flex items-center justify-center gap-2">
                                                        <RotateCw className="h-4 w-4 animate-spin" />
                                                        <span>{t("refreshingLeads")}</span>
                                                    </div>
                                                ) : String(t("😞 No Leads Found"))}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </Card>
                </TabsContent>

                <TabsContent value="processing-leads">
                    <Card className="bg-card overflow-hidden">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        {isSelectionMode && (
                                            <TableHead className="w-[50px]">
                                                <input
                                                    type="checkbox"
                                                    checked={filteredLeads.length > 0 && filteredLeads.every(lead => selectedLeads.has(lead._id))}
                                                    onChange={toggleSelectAll}
                                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                />
                                            </TableHead>
                                        )}
                                        <TableHead className="min-w-[150px]">{String(t("name"))}</TableHead>
                                        <TableHead className="min-w-[200px]">{String(t("company"))}</TableHead>
                                        <TableHead className="min-w-[120px]">{String(t("location"))}</TableHead>
                                        <TableHead className="min-w-[180px]">{String(t("email"))}</TableHead>
                                        <TableHead className="min-w-[80px]">Rating</TableHead>
                                        <TableHead className="min-w-[200px]">Email Automation</TableHead>
                                        <TableHead className="min-w-[100px]">{String(t("status"))}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredLeads.length > 0 ? (
                                        filteredLeads.map(lead => (
                                            <TableRow key={lead._id} className={lead.googleAds && (lead.organicRanking === undefined || lead.organicRanking > 10) ? "bg-amber-50/50" : ""}>
                                                {isSelectionMode && (
                                                    <TableCell>
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedLeads.has(lead._id)}
                                                            onChange={() => toggleLeadSelection(lead._id)}
                                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                        />
                                                    </TableCell>
                                                )}
                                                <TableCell className="font-medium">
                                                    <div className="flex items-center gap-2 max-w-[150px]">
                                                        <span className="truncate" title={lead.name}>{lead.name}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="truncate block max-w-[200px]" title={lead.company}>
                                                        {lead.company}
                                                    </span>
                                                </TableCell>
                                                
                                                <TableCell>
                                                    <span className="truncate block max-w-[120px]" title={lead.location}>
                                                        {lead.location}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <a
                                                        href={`https://${lead.linkedinProfile}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-[#9c55dc] hover:underline text-sm"
                                                    >
                                                        {String(t("profile"))}
                                                    </a>
                                                </TableCell>
                                                <TableCell>
                                                    <button
                                                        onClick={(e) => copyEmailToClipboard(e, lead.email)}
                                                        className="truncate block max-w-[180px] text-sm text-left hover:bg-blue-50 hover:text-blue-600 transition-colors duration-200 cursor-pointer p-1 rounded w-full"
                                                        title={`Click to copy: ${lead.email}`}
                                                    >
                                                        {lead.email}
                                                    </button>
                                                </TableCell>
                                                <TableCell>
                                                    {lead.rating ? (
                                                        <div className="flex items-center gap-1 text-sm">
                                                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                                            <span className="font-medium">{lead.rating}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted-foreground text-xs">-</span>
                                                    )}
                                                </TableCell>
                                                {/* Google Ads status removed */}
                                                <TableCell>
                                                    <EmailStatus lead={lead} onRefresh={fetchLeads} />
                                                </TableCell>
                                                <TableCell>
                                                    <StatusBadge status={lead.status} />
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={isSelectionMode ? 10 : 9} className="text-center py-6 text-muted-foreground">
                                                {isRefreshing ? t("loadingLeads") : String(t("noLeadsFound"))}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </Card>
                </TabsContent>

                <TabsContent value="emailed-leads">
                    <Card className="bg-card overflow-hidden">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        {isSelectionMode && (
                                            <TableHead className="w-[50px]">
                                                <input
                                                    type="checkbox"
                                                    checked={filteredLeads.length > 0 && filteredLeads.every(lead => selectedLeads.has(lead._id))}
                                                    onChange={toggleSelectAll}
                                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                />
                                            </TableHead>
                                        )}
                                        <TableHead className="min-w-[150px]">{String(t("name"))}</TableHead>
                                        <TableHead className="min-w-[200px]">{String(t("company"))}</TableHead>
                                        <TableHead className="min-w-[120px]">{String(t("location"))}</TableHead>
                                        <TableHead className="min-w-[180px]">{String(t("email"))}</TableHead>
                                        <TableHead className="min-w-[80px]">Rating</TableHead>
                                        <TableHead className="min-w-[200px]">Email Automation</TableHead>
                                        <TableHead className="min-w-[100px]">{String(t("status"))}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredLeads.length > 0 ? (
                                        filteredLeads.map(lead => (
                                            <TableRow key={lead._id} className={lead.googleAds && (lead.organicRanking === undefined || lead.organicRanking > 10) ? "bg-amber-50/50" : ""}>
                                                {isSelectionMode && (
                                                    <TableCell>
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedLeads.has(lead._id)}
                                                            onChange={() => toggleLeadSelection(lead._id)}
                                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                        />
                                                    </TableCell>
                                                )}
                                                <TableCell className="font-medium">
                                                    <div className="flex items-center gap-2 max-w-[150px]">
                                                        <span className="truncate" title={lead.name}>{lead.name}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="truncate block max-w-[200px]" title={lead.company}>
                                                        {lead.company}
                                                    </span>
                                                </TableCell>
                                                
                                                <TableCell>
                                                    <span className="truncate block max-w-[120px]" title={lead.location}>
                                                        {lead.location}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <a
                                                        href={`https://${lead.linkedinProfile}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-[#9c55dc] hover:underline text-sm"
                                                    >
                                                        {String(t("profile"))}
                                                    </a>
                                                </TableCell>
                                                <TableCell>
                                                    <button
                                                        onClick={(e) => copyEmailToClipboard(e, lead.email)}
                                                        className="truncate block max-w-[180px] text-sm text-left hover:bg-blue-50 hover:text-blue-600 transition-colors duration-200 cursor-pointer p-1 rounded w-full"
                                                        title={`Click to copy: ${lead.email}`}
                                                    >
                                                        {lead.email}
                                                    </button>
                                                </TableCell>
                                                <TableCell>
                                                    {lead.rating ? (
                                                        <div className="flex items-center gap-1 text-sm">
                                                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                                            <span className="font-medium">{lead.rating}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted-foreground text-xs">-</span>
                                                    )}
                                                </TableCell>
                                                {/* Google Ads status removed */}
                                                <TableCell>
                                                    <EmailStatus lead={lead} onRefresh={fetchLeads} />
                                                </TableCell>
                                                <TableCell>
                                                    <StatusBadge status={lead.status} />
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={isSelectionMode ? 10 : 9} className="text-center py-6 text-muted-foreground">
                                                {isRefreshing ? t("loadingLeads") : String(t("noLeadsFound"))}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </Card>
                </TabsContent>

                {/* Removed High Value Leads content */}
            </Tabs>

            {/* View All Leads Dialog */}
            <Dialog open={isViewAllOpen} onOpenChange={setIsViewAllOpen}>
                <DialogContent className="sm:max-w-6xl max-h-[90vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>{t("allLeads")}</DialogTitle>
                        <DialogDescription>
                            {t("completeOverviewOfAllLeads")}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    {isSelectionMode && (
                                        <TableHead className="w-[50px]">
                                            <input
                                                type="checkbox"
                                                checked={allLeads.length > 0 && allLeads.every(lead => selectedLeads.has(lead._id))}
                                                onChange={() => {
                                                    if (allLeads.every(lead => selectedLeads.has(lead._id))) {
                                                        setSelectedLeads(new Set());
                                                    } else {
                                                        setSelectedLeads(new Set(allLeads.map(lead => lead._id)));
                                                    }
                                                }}
                                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            />
                                        </TableHead>
                                    )}
                                    <TableHead className="min-w-[150px]">{String(t("name"))}</TableHead>
                                    <TableHead className="min-w-[200px]">{String(t("company"))}</TableHead>
                                    <TableHead className="min-w-[120px]">{String(t("location"))}</TableHead>
                                    <TableHead className="min-w-[180px]">{String(t("email"))}</TableHead>
                                    <TableHead className="min-w-[80px]">Rating</TableHead>
                                    <TableHead className="min-w-[200px]">Email Automation</TableHead>
                                    <TableHead className="min-w-[120px">Auth Info</TableHead>
                                    <TableHead className="min-w-[100px]">{String(t("status"))}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {allLeads.length > 0 ? (
                                    allLeads.map(lead => (
                                        <TableRow key={lead._id} className={lead.googleAds && (lead.organicRanking === undefined || lead.organicRanking > 10) ? "bg-amber-50/50" : ""}>
                                            {isSelectionMode && (
                                                <TableCell>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedLeads.has(lead._id)}
                                                        onChange={() => toggleLeadSelection(lead._id)}
                                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                    />
                                                </TableCell>
                                            )}
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2 max-w-[150px]">
                                                    <span className="truncate" title={lead.name}>{lead.name}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className="truncate block max-w-[200px]" title={lead.company}>
                                                    {lead.company}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <span className="truncate block max-w-[120px]" title={lead.location}>
                                                    {lead.location}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <button
                                                    onClick={(e) => copyEmailToClipboard(e, lead.email)}
                                                    className="truncate block max-w-[180px] text-sm text-left hover:bg-blue-50 hover:text-blue-600 transition-colors duration-200 cursor-pointer p-1 rounded w-full"
                                                    title={`Click to copy: ${lead.email}`}
                                                >
                                                    {lead.email}
                                                </button>
                                            </TableCell>
                                            <TableCell>
                                                {lead.rating ? (
                                                    <div className="flex items-center gap-1 text-sm">
                                                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                                        <span className="font-medium">{lead.rating}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground text-xs">-</span>
                                                )}
                                            </TableCell>
                                            {/* Google Ads status removed */}
                                            <TableCell>
                                                <EmailStatus lead={lead} onRefresh={fetchLeads} />
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setAuthInfoLead(lead)}
                                                >
                                                    View
                                                </Button>
                                            </TableCell>
                                            <TableCell>
                                                <StatusBadge status={lead.status} />
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={isSelectionMode ? 11 : 10} className="text-center py-6 text-muted-foreground">
                                            {isRefreshing ? (
                                                <div className="flex items-center justify-center gap-2">
                                                    <RotateCw className="h-4 w-4 animate-spin" />
                                                    <span>{t("refreshingLeads")}</span>
                                                </div>
                                            ) : t("noLeadsFound")}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    <DialogClose asChild>
                        <Button variant="outline" className="mt-4 shrink-0">{t("close")}</Button>
                    </DialogClose>
                </DialogContent>
            </Dialog>

            {/* Export Modal */}
            <Dialog open={isExportOpen} onOpenChange={setIsExportOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Export Leads</DialogTitle>
                        <DialogDescription>
                            Choose a format to export your leads data
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-1 gap-3">
                        <Button 
                            onClick={() => exportLeads('csv')}
                            className="flex items-center gap-2"
                        >
                            <Download className="h-4 w-4" />
                            Export as CSV
                        </Button>
                        <Button 
                            onClick={() => exportLeads('json')}
                            className="flex items-center gap-2"
                        >
                            <Download className="h-4 w-4" />
                            Export as JSON
                        </Button>
                        <Button 
                            onClick={() => exportLeads('pdf')}
                            className="flex items-center gap-2"
                        >
                            <Download className="h-4 w-4" />
                            Export as PDF
                        </Button>
                    </div>
                    <DialogClose asChild>
                        <Button variant="outline" className="mt-4">Cancel</Button>
                    </DialogClose>
                </DialogContent>
            </Dialog>

            {/* Import Modal */}
            <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Import Leads</DialogTitle>
                        <DialogDescription>
                            Upload a JSON file to import leads. Only JSON format is supported.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-1 gap-3">
                        <div 
                            className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors"
                            onDragOver={(e) => {
                                e.preventDefault();
                                e.currentTarget.classList.add('border-blue-400', 'bg-blue-50');
                            }}
                            onDragLeave={(e) => {
                                e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50');
                            }}
                            onDrop={(e) => {
                                e.preventDefault();
                                e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50');
                                const file = e.dataTransfer.files[0];
                                if (file && file.name.toLowerCase().endsWith('.json')) {
                                    importLeads(file);
                                } else if (file) {
                                    toast.error("Only JSON files are accepted for import");
                                }
                            }}
                        >
                            <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                            <p className="text-sm text-gray-600 mb-2">
                                Drop your JSON file here or click to browse
                            </p>
                            <input
                                type="file"
                                accept=".json,application/json"
                                ref={fileInputRef}
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        importLeads(file);
                                        // reset so same file selection triggers change again later
                                        e.currentTarget.value = '';
                                    }
                                }}
                                className="hidden"
                                id="import-file"
                            />
                            <Button
                                variant="outline"
                                className="cursor-pointer"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                Choose File
                            </Button>
                        </div>
                    </div>
                    <DialogClose asChild>
                        <Button variant="outline" className="mt-4">Cancel</Button>
                    </DialogClose>
                </DialogContent>
            </Dialog>

            {/* Auth Information Dialog */}
            <Dialog open={!!authInfoLead} onOpenChange={() => setAuthInfoLead(null)}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Auth Information</DialogTitle>
                        <DialogDescription>
                            Executive and contact data enriched via OpenAI
                        </DialogDescription>
                    </DialogHeader>
                    {authInfoLead && (
                        <div className="space-y-2 text-sm">
                            <div className="grid grid-cols-3 gap-2">
                                <div className="text-muted-foreground">Company</div>
                                <div className="col-span-2 break-words">{authInfoLead.authInformation?.company_name || ''}</div>
                                <div className="text-muted-foreground">Company Email</div>
                                <div className="col-span-2 break-words">{authInfoLead.authInformation?.company_email || ''}</div>
                                <div className="text-muted-foreground">Owner</div>
                                <div className="col-span-2 break-words">{authInfoLead.authInformation?.owner_name || ''}</div>
                                <div className="text-muted-foreground">Owner Email</div>
                                <div className="col-span-2 break-words">{authInfoLead.authInformation?.owner_email || ''}</div>
                                <div className="text-muted-foreground">Manager</div>
                                <div className="col-span-2 break-words">{authInfoLead.authInformation?.manager_name || ''}</div>
                                <div className="text-muted-foreground">Manager Email</div>
                                <div className="col-span-2 break-words">{authInfoLead.authInformation?.manager_email || ''}</div>
                                <div className="text-muted-foreground">HR</div>
                                <div className="col-span-2 break-words">{authInfoLead.authInformation?.hr_name || ''}</div>
                                <div className="text-muted-foreground">HR Email</div>
                                <div className="col-span-2 break-words">{authInfoLead.authInformation?.hr_email || ''}</div>
                                <div className="text-muted-foreground">Executive</div>
                                <div className="col-span-2 break-words">{authInfoLead.authInformation?.executive_name || ''}</div>
                                <div className="text-muted-foreground">Executive Email</div>
                                <div className="col-span-2 break-words">{authInfoLead.authInformation?.executive_email || ''}</div>
                            </div>
                        </div>
                    )}
                    <DialogClose asChild>
                        <Button variant="outline" className="mt-2" onClick={() => setAuthInfoLead(null)}>
                            Close
                        </Button>
                    </DialogClose>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default LeadsCollection;