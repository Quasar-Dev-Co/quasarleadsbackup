"use client"; 

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { 
  Users, Mail, Calendar, Trophy, TrendingUp, BarChart3, 
  RefreshCw, Zap, Target, AlertCircle, Star, ArrowUpRight,
  Phone, MessageSquare, Clock, CheckCircle2
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import AnalyticsBoard from "@/components/dashboard/AnalyticsBoard";
import WonLostStats from "@/components/dashboard/WonLostStats";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslations } from "@/hooks/use-translations";
import CalendarComponent, { CalendarEvent } from "@/components/CalendarComponent";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import toast from "react-hot-toast";

// Interfaces for API responses
interface DashboardStats {
  totalLeads: number;
  emailsSent: number;
  responseRate: number;
  appointments: number;
  googleAdsStats: {
    totalLeads: number;
    checkedLeads: number;
    googleAdsLeads: number;
    highValueLeads: number;
    conversionRate: string;
  };
  stageCounts: {
    new_leads: number;
    called_once: number;
    called_twice: number;
    called_three_times: number;
    called_four_times: number;
    called_five_times: number;
    called_six_times: number;
    called_seven_times: number;
    meeting: number;
    deal: number;
  };
}

interface Lead {
  id: string;
  name: string;
  company: string;
  email: string;
  stage?: string;
  lastContact: string;
  source: string;
  googleAds: boolean;
  dealValue?: number;
}

interface ActivityData {
  id: string;
  type: string;
  date: string;
  description: string;
  leadName: string;
  leadCompany: string;
}

// Calendar events will be loaded from booking data

