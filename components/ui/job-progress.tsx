"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Play, 
  Pause, 
  RotateCw, 
  AlertCircle,
  Timer,
  Users,
  MapPin,
  Briefcase
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Job {
  jobId: string;
  type: 'lead-collection';
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
  // High-value analysis removed
}

interface JobProgressProps {
  jobId: string;
  onJobComplete?: (job: Job) => void;
  onJobError?: (job: Job) => void;
}

export function JobProgress({ jobId, onJobComplete, onJobError }: JobProgressProps) {
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<any | null>(null);

  // Fetch job status
  const fetchJobStatus = async () => {
    try {
      const response = await fetch(`/api/jobs/status/${jobId}`);
      const data = await response.json();
      
      if (data.success) {
        setJob(data.job);
        setError(null);
        
        // Call callbacks if job is completed or failed
        if (data.job.status === 'completed' && onJobComplete) {
          onJobComplete(data.job);
        } else if (data.job.status === 'failed' && onJobError) {
          onJobError(data.job);
        }
      } else {
        setError(data.error || 'Failed to fetch job status');
      }
    } catch (err) {
      setError('Network error while fetching job status');
    } finally {
      setLoading(false);
    }
  };

  // NEW: Fetch overall summary (search jobs + temporary leads) for header badges
  const fetchSummary = async () => {
    try {
      const authHeader = (typeof window !== 'undefined') ? (window.localStorage.getItem('quasarleads_session')) : null;
      let userId: string | null = null;
      if (authHeader) {
        try { userId = JSON.parse(authHeader)?.userId || null; } catch {}
      }
      const params = userId ? `?userId=${userId}` : '';
      const res = await fetch(`/api/search-jobs/summary${params}`, {
        headers: userId ? { 'authorization': `Bearer ${userId}` } : undefined
      });
      const json = await res.json();
      if (json.success) setSummary(json);
    } catch (e) {
      // best-effort, ignore
    }
  };

  // Cancel job
  const cancelJob = async () => {
    try {
      const response = await fetch(`/api/jobs/status/${jobId}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      
      if (data.success) {
        await fetchJobStatus();
      } else {
        setError(data.error || 'Failed to cancel job');
      }
    } catch (err) {
      setError('Network error while cancelling job');
    }
  };

  // NEW: Start local job processing for development
  const startLocalJob = async () => {
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
        setError(errorData.error || 'Failed to start local job');
      } else {
        const data = await response.json();
        console.log('Local job started:', data);
        // Refresh status after a short delay
        setTimeout(fetchJobStatus, 2000);
      }
    } catch (err) {
      setError('Network error while starting local job');
    }
  };

  // Auto-refresh job status
  useEffect(() => {
    fetchJobStatus();
    fetchSummary();
    
    // Set up polling for active jobs
    let interval: NodeJS.Timeout;
    if (job && (job.status === 'pending' || job.status === 'running')) {
      // Enhanced polling with exponential backoff for better performance
      const baseInterval = process.env.NODE_ENV === 'development' ? 1500 : 3000;
      const pollInterval = job.status === 'running' ? baseInterval : baseInterval * 2;
      
      interval = setInterval(() => {
        fetchJobStatus();
        fetchSummary();
      }, pollInterval);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [jobId, job?.status]);

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <RotateCw className="h-6 w-6 animate-spin mr-2" />
            <span>Loading job status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !job) {
    return (
      <Card className="w-full border-red-200">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8 text-red-600">
            <AlertCircle className="h-6 w-6 mr-2" />
            <span>{error || 'Job not found'}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusIcon = () => {
    switch (job.status) {
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'running':
        return <Play className="h-5 w-5 text-blue-500 animate-pulse" />;
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'cancelled':
        return <Pause className="h-5 w-5 text-gray-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = () => {
    switch (job.status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'running':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <div>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                Lead Collection Job
                {/* Job Type Badge */}
                <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                  Normal Collection
                </Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Job ID: {job.jobId.slice(0, 8)}... | 
                Basic Organic + Local Search
              </p>
            </div>
          </div>
          <Badge className={getStatusColor()}>
            {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
          </Badge>
        </div>
        {summary && (
          <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
            <Badge variant="outline" className="justify-between">
              <span>Jobs Pending</span>
              <span className="ml-2 font-semibold">{summary.searchJobs?.pending || 0}</span>
            </Badge>
            <Badge variant="outline" className="justify-between">
              <span>Jobs Processing</span>
              <span className="ml-2 font-semibold">{summary.searchJobs?.processing || 0}</span>
            </Badge>
            <Badge variant="outline" className="justify-between">
              <span>Temp Leads (pending auth)</span>
              <span className="ml-2 font-semibold">{summary.temporaryLeads?.pendingAuth || 0}</span>
            </Badge>
            <Badge variant="outline" className="justify-between">
              <span>Overall Progress</span>
              <span className="ml-2 font-semibold">{summary.progress || 0}%</span>
            </Badge>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span>{job.progress}% ({job.currentStep}/{job.totalSteps})</span>
          </div>
          <Progress value={job.progress} className="h-2" />
          <p className="text-sm text-muted-foreground">
            {job.progressMessage}
          </p>
        </div>

        {/* NEW: Step-by-Step Progress Grid */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Step-by-Step Progress</h4>
          <div className="grid gap-2">
            {job.services.map((service, serviceIndex) => (
              <div key={service} className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground">{service}</div>
                <div className="flex gap-1">
                  {job.locations.map((location, locationIndex) => {
                    const stepNumber = serviceIndex * job.locations.length + locationIndex + 1;
                    const isCompleted = stepNumber < job.currentStep;
                    const isCurrent = stepNumber === job.currentStep;
                    const isPending = stepNumber > job.currentStep;
                    
                    let status = 'pending';
                    let bgColor = 'bg-gray-100';
                    let textColor = 'text-gray-500';
                    let borderColor = 'border-gray-200';
                    
                    if (isCompleted) {
                      status = 'completed';
                      bgColor = 'bg-green-100';
                      textColor = 'text-green-700';
                      borderColor = 'border-green-200';
                    } else if (isCurrent) {
                      status = 'current';
                      bgColor = 'bg-blue-100';
                      textColor = 'text-blue-700';
                      borderColor = 'border-blue-200';
                    }
                    
                    return (
                      <div
                        key={`${service}-${location}`}
                        className={`flex-1 p-2 rounded border text-xs text-center ${bgColor} ${textColor} ${borderColor} ${
                          isCurrent ? 'ring-2 ring-blue-300' : ''
                        }`}
                        title={`Step ${stepNumber}: ${service} in ${location}`}
                      >
                        <div className="font-medium truncate">{location}</div>
                        <div className="text-xs opacity-75">
                          {isCompleted && '✅'}
                          {isCurrent && '🔄'}
                          {isPending && '⏳'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Current Step Details */}
        {job.status === 'running' && job.currentService && job.currentLocation && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-blue-800">Currently Processing</span>
            </div>
            <div className="text-sm text-blue-700">
              <div><strong>Service:</strong> {job.currentService}</div>
              <div><strong>Location:</strong> {job.currentLocation}</div>
              <div><strong>Step:</strong> {job.currentStep} of {job.totalSteps}</div>
            </div>
          </div>
        )}

        {/* Job Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Services:</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {job.services.map((service, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {service}
                </Badge>
              ))}
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Locations:</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {job.locations.map((location, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {location}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Leads Collected</span>
            </div>
            <span className="text-2xl font-bold text-green-600">
              {job.totalLeadsCollected || job.collectedLeads}
            </span>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Timer className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Est. Duration</span>
            </div>
            <span className="text-lg font-semibold">
              {formatDuration(job.estimatedDuration)}
            </span>
          </div>
          
          {job.timeRemaining !== null && job.timeRemaining !== undefined && (
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Time Remaining</span>
              </div>
              <span className="text-lg font-semibold text-blue-600">
                {formatDuration(job.timeRemaining)}
              </span>
            </div>
          )}
          
          {job.queuePosition && (
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <RotateCw className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Queue Position</span>
              </div>
              <span className="text-lg font-semibold text-yellow-600">
                #{job.queuePosition}
              </span>
            </div>
          )}
        </div>

        {/* Timeline */}
        <div className="space-y-2 pt-2">
          <h4 className="text-sm font-medium">Timeline</h4>
          <div className="space-y-1 text-xs text-muted-foreground">
            <div>Created: {formatDistanceToNow(new Date(job.createdAt))} ago</div>
            {job.startedAt && (
              <div>Started: {formatDistanceToNow(new Date(job.startedAt))} ago</div>
            )}
            {job.completedAt && (
              <div>Completed: {formatDistanceToNow(new Date(job.completedAt))} ago</div>
            )}
          </div>
        </div>

        {/* Error Message */}
        {job.errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-800">Error</p>
                <p className="text-sm text-red-700">{job.errorMessage}</p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        {(job.status === 'pending' || job.status === 'running') && (
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchJobStatus}
              className="flex items-center gap-1"
            >
              <RotateCw className="h-4 w-4" />
              Refresh
            </Button>
            
            {/* NEW: Manual start button for development mode */}
            {process.env.NODE_ENV === 'development' && job.status === 'pending' && (
              <Button
                variant="default"
                size="sm"
                onClick={startLocalJob}
                className="flex items-center gap-1 bg-green-600 hover:bg-green-700"
              >
                <Play className="h-4 w-4" />
                Start Local Processing
              </Button>
            )}
            
            <Button
              variant="destructive"
              size="sm"
              onClick={cancelJob}
              className="flex items-center gap-1"
            >
              <XCircle className="h-4 w-4" />
              Cancel Job
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 