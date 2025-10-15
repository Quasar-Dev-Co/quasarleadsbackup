"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
  ReferenceLine,
} from "recharts";
import { useTranslations } from "@/hooks/use-translations";

const COLORS = ["#9b87f5", "#7E69AB", "#6E59A5", "#D6BCFA"];

interface AnalyticsData {
  emailStats: Array<{ name: string; emails: number; responses: number }>;
  sectorData: Array<{ name: string; value: number }>;
  sourceData: Array<{ name: string; total: number; geopend: number; reacties: number; afspraken: number }>;
  monthlyData: Array<{ name: string; leads: number }>;
}

export default function AnalyticsBoard() {
  const { t } = useTranslations();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    emailStats: [],
    sectorData: [],
    sourceData: [],
    monthlyData: []
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalyticsData = async () => {
    try {
      setRefreshing(true);
      console.log('📊 Fetching analytics data...');

      // Generate data based on real lead statistics
      const { auth } = await import('@/lib/auth');
      const userId = await auth.getCurrentUserId();
      const userQuery = userId ? `userId=${userId}&` : '';

      const [leadsResponse, crmResponse, emailStatsResponse] = await Promise.all([
        fetch(`/api/leads?${userQuery}limit=1000`),
        fetch(`/api/crm/leads?${userQuery}limit=1000`),
        fetch(`/api/email-statistics?${userQuery.slice(0, -1)}`)
      ]);

      const leadsData = await leadsResponse.json();
      const crmData = await crmResponse.json();
      const emailStatsData = await emailStatsResponse.json();

      // Use real email statistics or fallback to demo data
      let emailStats;
      if (emailStatsData.success && emailStatsData.data.emailStats) {
        emailStats = emailStatsData.data.emailStats;
        console.log(`📧 Using real email data: ${emailStatsData.data.totalEmailsSent} emails sent, ${emailStatsData.data.responseRate}% response rate`);
      } else {
        emailStats = [
          { name: "Jan", emails: 0, responses: 0 },
          { name: "Feb", emails: 0, responses: 0 },
          { name: "Mar", emails: 0, responses: 0 },
          { name: "Apr", emails: 0, responses: 0 },
          { name: "Mei", emails: 0, responses: 0 },
          { name: "Jun", emails: 0, responses: 0 },
        ];
        console.log('📧 Using fallback email data (no real data found)');
      }

      // Process sector data from leads
      const sectors = new Map();
      if (leadsData.success && leadsData.leads) {
        leadsData.leads.forEach((lead: any) => {
          const sector = lead.industry || detectSectorFromCompany(lead.company || '');
          sectors.set(sector, (sectors.get(sector) || 0) + 1);
        });
      }

      const sectorData = Array.from(sectors.entries()).map(([name, value]) => ({
        name,
        value: value as number
      }));

      // If no sector data, use default
      if (sectorData.length === 0) {
        sectorData.push(
          { name: "IT Services", value: 35 },
          { name: "Marketing", value: 25 },
          { name: "Consultancy", value: 20 },
          { name: "E-commerce", value: 20 }
        );
      }

      // Process source data
      const sources = new Map();
      if (leadsData.success && leadsData.leads) {
        leadsData.leads.forEach((lead: any) => {
          const source = lead.source || 'unknown';
          if (!sources.has(source)) {
            sources.set(source, { total: 0, geopend: 0, reacties: 0, afspraken: 0 });
          }
          const sourceStats = sources.get(source);
          sourceStats.total++;
          if (lead.status !== 'new_leads') sourceStats.geopend++;
          if (['called_once', 'called_twice', 'meeting', 'deal'].includes(lead.status)) sourceStats.reacties++;
          if (['meeting', 'deal'].includes(lead.status)) sourceStats.afspraken++;
        });
      }

      const sourceData = Array.from(sources.entries()).map(([name, stats]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        ...stats as any
      }));

      // If no source data, use default
      // No generic fallback here; keep empty for user-scoped view

      // Generate real monthly data from database
      const monthlyData = await generateMonthlyLeadsData();

      setAnalyticsData({
        emailStats,
        sectorData,
        sourceData,
        monthlyData
      });

      console.log('✅ Analytics data loaded successfully');
    } catch (error) {
      console.error('❌ Error fetching analytics data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const detectSectorFromCompany = (company: string): string => {
    const companyLower = company.toLowerCase();
    if (companyLower.includes('tech') || companyLower.includes('software') || companyLower.includes('it')) return 'IT Services';
    if (companyLower.includes('marketing') || companyLower.includes('agency') || companyLower.includes('media')) return 'Marketing';
    if (companyLower.includes('consult') || companyLower.includes('advisory')) return 'Consultancy';
    if (companyLower.includes('shop') || companyLower.includes('store') || companyLower.includes('ecommerce')) return 'E-commerce';
    return 'Other';
  };

  const generateMonthlyLeadsData = async () => {
    try {
      // Fetch all leads from database
      const { auth } = await import('@/lib/auth');
      const userId = await auth.getCurrentUserId();
      const response = await fetch(`/api/leads?limit=10000${userId ? `&userId=${userId}` : ''}`);
      const data = await response.json();
      
      if (!data.success || !data.leads) {
        return getDefaultMonthlyData();
      }

      // Group leads by month (last 6 months)
      const now = new Date();
      const months = [];
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'];
      
      for (let i = 5; i >= 0; i--) {
        const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
        
        const leadsInMonth = data.leads.filter((lead: any) => {
          const createdDate = new Date(lead.createdAt || lead.created_at);
          return createdDate >= month && createdDate < nextMonth;
        });
        
        months.push({
          name: monthNames[month.getMonth()],
          leads: leadsInMonth.length
        });
      }
      
      return months;
    } catch (error) {
      console.error('Error generating monthly data:', error);
      return getDefaultMonthlyData();
    }
  };

  const getDefaultMonthlyData = () => {
    return [
      { name: "Jan", leads: 0 },
      { name: "Feb", leads: 0 },
      { name: "Mar", leads: 0 },
      { name: "Apr", leads: 0 },
      { name: "Mei", leads: 0 },
      { name: "Jun", leads: 0 }
    ];
  };

  const handleDownloadCSV = () => {
    // Convert data to CSV format
    const headers = ["Platform", "Totaal", "Geopend", "Reacties", "Afspraken"];
    const csvData = analyticsData.sourceData.map((row: any) => 
      [row.name, row.total, row.geopend, row.reacties, row.afspraken].join(',')
    );
    
    const csvContent = [headers.join(','), ...csvData].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', 'leads_rapport.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 mt-8">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">{String(t("analyseRapporten"))}</h2>
          <Button disabled className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white">
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            {String(t("loading"))}
          </Button>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="bg-card">
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-[300px] bg-gray-200 rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 mt-8">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">{String(t("analyseRapporten"))}</h2>
        <div className="flex gap-2">
          <Button 
            onClick={fetchAnalyticsData}
            disabled={refreshing}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            {String(t("refresh"))}
          </Button>
          <Button 
            onClick={handleDownloadCSV}
            className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white"
          >
            <Download className="mr-2 h-4 w-4" />
            {String(t("downloadRapport"))}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="text-lg font-medium">
              {String(t("emailPrestaties"))}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analyticsData.emailStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="emails"
                    stroke="#9b87f5"
                    name={String(t("verzondenEmails"))}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="responses"
                    stroke="#7E69AB"
                    name={String(t("ontvangenReacties"))}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              {String(t("hoverOverGraphTooltip"))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="text-lg font-medium">
              {String(t("leadsPerSector"))}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analyticsData.sectorData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }: any) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {analyticsData.sectorData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-medium">
              {String(t("leadsPerPlatform"))}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analyticsData.sourceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="total" name={String(t("totaalLeads"))} fill="#9b87f5" />
                  <Bar dataKey="geopend" name={String(t("geopend"))} fill="#7E69AB" />
                  <Bar dataKey="reacties" name={String(t("reacties"))} fill="#6E59A5" />
                  <Bar dataKey="afspraken" name={String(t("afspraken"))} fill="#D6BCFA" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="text-lg font-medium">
              {String(t("leadsPerMaand"))} (Last 6 Months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analyticsData.monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="leads" name={String(t("aantalLeads"))} fill="#9b87f5" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}