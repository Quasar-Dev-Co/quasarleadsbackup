'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface EmailAutomationProgressProps {
  lead: any;
  onRefresh?: () => void;
}

const EMAIL_STAGES = [
  { key: 'called_once', label: '1st Email', icon: '1️⃣', step: 1 },
  { key: 'called_twice', label: '2nd Email', icon: '2️⃣', step: 2 },
  { key: 'called_three_times', label: '3rd Email', icon: '3️⃣', step: 3 },
  { key: 'called_four_times', label: '4th Email', icon: '4️⃣', step: 4 },
  { key: 'called_five_times', label: '5th Email', icon: '5️⃣', step: 5 },
  { key: 'called_six_times', label: '6th Email', icon: '6️⃣', step: 6 },
  { key: 'called_seven_times', label: '7th Email', icon: '7️⃣', step: 7 }
];

const EmailAutomationProgress: React.FC<EmailAutomationProgressProps> = ({ lead, onRefresh }) => {
  const [forcing, setForcing] = useState(false);

  if (!lead.emailSequenceActive) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📧 Email Automation
            <Badge variant="secondary">Inactive</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Email automation is not active for this lead.</p>
        </CardContent>
      </Card>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready': return '🟡';
      case 'sending': return '🔄';
      case 'sent': return '✅';
      case 'failed': return '❌';
      case 'max_retries_exceeded': return '🚫';
      default: return '⚪';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready': return 'bg-yellow-100 text-yellow-800';
      case 'sending': return 'bg-blue-100 text-blue-800';
      case 'sent': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'max_retries_exceeded': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getNextStage = (currentStage: string) => {
    const currentIndex = EMAIL_STAGES.findIndex(s => s.key === currentStage);
    return currentIndex >= 0 && currentIndex < EMAIL_STAGES.length - 1 ? EMAIL_STAGES[currentIndex + 1] : null;
  };

  const forceEmailProgression = async (nextStage?: string) => {
    try {
      setForcing(true);
      
      const response = await fetch('/api/force-email-progression', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leadId: lead._id || lead.id,
          forceToStage: nextStage
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`✅ Email sent successfully! Lead advanced to ${data.data.newStage}`);
        if (onRefresh) onRefresh();
      } else {
        toast.error(`❌ Failed to send email: ${data.error}`);
      }
    } catch (error: any) {
      console.error('Error forcing email progression:', error);
      toast.error('Failed to send email. Please try again.');
    } finally {
      setForcing(false);
    }
  };

  const formatNextEmailTime = () => {
    if (!lead.nextScheduledEmail) return null;
    
    const nextDate = new Date(lead.nextScheduledEmail);
    const now = new Date();
    const diffMs = nextDate.getTime() - now.getTime();
    
    if (diffMs <= 0) return 'Ready to send';
    
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffDays > 0) return `in ${diffDays} day${diffDays > 1 ? 's' : ''} ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
    if (diffHours > 0) return `in ${diffHours} hour${diffHours > 1 ? 's' : ''} ${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
    return `in ${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
  };

  const currentStep = lead.emailSequenceStep || 0;
  const currentStage = lead.emailSequenceStage || 'called_once';
  const emailStatus = lead.emailStatus || 'ready';
  const retryCount = lead.emailRetryCount || 0;
  const failureCount = lead.emailFailureCount || 0;
  const nextEmailTime = formatNextEmailTime();
  const nextStage = getNextStage(currentStage);
  const emailHistory = lead.emailHistory || [];

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            📧 Email Automation Progress
            <Badge className={getStatusColor(emailStatus)}>
              {getStatusIcon(emailStatus)} {emailStatus.replace('_', ' ')}
            </Badge>
          </div>
          <div className="text-sm font-normal">
            Step {currentStep}/7
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Progress Visualization */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm">Email Sequence Progress</h4>
          <div className="grid grid-cols-7 gap-2">
            {EMAIL_STAGES.map((stage) => {
              const isCompleted = currentStep > stage.step;
              const isCurrent = currentStep === stage.step;
              const emailSent = emailHistory.find((h: any) => h.stage === stage.key && h.status === 'sent');
              const emailFailed = emailHistory.find((h: any) => h.stage === stage.key && h.status === 'failed');
              
              let status = 'pending';
              let bgColor = 'bg-gray-100';
              let textColor = 'text-gray-500';
              
              if (emailSent) {
                status = 'sent';
                bgColor = 'bg-green-100';
                textColor = 'text-green-700';
              } else if (emailFailed) {
                status = 'failed';
                bgColor = 'bg-red-100';
                textColor = 'text-red-700';
              } else if (isCurrent) {
                status = emailStatus;
                if (emailStatus === 'sending') {
                  bgColor = 'bg-blue-100';
                  textColor = 'text-blue-700';
                } else if (emailStatus === 'ready') {
                  bgColor = 'bg-yellow-100';
                  textColor = 'text-yellow-700';
                }
              }
              
              return (
                <div key={stage.key} className={`p-2 rounded text-center ${bgColor} ${textColor}`}>
                  <div className="text-lg">{stage.icon}</div>
                  <div className="text-xs font-medium">{stage.label}</div>
                  <div className="text-xs">
                    {status === 'sent' && '✅'}
                    {status === 'failed' && '❌'}
                    {status === 'sending' && '🔄'}
                    {status === 'ready' && isCurrent && '🟡'}
                    {status === 'pending' && '⚪'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Current Status */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Current Status</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Current Stage:</span>
              <span className="ml-2 font-medium">
                {EMAIL_STAGES.find(s => s.key === currentStage)?.label}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Status:</span>
              <span className="ml-2 font-medium capitalize">
                {emailStatus.replace('_', ' ')}
              </span>
            </div>
            {retryCount > 0 && (
              <div>
                <span className="text-gray-600">Retry Count:</span>
                <span className="ml-2 font-medium text-orange-600">
                  {retryCount}/10
                </span>
              </div>
            )}
            {failureCount > 0 && (
              <div>
                <span className="text-gray-600">Failed Attempts:</span>
                <span className="ml-2 font-medium text-red-600">
                  {failureCount}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Next Email Timing */}
        {nextEmailTime && emailStatus === 'sent' && (
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Next Email:</span>
              <span className="text-sm text-blue-700">{nextEmailTime}</span>
            </div>
          </div>
        )}

        {/* Email History */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Email History</h4>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {emailHistory.length > 0 ? (
              emailHistory.slice().reverse().map((email: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                  <div className="flex items-center gap-2">
                    <span>{EMAIL_STAGES.find(s => s.key === email.stage)?.icon}</span>
                    <span className="font-medium">
                      {EMAIL_STAGES.find(s => s.key === email.stage)?.label}
                    </span>
                    {email.forceProgressed && (
                      <Badge variant="outline" className="text-xs">Manual</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={email.status === 'sent' ? 'text-green-600' : 'text-red-600'}>
                      {email.status === 'sent' ? '✅' : '❌'}
                    </span>
                    <span className="text-gray-500 text-xs">
                      {new Date(email.sentAt).toLocaleDateString()} {new Date(email.sentAt).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm">No emails sent yet</p>
            )}
          </div>
        </div>

        {/* Error Information */}
        {lead.emailErrors && lead.emailErrors.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-red-600">Recent Errors</h4>
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {lead.emailErrors.slice(-3).map((error: any, index: number) => (
                <div key={index} className="p-2 bg-red-50 rounded text-xs">
                  <div className="font-medium">Attempt {error.attempt || error.attemptNumber}:</div>
                  <div className="text-red-700">{error.error}</div>
                  <div className="text-gray-500">
                    {new Date(error.timestamp).toLocaleDateString()} {new Date(error.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Force Progression Button */}
        {nextStage && emailStatus !== 'sending' && emailStatus !== 'max_retries_exceeded' && (
          <div className="pt-4 border-t">
            <Button
              onClick={() => forceEmailProgression(nextStage.key)}
              disabled={forcing}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {forcing ? (
                <span className="flex items-center gap-2">
                  🔄 Sending...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  🚀 Force Send {nextStage.label} Now
                </span>
              )}
            </Button>
            <p className="text-xs text-gray-500 mt-1 text-center">
              This will send the next email immediately and advance the sequence
            </p>
          </div>
        )}

        {/* Completed Message */}
        {currentStep >= 7 && (
          <div className="p-3 bg-green-50 rounded-lg text-center">
            <div className="text-green-700 font-medium">🎉 Email Sequence Completed!</div>
            <div className="text-sm text-green-600 mt-1">
              All 7 emails have been sent in this automation sequence.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EmailAutomationProgress; 