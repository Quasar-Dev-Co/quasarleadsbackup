"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { auth } from "@/lib/auth";
import { Clock, Play, CheckCircle, Layers, Database, AlertCircle } from "lucide-react";

type Stage = "idle" | "pending" | "processing" | "collecting" | "enriching" | "completed" | "failed";

interface SummaryResponse {
  success: boolean;
  userId: string;
  stage: Stage;
  progress: number;
  searchJobs: {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  };
  temporaryLeads: {
    total: number;
    pendingAuth: number;
    processed: number;
  };
  mainLeads: { total: number };
}

export function SearchJobsProgress() {
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = async () => {
    try {
      const userId = await auth.getCurrentUserId();
      if (!userId) {
        setError("Authentication required");
        setLoading(false);
        return;
      }
      const res = await fetch(`/api/search-jobs/summary?userId=${userId}`, {
        headers: { authorization: `Bearer ${userId}` },
      });
      const json = await res.json();
      if (json.success) {
        setSummary(json);
        setError(null);
      } else {
        setError(json.error || "Failed to fetch status");
      }
    } catch (e: any) {
      setError("Network error while fetching status");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
    const id = setInterval(fetchSummary, 3000);
    return () => clearInterval(id);
  }, []);

  const stageIcon = useMemo(() => {
    const s = summary?.stage;
    if (s === "pending") return <Clock className="h-5 w-5 text-yellow-600" />;
    if (s === "processing") return <Play className="h-5 w-5 text-blue-600 animate-pulse" />;
    if (s === "collecting") return <Layers className="h-5 w-5 text-indigo-600 animate-pulse" />;
    if (s === "enriching") return <Database className="h-5 w-5 text-purple-600 animate-pulse" />;
    if (s === "completed") return <CheckCircle className="h-5 w-5 text-green-600" />;
    if (s === "failed") return <AlertCircle className="h-5 w-5 text-red-600" />;
    return <Clock className="h-5 w-5 text-gray-500" />;
  }, [summary?.stage]);

  const stageLabel = useMemo(() => {
    const s = summary?.stage;
    if (s === "pending") return "Pending in queue";
    if (s === "processing") return "Processing search jobs";
    if (s === "collecting") return "Collecting leads";
    if (s === "enriching") return "Enriching auth details";
    if (s === "completed") return "Leads completed";
    if (s === "failed") return "Failed";
    return "Idle";
  }, [summary?.stage]);

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
            <Clock className="h-4 w-4 mr-2 animate-pulse" /> Loading status...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full border-red-200">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-6 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 mr-2" /> {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!summary) return null;

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {stageIcon}
            <CardTitle className="text-base">Lead Collection Status</CardTitle>
            <Badge variant="outline">{stageLabel}</Badge>
          </div>
          <Badge variant="outline" className="font-semibold">{summary.progress}%</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Progress value={summary.progress} className="h-2" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <Badge variant="outline" className="justify-between">
            <span>Jobs</span>
            <span className="ml-2 font-semibold">{summary.searchJobs.total}</span>
          </Badge>
          <Badge variant="outline" className="justify-between">
            <span>Pending</span>
            <span className="ml-2 font-semibold">{summary.searchJobs.pending}</span>
          </Badge>
          <Badge variant="outline" className="justify-between">
            <span>Processing</span>
            <span className="ml-2 font-semibold">{summary.searchJobs.processing}</span>
          </Badge>
          <Badge variant="outline" className="justify-between">
            <span>Temp Leads (auth pending)</span>
            <span className="ml-2 font-semibold">{summary.temporaryLeads.pendingAuth}</span>
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

export default SearchJobsProgress;