export default function Dashboard() {
  const { t } = useTranslations();
  const months = String(t("months")).split(",");
  
  // State management
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [recentLeads, setRecentLeads] = useState<Lead[]>([]);
  const [recentActivities, setRecentActivities] = useState<ActivityData[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setRefreshing(true);
      setError(null);

      console.log('🔄 Fetching dashboard data...');

      // Initialize default stats
      let stats: DashboardStats = {
        totalLeads: 0,
        emailsSent: 0,
        responseRate: 0,
        appointments: 0,
        googleAdsStats: {
          totalLeads: 0,
          checkedLeads: 0,
          googleAdsLeads: 0,
          highValueLeads: 0,
          conversionRate: '0'
        },
        stageCounts: {
          new_leads: 0,
          called_once: 0,
          called_twice: 0,
          called_three_times: 0,
          called_four_times: 0,
          called_five_times: 0,
          called_six_times: 0,
          called_seven_times: 0,
          meeting: 0,
          deal: 0
        }
      };

      let mappedLeads: Lead[] = [];
      let activities: ActivityData[] = [];

      // Resolve current user once for all requests
      const { auth } = await import('@/lib/auth');
      const userId = await auth.getCurrentUserId();

      // If we don't have a user, stop and show defaults
      if (!userId) {
        console.warn('⚠️ No user ID available. Please login.');
        setDashboardStats(stats);
        setRecentLeads([]);
        setRecentActivities([]);
        setCalendarEvents([]);
        return;
      }

      // Fetch CRM leads data for statistics (primary data source)
      try {
        console.log('📊 Fetching CRM leads...');
        // Get CRM leads for this user
        if (userId) {
          const crmResponse = await fetch(`/api/crm/leads?limit=100&userId=${userId}`);
          const crmData = await crmResponse.json();

          if (crmData.success) {
          stats.totalLeads = crmData.totalCount || 0;
          stats.emailsSent = calculateEmailsSent(crmData.stageCounts);
          stats.responseRate = calculateResponseRate(crmData.stageCounts);
          stats.appointments = (crmData.stageCounts.meeting || 0) + (crmData.stageCounts.deal || 0);
          stats.stageCounts = crmData.stageCounts || {
            new_leads: 0,
            called_once: 0,
            called_twice: 0,
            called_three_times: 0,
            called_four_times: 0,
            called_five_times: 0,
            called_six_times: 0,
            called_seven_times: 0,
            meeting: 0,
            deal: 0
          };

          // Generate recent activities from CRM leads
          activities = generateRecentActivities(crmData.leads.slice(0, 10));
          console.log('✅ CRM data loaded successfully');
        } else {
          console.warn('⚠️ CRM data fetch failed, using defaults');
        }
      } else {
        console.warn('⚠️ No user ID available for CRM data');
      }
      } catch (error) {
        console.error('❌ Error fetching CRM data:', error);
      }

      // Google Ads stats removed

      // Fetch recent leads (tertiary data source)
      try {
        console.log('📋 Fetching recent leads...');
        const leadsResponse = await fetch(`/api/leads?limit=10&userId=${userId}`);
        const leadsData = await leadsResponse.json();

        console.log('Leads API response:', leadsData);

        if (leadsData.success && leadsData.leads && leadsData.leads.length > 0) {
          mappedLeads = leadsData.leads.slice(0, 5).map((lead: any) => ({
            id: lead._id || lead.id,
            name: lead.fullName || lead.name || 'Unknown Name',
            company: lead.company || 'Unknown Company',
            email: lead.email || 'No email',
            stage: mapStatusToStage(lead.status),
            source: lead.source || 'manual',
            lastContact: lead.lastContactedAt ? new Date(lead.lastContactedAt).toLocaleDateString() : 'Never',
            googleAds: lead.googleAds || false,
            dealValue: lead.dealValue || 0
          }));
          console.log('✅ Recent leads loaded successfully:', mappedLeads.length, 'leads');
        } else {
          console.warn('⚠️ No leads found or API failed:', leadsData);
          mappedLeads = [];
        }
      } catch (error) {
        console.error('❌ Error fetching recent leads:', error);
        // Do not inject sample data in dashboard; keep empty for user-scoped view
        mappedLeads = [];
      }

      // Fetch booking data for calendar
      let calendarEvents: CalendarEvent[] = [];
      try {
        console.log('📅 Fetching booking data...');
        const bookingsResponse = await fetch(`/api/bookings?limit=50&status=confirmed&userId=${userId}`);
        const bookingsData = await bookingsResponse.json();

        if (bookingsData.success && bookingsData.data && bookingsData.data.bookings) {
          calendarEvents = bookingsData.data.bookings.map((booking: any) => ({
            id: booking._id,
            title: `Meeting with ${booking.companyName}`,
            date: new Date(booking.preferredDate),
            time: booking.preferredTime,
            type: "meeting",
            participants: [booking.clientName.split(' ').map((n: string) => n[0]).join('')], // Initials
            company: booking.companyName,
            client: booking.clientName,
            platform: booking.meetingPlatform,
            email: booking.companyEmail
          }));
          console.log('✅ Calendar events loaded successfully', calendarEvents.length, 'events');
        } else {
          console.warn('⚠️ Booking data fetch failed, using empty array');
        }
      } catch (error) {
        console.error('❌ Error fetching booking data:', error);
      }

      // Do not inject sample calendar events; keep empty for user-scoped view

      setCalendarEvents(calendarEvents);

      // Set the collected data
      setDashboardStats(stats);
      setRecentLeads(mappedLeads);
      setRecentActivities(activities);

      console.log('🎉 Dashboard data fetch completed');
      
      if (refreshing) {
        toast.success('Dashboard data refreshed successfully');
      }

    } catch (error) {
      console.error('💥 Critical error in dashboard data fetch:', error);
      setError('Failed to load dashboard data');
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Helper functions
  const mapStatusToStage = (status: string): string => {
    const statusToStageMap: { [key: string]: string } = {
      'active': 'new_leads',
      'emailed': 'called_once',
      'replied': 'meeting',
      'booked': 'meeting',
      'closed won': 'deal',
      'not interested': 'called_three_times',
      'closed lost': 'called_three_times',
      'archived': 'called_three_times'
    };
    
    return statusToStageMap[status] || 'new_leads';
  };

  const calculateEmailsSent = (stageCounts: any): number => {
    return (stageCounts.called_once || 0) + 
           (stageCounts.called_twice || 0) + 
           (stageCounts.called_three_times || 0) +
           (stageCounts.called_four_times || 0) +
           (stageCounts.called_five_times || 0) +
           (stageCounts.called_six_times || 0) +
           (stageCounts.called_seven_times || 0);
  };

  const calculateResponseRate = (stageCounts: any): number => {
    const totalEmailed = calculateEmailsSent(stageCounts);
    const responded = (stageCounts.meeting || 0) + (stageCounts.deal || 0);
    return totalEmailed > 0 ? Math.round((responded / totalEmailed) * 100) : 0;
  };

  const generateRecentActivities = (leads: any[]): ActivityData[] => {
    return leads.map((lead, index) => ({
      id: `activity_${lead.id}_${index}`,
      type: getActivityType(lead.stage),
      date: lead.updated_at ? new Date(lead.updated_at).toLocaleDateString() : 'Today',
      description: getActivityDescription(lead.stage, lead.name),
      leadName: lead.name,
      leadCompany: lead.company
    }));
  };

  const getActivityType = (stage: string | undefined): string => {
    if (!stage) return 'contact';
    if (stage.includes('called')) return 'email';
    if (stage === 'meeting') return 'call';
    if (stage === 'deal') return 'deal';
    return 'contact';
  };

  const getActivityDescription = (stage: string | undefined, leadName: string): string => {
    if (!stage) return `New lead: ${leadName}`;
    switch (stage) {
      case 'called_once': return `First email sent to ${leadName}`;
      case 'called_twice': return `Follow-up email sent to ${leadName}`;
      case 'called_three_times': return `Third email sent to ${leadName}`;
      case 'called_four_times': return `Case study email sent to ${leadName}`;
      case 'called_five_times': return `Priority check email sent to ${leadName}`;
      case 'called_six_times': return `Value-add email sent to ${leadName}`;
      case 'called_seven_times': return `Final email sent to ${leadName}`;
      case 'meeting': return `Meeting scheduled with ${leadName}`;
      case 'deal': return `Deal closed with ${leadName}`;
      default: return `New lead: ${leadName}`;
    }
  };

  // Handle event actions
  const handleAddEvent = (newEvent: Omit<CalendarEvent, 'id'>) => {
    const eventWithId: CalendarEvent = {
      ...newEvent,
      id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    
    setCalendarEvents(prev => [...prev, eventWithId]);
    console.log("New event created:", eventWithId);
  };
  
  const handleViewEvent = (eventId: number | string) => {
    console.log("View event details", eventId);
    // You would typically navigate to the event details page or open a modal
  };

  // Load data on component mount
  useEffect(() => {
    fetchDashboardData();
    
    // Set up auto-refresh every 5 minutes
    const interval = setInterval(fetchDashboardData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Calendar translations based on the app's translation system
  const calendarTranslations = {
    calendarAndReminders: String(t("calendarAndReminders")),
    today: String(t("today")),
    day: String(t("day")),
    week: String(t("week")),
    month: String(t("month")),
    todaysSchedule: String(t("todaysSchedule")),
    dailySchedule: String(t("dailySchedule")),
    weeklySchedule: String(t("weeklySchedule")),
    monthlySchedule: String(t("monthlySchedule")),
    viewCalendar: String(t("viewCalendar")),
    noEventsScheduled: String(t("noEventsScheduled")),
    noEventsMessage: String(t("noEventsMessage")),
    scheduleEvent: String(t("scheduleEvent")),
    newEvent: String(t("newEvent")),
    upcoming: String(t("upcoming")),
    participant: String(t("participant")),
  };

  if (loading) {
    return (
      <div className="animate-in">
        <SectionHeader 
          title={String(t("welcomeTitle"))} 
          description={String(t("welcomeDescription"))} 
        />
        <div className="mt-6 space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="bg-card">
                <CardContent className="p-6">
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-full"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in">
      <SectionHeader 
        title={String(t("welcomeTitle"))} 
        description={String(t("welcomeDescription"))} 
        action={
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={fetchDashboardData}
              disabled={refreshing}
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {String(t("refresh"))}
            </Button>
            <Link href="/leads">
              <Button className="text-fuchsia-50 bg-fuchsia-600 hover:bg-fuchsia-500">
                {String(t("startCollectingLeads"))}
              </Button>
            </Link>
          </div>
        }
      />

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      <Tabs defaultValue="overview" className="mt-6">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">{String(t("overview"))}</TabsTrigger>
          <TabsTrigger value="kpi">{String(t("kpiDashboard"))}</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview">
          {/* Main Statistics Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-card hover:bg-card/80 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {String(t("totalLeads"))}
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardStats?.totalLeads || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {String(t("readyForCollection"))}
                </p>
                {dashboardStats?.googleAdsStats && (
                  <div className="mt-2">
                    <Badge variant="secondary" className="text-xs">
                      <Star className="h-3 w-3 mr-1" />
                      {dashboardStats.googleAdsStats.highValueLeads} high-value
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card className="bg-card hover:bg-card/80 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {String(t("emailsSent"))}
                </CardTitle>
                <Mail className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardStats?.emailsSent || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {String(t("acrossAllCampaigns"))}
                </p>
                {dashboardStats?.stageCounts && (
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Active campaigns:</span>
                      <span>{Object.values(dashboardStats.stageCounts).reduce((a, b) => a + b, 0) || 0}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card className="bg-card hover:bg-card/80 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {String(t("responseRate"))}
                </CardTitle>
                <Trophy className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardStats?.responseRate || 0}%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {String(t("fromSentEmails"))}
                </p>
                <div className="mt-2">
                  <Progress 
                    value={dashboardStats?.responseRate || 0} 
                    className="h-1"
                  />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-card hover:bg-card/80 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {String(t("appointments"))}
                </CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardStats?.appointments || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {String(t("confirmedMeetings"))}
                </p>
                {dashboardStats?.stageCounts && (
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Meetings:</span>
                      <span>{dashboardStats.stageCounts.meeting || 0}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>Deals:</span>
                      <span>{dashboardStats.stageCounts.deal || 0}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Google Ads Intelligence */}
          <div className="mt-6">
            {/* Google Ads stats removed */}
          </div>
          
          {/* Won/Lost Statistics */}
          <div className="mt-6">
            <WonLostStats />
          </div>
          
          {/* Calendar Component */}
          <div className="mt-6">
            <CalendarComponent 
              events={calendarEvents}
              title={String(t("calendarAndReminders"))}
              // @ts-ignore
              translations={calendarTranslations}
              onAddEvent={handleAddEvent}
              onViewEvent={handleViewEvent}
            />
          </div>

          {/* Recent Activities and Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            {/* Recent Activities */}
            <Card className="bg-card">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{String(t("recentActivities"))}</span>
                  <Badge variant="outline">{recentActivities.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {recentActivities.length > 0 ? (
                  <div className="space-y-3">
                    {recentActivities.slice(0, 5).map((activity, index) => (
                      <div 
                        key={activity.id} 
                        className={`flex items-start gap-3 p-4 rounded-lg border border-border bg-background hover:bg-muted/50 transition-colors ${
                          index < recentActivities.slice(0, 5).length - 1 ? 'mb-3' : ''
                        }`}
                      >
                        <div className="p-2 rounded-full bg-fuchsia-100 border border-fuchsia-200">
                          {activity.type === 'email' && <Mail className="h-3 w-3 text-fuchsia-600" />}
                          {activity.type === 'call' && <Phone className="h-3 w-3 text-fuchsia-600" />}
                          {activity.type === 'deal' && <Trophy className="h-3 w-3 text-fuchsia-600" />}
                          {activity.type === 'contact' && <Users className="h-3 w-3 text-fuchsia-600" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate text-foreground">
                            {activity.leadCompany}
                          </p>
                          <p className="text-xs text-muted-foreground truncate mt-1">
                            {activity.description}
                          </p>
                          <p className="text-xs text-muted-foreground/80 mt-2 font-medium">
                            {activity.date}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">{String(t("noRecentActivities"))}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="bg-card">
              <CardHeader>
                <CardTitle>{String(t("quickActions"))}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-3">
                  <Link href="/leads">
                    <Button variant="ghost" className="w-full justify-start border border-border bg-background hover:bg-muted/50 transition-colors p-4 h-auto">
                      <Users className="h-4 w-4 mr-2" />
                      {String(t("collectNewLeads"))}
                    </Button>
                  </Link>
                  <Link href="/email-prompting">
                    <Button variant="ghost" className="w-full justify-start border border-border bg-background hover:bg-muted/50 transition-colors p-4 h-auto">
                      <Mail className="h-4 w-4 mr-2" />
                      {String(t("configureEmailSequences"))}
                    </Button>
                  </Link>
                  <Link href="/booking">
                    <Button variant="ghost" className="w-full justify-start border border-border bg-background hover:bg-muted/50 transition-colors p-4 h-auto">
                      <Calendar className="h-4 w-4 mr-2" />
                      {String(t("setupAppointmentTemplates"))}
                    </Button>
                  </Link>
                  <Link href="/crmsystem">
                    <Button variant="ghost" className="w-full justify-start border border-border bg-background hover:bg-muted/50 transition-colors p-4 h-auto">
                      <BarChart3 className="h-4 w-4 mr-2" />
                      {String(t("viewCRMSystem"))}
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Leads Table */}
          <Card className="bg-card mt-6">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{String(t("recentLeads"))}</span>
                <Link href="/leads">
                  <Button variant="outline" size="sm">
                    {String(t("viewAll"))}
                    <ArrowUpRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentLeads.length > 0 ? (
                <div className="rounded-md border">
                  <div className="relative w-full overflow-auto">
                    <table className="w-full caption-bottom text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="h-12 px-4 text-left font-medium text-muted-foreground">{String(t("lead"))}</th>
                          <th className="h-12 px-4 text-left font-medium text-muted-foreground">{String(t("company"))}</th>
                          <th className="h-12 px-4 text-left font-medium text-muted-foreground">{String(t("email"))}</th>
                          <th className="h-12 px-4 text-left font-medium text-muted-foreground">{String(t("source"))}</th>
                          <th className="h-12 px-4 text-left font-medium text-muted-foreground">{String(t("status"))}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentLeads.map((lead) => (
                          <tr key={lead.id} className="border-b transition-colors hover:bg-muted/50">
                            <td className="p-4 align-middle font-medium">{lead.name}</td>
                            <td className="p-4 align-middle">{lead.company}</td>
                            <td className="p-4 align-middle text-muted-foreground">{lead.email}</td>
                            <td className="p-4 align-middle">
                              <Badge variant="outline" className="text-xs">
                                {lead.source}
                              </Badge>
                            </td>
                            <td className="p-4 align-middle">
                              <div className="flex items-center gap-2">
                                <Badge 
                                  variant={lead.stage === 'deal' ? 'default' : 'secondary'}
                                  className="text-xs"
                                >
                                  {lead.stage ? lead.stage.replace('_', ' ') : 'New Lead'}
                                </Badge>
                                                                 {lead.googleAds && (
                                   <Zap className="h-3 w-3 text-amber-500" />
                                 )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">{String(t("noLeadsFound"))}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Analytics Board */}
          <div className="mt-6">
            <AnalyticsBoard />
          </div>

          {/* Getting Started Guide */}
          <Card className="bg-card mt-6">
            <CardHeader>
              <CardTitle>{String(t("gettingStarted"))}</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-4 list-decimal list-inside text-sm">
                <li className="text-muted-foreground">
                  <span className="text-foreground font-medium">{String(t("configureLeadCollection"))}</span> - 
                  {String(t("configureLeadCollectionDesc"))}
                </li>
                <li className="text-muted-foreground">
                  <span className="text-foreground font-medium">{String(t("setupEmailSequences"))}</span> - 
                  {String(t("setupEmailSequencesDesc"))}
                </li>
                <li className="text-muted-foreground">
                  <span className="text-foreground font-medium">{String(t("createAppointmentTemplates"))}</span> - 
                  {String(t("createAppointmentTemplatesDesc"))}
                </li>
                <li className="text-muted-foreground">
                  <span className="text-foreground font-medium">{String(t("analyzeResults"))}</span> - 
                  {String(t("analyzeResultsDesc"))}
                </li>
              </ol>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="kpi">
          <div className="space-y-6">
            {/* KPI Cards */}
            

            {/* Pipeline Status */}
            <Card className="bg-card">
              <CardHeader>
                <CardTitle>{String(t("emailCampaignPipelineStatus"))}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {dashboardStats?.stageCounts ? (
                    Object.entries(dashboardStats.stageCounts).map(([stage, count]) => {
                      const stageLabels: { [key: string]: string } = {
                        new_leads: 'New Leads',
                        called_once: 'Called Once',
                        called_twice: 'Called Twice',
                        called_three_times: 'Called Three Times',
                        called_four_times: 'Called Four Times',
                        called_five_times: 'Called Five Times',
                        called_six_times: 'Called Six Times',
                        called_seven_times: 'Called Seven Times',
                        meeting: 'Meeting',
                        deal: 'Deal'
                      };

                      const statusLabels: { [key: string]: string } = {
                        new_leads: 'New Leads',
                        called_once: 'Active Campaign',
                        called_twice: 'Active Campaign',
                        called_three_times: 'Active Campaign',
                        called_four_times: 'Active Campaign',
                        called_five_times: 'Active Campaign',
                        called_six_times: 'Active Campaign',
                        called_seven_times: 'Active Campaign',
                        meeting: 'Scheduled',
                        deal: 'Closed Won'
                      };

                      return (
                        <div key={stage} className="text-center p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                          <div className="text-2xl font-bold text-fuchsia-600">{count}</div>
                          <div className="text-sm font-medium mt-1">
                            {stageLabels[stage] || stage.replace('_', ' ')}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {statusLabels[stage] || 'Active'}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    // Fallback when no data is available
                    Array.from({ length: 10 }, (_, index) => {
                      const stages = ['New Leads', 'Called Once', 'Called Twice', 'Called Three Times', 'Called Four Times', 'Called Five Times', 'Called Six Times', 'Called Seven Times', 'Meeting', 'Deal'];
                      const statuses = ['New Leads', 'Active Campaign', 'Active Campaign', 'Active Campaign', 'Active Campaign', 'Active Campaign', 'Active Campaign', 'Active Campaign', 'Scheduled', 'Closed Won'];
                      
                      return (
                        <div key={index} className="text-center p-4 rounded-lg bg-muted/30">
                          <div className="text-2xl font-bold text-fuchsia-600">0</div>
                          <div className="text-sm font-medium mt-1">{stages[index]}</div>
                          <div className="text-xs text-muted-foreground mt-1">{statuses[index]}</div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>

            {/* CRM Appointment View - HIDDEN */}
            {/* <Card className="bg-card">
              <CardHeader>
                <CardTitle>{String(t("scheduledAppointments"))}</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="table">
                   <TabsContent value="table">
                     <div className="rounded-md border">
                       <div className="relative w-full overflow-auto">
                         <table className="w-full caption-bottom text-sm">
                           <thead>
                             <tr className="border-b">
                               <th className="h-12 px-4 text-left font-medium text-muted-foreground">{String(t("lead"))}</th>
                               <th className="h-12 px-4 text-left font-medium text-muted-foreground">{String(t("company"))}</th>
                               <th className="h-12 px-4 text-left font-medium text-muted-foreground">{String(t("email"))}</th>
                               <th className="h-12 px-4 text-left font-medium text-muted-foreground">{String(t("appointment"))}</th>
                               <th className="h-12 px-4 text-left font-medium text-muted-foreground">{String(t("status"))}</th>
                               <th className="h-12 px-4 text-left font-medium text-muted-foreground">{String(t("actions"))}</th>
                             </tr>
                           </thead>
                           <tbody>
                                                     {recentLeads.filter(lead => lead.stage && (lead.stage === 'meeting' || lead.stage === 'deal')).length > 0 ? (
                          recentLeads.filter(lead => lead.stage && (lead.stage === 'meeting' || lead.stage === 'deal')).map((lead) => (
                                 <tr key={lead.id} className="border-b transition-colors hover:bg-muted/50">
                                   <td className="p-4 align-middle font-medium">{lead.name}</td>
                                   <td className="p-4 align-middle">{lead.company}</td>
                                   <td className="p-4 align-middle">{lead.email}</td>
                                   <td className="p-4 align-middle">{lead.lastContact || 'TBD'}</td>
                                   <td className="p-4 align-middle">
                                     <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                       lead.stage === 'deal' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-blue-100 text-blue-800 border border-blue-200'
                                     }`}>
                                       {lead.stage === 'deal' ? String(t('closed')) : String(t('scheduled'))}
                                     </span>
                                   </td>
                                   <td className="p-4 align-middle">
                                     <Button variant="ghost" size="sm">
                                       {String(t("note"))}
                                     </Button>
                                   </td>
                                 </tr>
                               ))
                             ) : (
                               <tr>
                                 <td colSpan={6} className="p-8 text-center text-muted-foreground">
                                   <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                   <p>{String(t("noAppointmentsScheduled"))}</p>
                                 </td>
                               </tr>
                             )}
                           </tbody>
                         </table>
                       </div>
                     </div>
                   </TabsContent>
                 </Tabs>
              </CardContent>
            </Card> */}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}