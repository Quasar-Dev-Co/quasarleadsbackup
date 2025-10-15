"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  X, 
  Mail, 
  CheckCircle,
  AlertCircle,
  Settings,
  Eye,
  EyeOff
} from "lucide-react";
import { toast } from "react-hot-toast";

interface EmailConfigProps {
  onClose: () => void;
}

const EmailConfig = ({ onClose }: EmailConfigProps) => {
  const [config, setConfig] = useState({
    gmailUser: '',
    gmailAppPassword: '',
    senderName: '',
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [testing, setTesting] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'success' | 'error'>('unknown');
  const [connectionError, setConnectionError] = useState('');

  // Test email connection
  const testConnection = async () => {
    setTesting(true);
    setConnectionStatus('unknown');
    setConnectionError('');
    
    try {
      console.log('Testing email connection...');
      const response = await fetch('/api/crm/send-email', {
        method: 'GET'
      });
      
      const data = await response.json();
      console.log('Connection test response:', data);
      
      if (data.success) {
        setConnectionStatus('success');
        toast.success('QuasarSEO SMTP connection successful! ✅');
      } else {
        setConnectionStatus('error');
        setConnectionError(data.error || 'Connection failed');
        toast.error(`Connection failed: ${data.error}`);
      }
    } catch (error: any) {
      console.error('Connection test error:', error);
      setConnectionStatus('error');
      setConnectionError(error.message || 'Connection test failed');
      toast.error('Connection test failed');
    } finally {
      setTesting(false);
    }
  };

  // Send test email
  const sendTestEmail = async () => {
    if (!testEmail.trim()) {
      toast.error('Please enter a test email address');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(testEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setSendingTest(true);
    
    try {
      console.log('Sending test email to:', testEmail);
      
      const testTemplate = {
        stage: 'called_once',
        subject: '[TEST] CRM Email System Test',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #f0f8ff; border-left: 4px solid #007bff; padding: 15px; margin-bottom: 20px;">
              <h3 style="margin: 0; color: #007bff;">🔧 CRM Email System Test</h3>
              <p style="margin: 5px 0 0 0; color: #555;">This is a test email from your QuasarLeads CRM system.</p>
            </div>
            
            <p>Hello {{LEAD_NAME}},</p>
            
            <p>This is a test email to verify that your CRM email automation is working correctly.</p>
            
            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <strong>Test Details:</strong>
              <ul>
                <li>Company: {{COMPANY_NAME}}</li>
                <li>Sender: {{SENDER_NAME}}</li>
                <li>Service: {{COMPANY_SERVICE}}</li>
              </ul>
            </div>
            
            <p>If you received this email, your email automation is configured correctly! 🎉</p>
            
            <p>Best regards,<br>{{SENDER_NAME}}</p>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
            <p style="font-size: 12px; color: #888;">
              This is a test email sent from the QuasarLeads CRM system.
            </p>
          </div>
        `,
        textContent: `
CRM EMAIL SYSTEM TEST

Hello {{LEAD_NAME}},

This is a test email to verify that your CRM email automation is working correctly.

Test Details:
- Company: {{COMPANY_NAME}}
- Sender: {{SENDER_NAME}}
- Service: {{COMPANY_SERVICE}}

If you received this email, your email automation is configured correctly!

Best regards,
{{SENDER_NAME}}

---
This is a test email sent from the QuasarLeads CRM system.
        `
      };

      const testLead = {
        name: 'Test User',
        company: 'Test Company'
      };

      const companySettings = {
        companyName: 'QuasarLeads',
        service: 'CRM Email Testing',
        industry: 'Technology',
        senderName: 'QuasarLeads Team',
        senderEmail: 'info@quasarseo.nl',
        websiteUrl: 'https://quasarleads.com'
      };

      const response = await fetch('/api/test-email-template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          template: testTemplate,
          testEmail,
          testLead,
          companySettings
        }),
      });

      const data = await response.json();
      console.log('Test email response:', data);

      if (data.success) {
        toast.success(`✅ Test email sent successfully to ${testEmail}!`);
        setTestEmail(''); // Clear the input
      } else {
        toast.error(`❌ Failed to send test email: ${data.error}`);
      }
    } catch (error: any) {
      console.error('Test email error:', error);
      toast.error('❌ Failed to send test email');
    } finally {
      setSendingTest(false);
    }
  };

  // Test connection on component mount
  useEffect(() => {
    testConnection();
  }, []);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-xl font-semibold flex items-center gap-2">
            <Settings className="w-5 h-5" />
            QuasarSEO SMTP Email Configuration
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-6">
          
          {/* Connection Status */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Connection Status</h3>
            
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                {connectionStatus === 'success' && (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <div>
                      <p className="font-medium text-green-700">QuasarSEO SMTP Connected</p>
                      <p className="text-sm text-green-600">Automated emails are ready!</p>
                    </div>
                  </>
                )}
                
                {connectionStatus === 'error' && (
                  <>
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <div>
                      <p className="font-medium text-red-700">Connection Failed</p>
                      <p className="text-sm text-red-600">{connectionError}</p>
                    </div>
                  </>
                )}
                
                {connectionStatus === 'unknown' && (
                  <>
                    <AlertCircle className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="font-medium text-gray-700">Unknown Status</p>
                      <p className="text-sm text-gray-600">Click test to check connection</p>
                    </div>
                  </>
                )}
              </div>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={testConnection}
                disabled={testing}
              >
                {testing ? 'Testing...' : 'Test Connection'}
              </Button>
            </div>
          </div>

          {/* Configuration Instructions */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Setup Instructions</h3>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-green-800 mb-3">✅ QuasarSEO SMTP Ready</h4>
              <div className="space-y-2 text-sm text-green-700">
                <p><strong>SMTP Server:</strong> mail.zxcs.nl (Port 587)</p>
                <p><strong>Username:</strong> info@quasarseo.nl</p>
                <p><strong>Authentication:</strong> Configured and working</p>
                <p><strong>Status:</strong> All email automation features are ready to use!</p>
              </div>
            </div>
          </div>

          {/* Environment Variables */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Environment Variables</h3>
            
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm">
              <p className="text-gray-400 mb-2"># QuasarSEO SMTP Configuration (Already Set):</p>
              <p>SMTP_HOST=mail.zxcs.nl</p>
              <p>SMTP_PORT=587</p>
              <p>SMTP_USER=info@quasarseo.nl</p>
              <p>SMTP_PASSWORD=***configured***</p>
              <p>SENDER_NAME=QuasarLeads Team</p>
            </div>
            
            <div className="text-sm text-gray-600">
              <p><strong>Note:</strong> SMTP credentials are now hard-coded with QuasarSEO settings!</p>
            </div>
          </div>

          {/* Email Templates Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Automated Email Campaign (7-Step Sequence)</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Mail className="w-4 h-4 text-blue-500" />
                  <h4 className="font-medium">Called Once</h4>
                </div>
                <p className="text-sm text-gray-600">
                  Introduction email with QuasarLeads services and value proposition
                </p>
                <Badge variant="secondary" className="mt-2 text-xs">
                  Template 1
                </Badge>
              </div>
              
              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Mail className="w-4 h-4 text-orange-500" />
                  <h4 className="font-medium">Called Twice</h4>
                </div>
                <p className="text-sm text-gray-600">
                  Follow-up email with client results and social proof
                </p>
                <Badge variant="secondary" className="mt-2 text-xs">
                  Template 2
                </Badge>
              </div>
              
              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Mail className="w-4 h-4 text-cyan-500" />
                  <h4 className="font-medium">Called Three Times</h4>
                </div>
                <p className="text-sm text-gray-600">
                  Question-based email asking about lead generation challenges
                </p>
                <Badge variant="secondary" className="mt-2 text-xs">
                  Template 3
                </Badge>
              </div>

              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Mail className="w-4 h-4 text-green-500" />
                  <h4 className="font-medium">Called Four Times</h4>
                </div>
                <p className="text-sm text-gray-600">
                  Case study email showing 400% lead increase results
                </p>
                <Badge variant="secondary" className="mt-2 text-xs">
                  Template 4
                </Badge>
              </div>

              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Mail className="w-4 h-4 text-yellow-500" />
                  <h4 className="font-medium">Called Five Times</h4>
                </div>
                <p className="text-sm text-gray-600">
                  Priority check email asking if lead generation is still important
                </p>
                <Badge variant="secondary" className="mt-2 text-xs">
                  Template 5
                </Badge>
              </div>

              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Mail className="w-4 h-4 text-teal-500" />
                  <h4 className="font-medium">Called Six Times</h4>
                </div>
                <p className="text-sm text-gray-600">
                  Value-add email with free lead generation checklist
                </p>
                <Badge variant="secondary" className="mt-2 text-xs">
                  Template 6
                </Badge>
              </div>

              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Mail className="w-4 h-4 text-red-500" />
                  <h4 className="font-medium">Called Seven Times</h4>
                </div>
                <p className="text-sm text-gray-600">
                  Humorous breakup email - final attempt with personality
                </p>
                <Badge variant="secondary" className="mt-2 text-xs">
                  Template 7
                </Badge>
              </div>
            </div>
          </div>

          {/* Automated Features */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">✨ Automated Features</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium text-green-700">✅ What Happens Automatically:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Email sent when lead moved to calling stage</li>
                  <li>• Personalized with lead name & company</li>
                  <li>• Email history tracked in database</li>
                  <li>• Prevents duplicate emails per stage</li>
                  <li>• Success/failure notifications</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium text-blue-700">🎯 Email Personalization:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• {'{'}{'LEAD_NAME'}{'}'}→ Lead's actual name</li>
                  <li>• {'{'}{'COMPANY_NAME'}{'}'}→ Company name</li>
                  <li>• {'{'}{'SENDER_NAME'}{'}'}→ Your name</li>
                  <li>• {'{'}{'SENDER_EMAIL'}{'}'}→ Your Gmail</li>
                  <li>• Professional HTML templates</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Test Email Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">🧪 Test Email System</h3>
            
            <div className="border rounded-lg p-4 bg-yellow-50">
              <h4 className="font-medium text-yellow-800 mb-3">Send Test Email</h4>
              <p className="text-sm text-yellow-700 mb-4">
                Test your email configuration by sending a sample CRM email to yourself.
              </p>
              
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="Enter your test email address"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="flex-1"
                />
                <Button 
                  onClick={sendTestEmail}
                  disabled={sendingTest || !testEmail.trim() || connectionStatus !== 'success'}
                  className="bg-yellow-600 hover:bg-yellow-500"
                >
                  {sendingTest ? 'Sending...' : 'Send Test'}
                </Button>
              </div>
              
              {connectionStatus !== 'success' && (
                <p className="text-xs text-yellow-600 mt-2">
                  ⚠️ Fix SMTP connection first before sending test emails
                </p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button 
              onClick={testConnection}
              disabled={testing}
              className="bg-blue-600 hover:bg-blue-500"
            >
              {testing ? 'Testing...' : 'Test SMTP Connection'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailConfig; 