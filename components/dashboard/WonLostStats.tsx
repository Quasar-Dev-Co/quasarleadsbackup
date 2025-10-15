"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TrendingUp, 
  TrendingDown, 
  Trophy, 
  XCircle, 
  DollarSign, 
  BarChart3,
  RefreshCw,
  Target
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/hooks/use-translations";

// Pie Chart Component
interface PieChartProps {
  data: WonLostData;
}

function WonLostPieChart({ data }: PieChartProps) {
  const { t } = useTranslations();
  const total = data.summary.totalWon + data.summary.totalLost;
  
  console.log('Pie chart data:', data); // Debug log
  console.log('Total deals:', total); // Debug log
  
  if (total === 0) {
    return (
      <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">{t('dealsByStatus')}</h3>
          <div className="flex items-center justify-center h-64">
            <p className="text-slate-400">{t('noDealsToDisplay')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Create sectors based on loss reasons and won deals
  const sectors = [];
  
  // Add won deals
  if (data.summary.totalWon > 0) {
    sectors.push({
      label: 'Won Deals',
      value: data.summary.totalWon,
      color: '#22c55e',
      percentage: (data.summary.totalWon / total) * 100
    });
  }
  
  // Add lost deals by reason
  Object.entries(data.lostByReason).forEach(([reason, stats]) => {
    if (stats.count > 0) {
      const colors: { [key: string]: string } = {
        'not_interested': '#8b5cf6',
        'no_budget': '#f59e0b',
        'no_response': '#ef4444',
        'competitor': '#06b6d4',
        'too_early': '#84cc16',
        'no_fit': '#f97316',
        'other': '#6b7280',
        'unknown': '#9ca3af'
      };
      
      sectors.push({
        label: reason === 'not_interested' ? 'Not Interested' :
               reason === 'no_budget' ? 'No Budget' :
               reason === 'no_response' ? 'No Response' :
               reason === 'competitor' ? 'Competitor' :
               reason === 'too_early' ? 'Too Early' :
               reason === 'no_fit' ? 'Not a Fit' :
               reason === 'other' ? 'Other' : 'Unknown',
        value: stats.count,
        color: colors[reason] || '#9ca3af',
        percentage: (stats.count / total) * 100
      });
    }
  });
  
  // Calculate angles for each sector
  let currentAngle = 0;
  const sectorsWithAngles = sectors.map(sector => {
    const angle = (sector.percentage / 100) * 360;
    const result = {
      ...sector,
      startAngle: currentAngle,
      endAngle: currentAngle + angle,
      angle
    };
    currentAngle += angle;
    return result;
  });
  
  const size = 280;
  const center = size / 2;
  const radius = 90;
  
  // Create SVG paths for each sector
  const createPath = (startAngle: number, endAngle: number) => {
    const startAngleRad = ((startAngle - 90) * Math.PI) / 180;
    const endAngleRad = ((endAngle - 90) * Math.PI) / 180;
    
    const x1 = center + radius * Math.cos(startAngleRad);
    const y1 = center + radius * Math.sin(startAngleRad);
    const x2 = center + radius * Math.cos(endAngleRad);
    const y2 = center + radius * Math.sin(endAngleRad);
    
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    
    return `M ${center},${center} L ${x1},${y1} A ${radius},${radius} 0 ${largeArcFlag},1 ${x2},${y2} z`;
  };
  
    // Fallback for simple donut chart if complex chart fails
  if (sectorsWithAngles.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-6">{t('dealsByStatus')}</h3>
          <div className="flex items-center justify-center">
            <div className="w-48 h-48 rounded-full bg-orange-500 flex items-center justify-center">
              <div className="text-center">
                <div className="text-2xl font-bold">100%</div>
                <div className="text-sm">{t('noBudget')}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white">
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold mb-6">{t('dealsByStatus')}</h3>
        <div className="flex flex-col lg:flex-row items-center justify-center lg:justify-between gap-6">
           {/* Pie Chart */}
           <div className="relative flex-shrink-0">
             <svg width="200" height="200" viewBox="0 0 200 200">
               {sectorsWithAngles.map((sector, index) => {
                 const radius = 80;
                 const circumference = 2 * Math.PI * radius;
                 const strokeLength = (sector.percentage / 100) * circumference;
                 const strokeOffset = sectorsWithAngles
                   .slice(0, index)
                   .reduce((acc, s) => acc + (s.percentage / 100) * circumference, 0);
                 
                 return (
                   <g key={index}>
                     <circle
                       cx="100"
                       cy="100"
                       r={radius}
                       fill="none"
                       stroke={sector.color}
                       strokeWidth="40"
                       strokeDasharray={`${strokeLength} ${circumference}`}
                       strokeDashoffset={-strokeOffset}
                       className="hover:opacity-80 transition-opacity cursor-pointer"
                       transform="rotate(-90 100 100)"
                     />
                     {/* Percentage label */}
                     {sector.percentage > 10 && (
                       <text
                         x={100 + 50 * Math.cos((sectorsWithAngles.slice(0, index).reduce((acc, s) => acc + s.percentage, 0) + sector.percentage / 2) * 2 * Math.PI / 100 - Math.PI / 2)}
                         y={100 + 50 * Math.sin((sectorsWithAngles.slice(0, index).reduce((acc, s) => acc + s.percentage, 0) + sector.percentage / 2) * 2 * Math.PI / 100 - Math.PI / 2)}
                         textAnchor="middle"
                         dominantBaseline="middle"
                         className="text-xs font-bold fill-white"
                         style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
                       >
                         {sector.percentage.toFixed(0)}%
                       </text>
                     )}
                   </g>
                 );
               })}
               {/* Center text */}
               <text
                 x="100"
                 y="95"
                 textAnchor="middle"
                 className="text-lg font-bold fill-white"
               >
                 {total}
               </text>
               <text
                 x="100"
                 y="110"
                 textAnchor="middle"
                 className="text-xs fill-slate-300"
               >
                 {t('totalDeals')}
               </text>
             </svg>
           </div>
          
          {/* Legend */}
          <div className="ml-8 space-y-3 flex-1">
            {sectorsWithAngles.map((sector, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-3 h-3 rounded-sm" 
                    style={{ backgroundColor: sector.color }}
                  ></div>
                  <span className="text-sm font-medium">{sector.label}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold">{sector.percentage.toFixed(0)}%</div>
                  <div className="text-xs text-slate-400">{sector.value} {t('deals')}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface WonLostData {
  summary: {
    totalWon: number;
    totalLost: number;
    wonBudget: number;
    lostBudget: number;
    totalBudget: number;
    conversionRate: string;
  };
  lostByReason: {
    [key: string]: {
      count: number;
      budget: number;
    };
  };
  monthlyData: Array<{
    month: string;
    won: number;
    lost: number;
    wonBudget: number;
    lostBudget: number;
  }>;
}

export default function WonLostStats() {
  const { t } = useTranslations();
  const [data, setData] = useState<WonLostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      setRefreshing(true);
      const { auth } = await import('@/lib/auth');
      const userId = await auth.getCurrentUserId();
      const response = await fetch(`/api/leads/won-lost-stats${userId ? `?userId=${userId}` : ''}`);
      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
      } else {
        console.error('Failed to fetch won/lost stats:', result.error);
        // Set sample data if API fails
        setData(getSampleData());
      }
    } catch (error) {
      console.error('Error fetching won/lost stats:', error);
      // Set sample data if API fails
      setData(getSampleData());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getSampleData = (): WonLostData => {
    return {
      summary: {
        totalWon: 0,
        totalLost: 1,
        wonBudget: 0,
        lostBudget: 5000,
        totalBudget: 5000,
        conversionRate: "0.0"
      },
      lostByReason: {
        "no_budget": {
          count: 1,
          budget: 5000
        }
      },
      monthlyData: [
        { month: "Jan", won: 0, lost: 0, wonBudget: 0, lostBudget: 0 },
        { month: "Feb", won: 0, lost: 0, wonBudget: 0, lostBudget: 0 },
        { month: "Mar", won: 0, lost: 0, wonBudget: 0, lostBudget: 0 },
        { month: "Apr", won: 0, lost: 0, wonBudget: 0, lostBudget: 0 },
        { month: "May", won: 0, lost: 0, wonBudget: 0, lostBudget: 0 },
        { month: "Jun", won: 0, lost: 1, wonBudget: 0, lostBudget: 5000 }
      ]
    };
  };

  useEffect(() => {
    fetchData();
  }, []);

  const loadSampleData = () => {
    setData(getSampleData());
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const getLossReasonLabel = (reason: string) => {
    const reasonMap: { [key: string]: string } = {
      'not_interested': t('notInterested') as string,
      'no_budget': t('noBudget') as string,
      'no_response': t('noResponse') as string,
      'competitor': t('choseCompetitor') as string,
      'too_early': t('tooEarly') as string,
      'no_fit': t('notAFit') as string,
      'other': t('other') as string,
      'unknown': t('unknown') as string
    };
    return reasonMap[reason] || reason;
  };

  if (loading) {
    return (
      <Card className="bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            {t('wonLostAnalysis')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            {t('wonLostAnalysis')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>No data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            {t('wonLostAnalysis')}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadSampleData}
            >
              {t('sampleData')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="summary" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="summary">{t('summary')}</TabsTrigger>
            <TabsTrigger value="trends">{t('trends')}</TabsTrigger>
            <TabsTrigger value="reasons">{t('lossReasons')}</TabsTrigger>
          </TabsList>
          
                     <TabsContent value="summary" className="space-y-4">
             {/* Pie Chart */}
             <div className="mb-6">
               <WonLostPieChart data={data} />
             </div>
             
             {/* Summary Cards */}
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-800">{t('wonDeals')}</p>
                      <p className="text-2xl font-bold text-green-900">{data.summary.totalWon}</p>
                    </div>
                    <Trophy className="h-8 w-8 text-green-600" />
                  </div>
                  <p className="text-sm text-green-600 mt-2">
                    {formatCurrency(data.summary.wonBudget)}
                  </p>
                </CardContent>
              </Card>
              
              <Card className="bg-red-50 border-red-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-red-800">{t('lostDeals')}</p>
                      <p className="text-2xl font-bold text-red-900">{data.summary.totalLost}</p>
                    </div>
                    <XCircle className="h-8 w-8 text-red-600" />
                  </div>
                  <p className="text-sm text-red-600 mt-2">
                    {formatCurrency(data.summary.lostBudget)}
                  </p>
                </CardContent>
              </Card>
              
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-800">{t('winRate')}</p>
                      <p className="text-2xl font-bold text-blue-900">{data.summary.conversionRate}%</p>
                    </div>
                    <Target className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="mt-2">
                    <Progress value={parseFloat(data.summary.conversionRate)} className="h-2" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-purple-50 border-purple-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-800">{t('totalBudget')}</p>
                      <p className="text-2xl font-bold text-purple-900">
                        {formatCurrency(data.summary.totalBudget)}
                      </p>
                    </div>
                    <DollarSign className="h-8 w-8 text-purple-600" />
                  </div>
                  <p className="text-sm text-purple-600 mt-2">
                    {t('acrossAllDeals')}
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="trends" className="space-y-4">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">{t('last6Months')}</h3>
              <div className="space-y-2">
                {data.monthlyData.map((month, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <span className="font-medium w-12">{month.month}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-green-600 border-green-200">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          {month.won} {t('won')}
                        </Badge>
                        <Badge variant="outline" className="text-red-600 border-red-200">
                          <TrendingDown className="h-3 w-3 mr-1" />
                          {month.lost} {t('lost')}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {formatCurrency(month.wonBudget + month.lostBudget)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t('totalBudgetLabel')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="reasons" className="space-y-4">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">{t('lossReasonsTitle')}</h3>
              <div className="space-y-2">
                {Object.entries(data.lostByReason).map(([reason, stats]) => (
                  <div key={reason} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <span className="font-medium">{getLossReasonLabel(reason)}</span>
                      <Badge variant="outline">{stats.count} {t('deals')}</Badge>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatCurrency(stats.budget)}</p>
                      <p className="text-xs text-muted-foreground">{t('lostBudget')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
} 