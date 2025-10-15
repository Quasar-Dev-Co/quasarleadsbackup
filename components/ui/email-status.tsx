import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { RotateCw } from 'lucide-react';
import { toast } from 'sonner';

interface EmailStatusProps {
  lead: {
    _id?: string;
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
  };
  onRefresh?: () => void; // Optional callback to refresh lead data
}

const EmailStatus: React.FC<EmailStatusProps> = ({ lead, onRefresh }) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Refresh lead timing with new settings from email-prompting
  const handleRefreshTiming = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (!lead._id) {
      toast.error('Lead ID not available');
      return;
    }

    setIsRefreshing(true);

    try {
      const response = await fetch('/api/refresh-lead-timing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ leadId: lead._id }),
      });

      const result = await response.json();

      if (result.success) {
        const data = result.data;
        console.log('🔄 Refresh result:', data);
        toast.success(`✅ Lead timing refreshed! Next email: ${data.timingSettings?.delay} ${data.timingSettings?.unit} from last email`);
        if (onRefresh) {
          onRefresh(); // Trigger parent component to refresh data
        }
      } else {
        toast.error(`❌ Failed to refresh timing: ${result.error}`);
      }
    } catch (error) {
      console.error('Error refreshing lead timing:', error);
      toast.error('Failed to refresh lead timing');
    } finally {
      setIsRefreshing(false);
    }
  };

  if (!lead.emailSequenceActive) {
    return (
      <Badge variant="secondary" className="text-xs">
        <span className="mr-1">⚫</span>
        Inactive
      </Badge>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready':
        return '🟡'; // Yellow circle for ready
      case 'sending':
        return '🔄'; // Refresh icon for sending
      case 'sent':
        return '✅'; // Green check for sent
      case 'failed':
        return '❌'; // Red X for failed
      case 'max_retries_exceeded':
        return '🚫'; // No entry sign for max retries
      default:
        return '⚪'; // White circle for unknown
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'sending':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'sent':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'max_retries_exceeded':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const formatStage = (stage: string) => {
    const stageMap: { [key: string]: string } = {
      'called_once': 'Email 1',
      'called_twice': 'Email 2',
      'called_three_times': 'Email 3',
      'called_four_times': 'Email 4',
      'called_five_times': 'Email 5',
      'called_six_times': 'Email 6',
      'called_seven_times': 'Email 7'
    };
    return stageMap[stage] || stage;
  };

  const getNextEmailTime = () => {
    if (!lead.nextScheduledEmail) {
      // If no schedule but ready status, it should send immediately
      if (status === 'ready') return 'Now';
      return null;
    }
    
    const now = new Date();
    const scheduled = new Date(lead.nextScheduledEmail);
    const diffMs = scheduled.getTime() - now.getTime();
    
    // If scheduled time is in the past by more than 5 minutes, show "Pending"
    if (diffMs < -300000) return 'Pending'; // -5 minutes
    
    if (diffMs <= 0) return 'Now';
    
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) return `${diffDays}d`;
    if (diffHours > 0) return `${diffHours}h`;
    return `${diffMinutes}m`;
  };

  const currentStage = lead.emailSequenceStage || 'not_called';
  const currentStep = lead.emailSequenceStep || 0;
  const status = lead.emailStatus || 'ready';
  const retryCount = lead.emailRetryCount || 0;
  const failureCount = lead.emailFailureCount || 0;
  const nextEmailTime = getNextEmailTime();

  const getStatusDescription = (status: string) => {
    switch (status) {
      case 'ready':
        return 'Ready to send email (waiting for cron job)';
      case 'sending':
        return 'Currently sending email';
      case 'sent':
        return 'Email sent successfully';
      case 'failed':
        return 'Email sending failed (will retry)';
      case 'max_retries_exceeded':
        return 'Max retry attempts reached';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
    }
  };

  const tooltipContent = (
    <div className="space-y-2 text-sm max-w-xs">
      <div>
        <strong>Status:</strong> {getStatusDescription(status)}
      </div>
      {currentStage !== 'not_called' && (
        <div>
          <strong>Current Stage:</strong> {formatStage(currentStage)} (Step {currentStep}/7)
        </div>
      )}
      {retryCount > 0 && (
        <div>
          <strong>Retry Count:</strong> {retryCount}/10
        </div>
      )}
      {failureCount > 0 && (
        <div>
          <strong>Total Failures:</strong> {failureCount}
        </div>
      )}
      {nextEmailTime && (
        <div>
          <strong>{status === 'ready' ? 'Sends In:' : 'Next Email:'}</strong> {nextEmailTime}
          {nextEmailTime === 'Pending' && (
            <div className="text-xs text-orange-600 mt-1">
              Email is overdue - cron job will process it soon
            </div>
          )}
          {nextEmailTime === 'Now' && status === 'ready' && (
            <div className="text-xs text-blue-600 mt-1">
              Email scheduled for immediate sending
            </div>
          )}
        </div>
      )}
      {lead.emailLastAttempt && (
        <div>
          <strong>Last Attempt:</strong> {new Date(lead.emailLastAttempt).toLocaleDateString()}
        </div>
      )}
      {lead.emailErrors && lead.emailErrors.length > 0 && (
        <div className="mt-2 pt-2 border-t">
          <strong>Recent Errors:</strong>
          <div className="text-xs text-gray-600 mt-1">
            {lead.emailErrors.slice(-2).map((error, index) => (
              <div key={index} className="truncate">
                Attempt {error.attempt}: {error.error.substring(0, 50)}...
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <div className="flex items-center space-x-2">
            <Badge 
              variant="outline" 
              className={`text-xs border ${getStatusColor(status)}`}
            >
              <span className="mr-1">{getStatusIcon(status)}</span>
              {currentStage === 'not_called' ? 'Ready' : formatStage(currentStage)}
              {retryCount > 0 && (
                <span className="ml-1 text-xs opacity-75">
                  (Retry {retryCount})
                </span>
              )}
            </Badge>
            
            {/* Progress indicator for 7-step sequence */}
            <div className="flex space-x-1">
              {Array.from({ length: 7 }, (_, index) => {
                const stepNumber = index + 1;
                const isCompleted = currentStep > stepNumber;
                const isCurrent = currentStep === stepNumber;
                const isFailed = isCurrent && (status === 'failed' || status === 'max_retries_exceeded');
                
                return (
                  <div
                    key={stepNumber}
                    className={`w-2 h-2 rounded-full ${
                      isCompleted
                        ? 'bg-green-500'
                        : isCurrent
                        ? isFailed
                          ? 'bg-red-500'
                          : status === 'sending'
                          ? 'bg-blue-500 animate-pulse'
                          : 'bg-yellow-500'
                        : 'bg-gray-300'
                    }`}
                    title={`Step ${stepNumber}`}
                  />
                );
              })}
            </div>

            {/* Failure count indicator */}
            {failureCount > 0 && (
              <div className="flex items-center text-xs text-red-600">
                <span className="mr-1">⚠️</span>
                {failureCount}
              </div>
            )}

            {/* Next email timing */}
            {nextEmailTime && (
              <div className="flex items-center gap-1">
                <div className={`text-xs ${
                  nextEmailTime === 'Pending' ? 'text-orange-600' : 
                  nextEmailTime === 'Now' ? 'text-blue-600' : 
                  'text-gray-500'
                }`}>
                  {status === 'ready' ? 'Sends: ' : 'Next: '}{nextEmailTime}
                </div>
                
                {/* Refresh timing button - only show for active automation */}
                {lead._id && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 hover:bg-gray-100"
                        onClick={handleRefreshTiming}
                        disabled={isRefreshing}
                      >
                        <RotateCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">
                        Refresh timing with current Email Prompting settings
                      </p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default EmailStatus; 