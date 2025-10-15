"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { auth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { 
  Eye, 
  EyeOff, 
  Mail, 
  Lock, 
  User,
  Shield,
  Users,
  Settings,
  Save,
  CheckCircle,
  XCircle,
  RefreshCw,
  Key,
  Server,
  Send
} from "lucide-react";
import { useTranslations } from '@/hooks/use-translations';

interface User {
  _id: string;
  username: string;
  email: string;
  verified: boolean;
  admin: boolean;
  createdAt: string;
}

interface AccountForm {
  email: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function AccountSettingsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [updatingEmail, setUpdatingEmail] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Credentials state
  const [credentials, setCredentials] = useState({
    SERPAPI_KEY: "",
    OPENAI_API_KEY: "",
    SMTP_HOST: "",
    SMTP_PORT: "",
    SMTP_USER: "",
    SMTP_PASSWORD: "",
    IMAP_HOST: "",
    IMAP_PORT: "",
    IMAP_USER: "",
    IMAP_PASSWORD: "",
    ZOOM_EMAIL: "",
    ZOOM_PASSWORD: "",
    ZOOM_ACCOUNT_ID: "",
    ZOOM_CLIENT_ID: "",
    ZOOM_CLIENT_SECRET: "",
    GOOGLE_SERVICE_ACCOUNT_EMAIL: "",
    GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: "",
    GOOGLE_CALENDAR_ID: "",
  });
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [savingCredentials, setSavingCredentials] = useState(false);
  const [loadingCredentials, setLoadingCredentials] = useState(false);
  const [importing, setImporting] = useState(false);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  
  // SMTP Testing state
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [smtpTestStatus, setSmtpTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [smtpTestError, setSmtpTestError] = useState('');
  const [testRecipient, setTestRecipient] = useState('');

  const [emailForm, setEmailForm] = useState({
    email: "",
    password: ""
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const { t } = useTranslations();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const user = await auth.getCurrentUserFromDB();
        if (!user) {
          toast.error("Please login to access account settings");
          router.push("/login");
          return;
        }
        setCurrentUser(user);

        if (user.admin) {
          fetchUsers();
        }
        // Load credentials for all users, not just admins
        void loadCredentials();
      } catch (error) {
        console.error('Error fetching user data:', error);
        toast.error("Failed to load user data");
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [router]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      const data = await response.json();
      
      if (response.ok) {
        setUsers(data.users);
      } else {
        toast.error("Failed to fetch users");
      }
    } catch (error) {
      toast.error("Failed to fetch users");
    }
  };

  const loadCredentials = async () => {
    try {
      setLoadingCredentials(true);
      const authHeader = auth.getAuthHeader();
      const res = await fetch('/api/credentials', {
        headers: authHeader ? { Authorization: authHeader } : undefined,
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCredentials((prev) => ({ ...prev, ...(data.credentials || {}) }));
      } else {
        toast.error(data.error || 'Failed to load credentials');
      }
    } catch (err) {
      toast.error('Failed to load credentials');
    } finally {
      setLoadingCredentials(false);
    }
  };

  const saveCredentials = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      setSavingCredentials(true);
      const authHeader = auth.getAuthHeader();
      const res = await fetch('/api/credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
        body: JSON.stringify({ credentials }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Credentials saved');
      } else {
        toast.error(data.error || 'Failed to save credentials');
      }
    } catch (err) {
      toast.error('Failed to save credentials');
    } finally {
      setSavingCredentials(false);
    }
  };

  // Export credentials to JSON
  const exportCredentialsJSON = () => {
    const data = JSON.stringify(credentials, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const filename = 'credentials-export.json';
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Credentials exported as JSON');
  };

  // Import credentials from JSON
  const onImportFile = async (file: File) => {
    try {
      setImporting(true);
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed || typeof parsed !== 'object') {
        toast.error('Invalid JSON');
        return;
      }
      // Only accept known keys
      const allowedKeys = [
        'SERPAPI_KEY','OPENAI_API_KEY','SMTP_HOST','SMTP_PORT','SMTP_USER','SMTP_PASSWORD',
        'IMAP_HOST','IMAP_PORT','IMAP_USER','IMAP_PASSWORD','ZOOM_EMAIL','ZOOM_PASSWORD',
        'ZOOM_ACCOUNT_ID','ZOOM_CLIENT_ID','ZOOM_CLIENT_SECRET'
      ];
      const nextCreds: any = { ...credentials };
      for (const key of allowedKeys) {
        if (Object.prototype.hasOwnProperty.call(parsed, key)) {
          nextCreds[key] = String(parsed[key] ?? '');
        }
      }
      setCredentials(nextCreds);
      toast.success('Credentials loaded from JSON (click Save to persist)');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to import JSON');
    } finally {
      setImporting(false);
    }
  };

  // Test SMTP connection
  const testSmtpConnection = async () => {
    // Validate SMTP settings
    if (!credentials.SMTP_HOST || !credentials.SMTP_PORT || !credentials.SMTP_USER || !credentials.SMTP_PASSWORD) {
      toast.error("Please fill in all SMTP fields");
      return;
    }
    
    // If no test recipient provided, default to the SMTP user
    const emailRecipient = testRecipient.trim() || credentials.SMTP_USER;

    setTestingSmtp(true);
    setSmtpTestStatus('testing');
    setSmtpTestError('');

    try {
      const response = await fetch('/api/test-smtp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          smtpHost: credentials.SMTP_HOST,
          smtpPort: credentials.SMTP_PORT,
          smtpUser: credentials.SMTP_USER,
          smtpPassword: credentials.SMTP_PASSWORD,
          testRecipient: emailRecipient,
          saveCredentials: true
        })
      });

      const data = await response.json();

      if (data.success) {
        setSmtpTestStatus('success');
        toast.success("SMTP connection successful! Test email sent.");
      } else {
        setSmtpTestStatus('error');
        setSmtpTestError(data.error || "Failed to connect to SMTP server");
        toast.error(`SMTP test failed: ${data.error}`);
      }
    } catch (error: any) {
      setSmtpTestStatus('error');
      setSmtpTestError(error.message || "An unknown error occurred");
      toast.error(`Error: ${error.message || "Failed to test SMTP"}`);
    } finally {
      setTestingSmtp(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchUsers();
      toast.success("User data refreshed successfully!");
    } catch (error) {
      toast.error("Failed to refresh user data");
    } finally {
      setRefreshing(false);
    }
  };

  const verifyUser = async (userId: string, verified: boolean) => {
    setVerifying(userId);
    
    try {
      const response = await fetch('/api/admin/verify-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          userId, 
          action: verified ? 'verify' : 'reject' 
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message);
        // Refresh the user list
        await fetchUsers();
      } else {
        toast.error(data.error || "Failed to update user");
      }
    } catch (error) {
      toast.error("Failed to update user");
    } finally {
      setVerifying(null);
    }
  };

  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!emailForm.email || !emailForm.password) {
      toast.error("Please fill in all fields");
      return;
    }

    if (!emailForm.email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }

    setUpdatingEmail(true);

    try {
      const authHeader = auth.getAuthHeader();
      const response = await fetch('/api/account/change-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
        body: JSON.stringify({
          newEmail: emailForm.email,
          currentPassword: emailForm.password,
        }),
      });
      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Email updated successfully');
        auth.updateSessionEmail(emailForm.email);
        setCurrentUser((prev: any) => ({ ...prev, email: emailForm.email }));
        setEmailForm({ email: '', password: '' });
      } else {
        toast.error(data.error || 'Failed to update email');
      }
    } catch (error) {
      toast.error("Failed to update email");
    } finally {
      setUpdatingEmail(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast.error("Please fill in all fields");
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast.error("New password must be at least 6 characters long");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    setUpdatingPassword(true);

    try {
      const authHeader = auth.getAuthHeader();
      const response = await fetch('/api/account/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Password updated successfully');
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        toast.error(data.error || 'Failed to update password');
      }
    } catch (error) {
      toast.error("Failed to update password");
    } finally {
      setUpdatingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('accountSettings')}</h1>
          <p className="text-muted-foreground">{t('accountSettingsSubtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => router.push('/credentials')}>
            How To Get Credentials
          </Button>
        </div>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-4">
          <TabsTrigger value="profile">{t('profile')}</TabsTrigger>
          <TabsTrigger value="security">{t('security')}</TabsTrigger>
          {currentUser?.admin && (
            <TabsTrigger value="admin">{t('adminPanel')}</TabsTrigger>
          )}
          <TabsTrigger value="credentials">{t('credentials')}</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {t('profileInformation')}
              </CardTitle>
              <CardDescription>
                {t('profileInformationDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">{t('usernameLabel')}</Label>
                  <p className="text-sm text-muted-foreground mt-1">{currentUser?.username}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">{t('email')}</Label>
                  <p className="text-sm text-muted-foreground mt-1">{currentUser?.email}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">{t('accountType')}</Label>
                  <div className="flex items-center gap-2 mt-1">
                    {currentUser?.admin && (
                      <Badge variant="secondary">Admin</Badge>
                    )}
                    <Badge variant={currentUser?.verified ? "default" : "destructive"}>
                      {currentUser?.verified ? t('verifiedLabel') : t('unverifiedLabel')}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">{t('memberSince')}</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {new Date().toLocaleDateString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          {/* Email Change */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                {t('changeEmail')}
              </CardTitle>
              <CardDescription>
                {t('changeEmailDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleEmailChange} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newEmail">{t('newEmailAddress')}</Label>
                  <Input
                    id="newEmail"
                    type="email"
                    placeholder={t('newEmailAddress') as string}
                    value={emailForm.email}
                    onChange={(e) => setEmailForm(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emailPassword">{t('currentPasswordLabel')}</Label>
                  <div className="relative">
                    <Input
                      id="emailPassword"
                      type={showCurrentPassword ? "text" : "password"}
                      placeholder={t('currentPasswordLabel') as string}
                      value={emailForm.password}
                      onChange={(e) => setEmailForm(prev => ({ ...prev, password: e.target.value }))}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" disabled={updatingEmail}>
                  {updatingEmail ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      {t('loading')}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Save className="h-4 w-4" />
                      {t('updateEmail')}
                    </div>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Separator />

          {/* Password Change */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                {t('changePassword')}
              </CardTitle>
              <CardDescription>
                {t('changePasswordDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">{t('currentPasswordLabel')}</Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showCurrentPassword ? "text" : "password"}
                      placeholder={t('currentPasswordLabel') as string}
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">{t('newPasswordLabel')}</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      placeholder={t('newPasswordLabel') as string}
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">{t('confirmNewPasswordLabel')}</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder={t('confirmNewPasswordLabel') as string}
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" disabled={updatingPassword}>
                  {updatingPassword ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      {t('loading')}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      {t('updatePassword')}
                    </div>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

                 {currentUser?.admin && (
           <TabsContent value="admin" className="space-y-6">
             <Card>
               <CardHeader>
                 <div className="flex items-center justify-between">
                   <div>
                     <CardTitle className="flex items-center gap-2">
                       <Users className="h-5 w-5" />
                       {t('userManagement')}
                     </CardTitle>
                      <CardDescription>
                        {t('userManagementDescription')}
                      </CardDescription>
                   </div>
                   <Button
                     onClick={handleRefresh}
                     disabled={refreshing}
                     variant="outline"
                     size="sm"
                   >
                     {refreshing ? (
                       <div className="flex items-center gap-2">
                         <RefreshCw className="h-4 w-4 animate-spin" />
                          {t('loading')}
                       </div>
                     ) : (
                       <div className="flex items-center gap-2">
                         <RefreshCw className="h-4 w-4" />
                          {t('refresh')}
                       </div>
                     )}
                   </Button>
                 </div>
               </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {users.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">{t('noUsersFound')}</p>
                  ) : (
                    users.map((user) => (
                      <div
                        key={user._id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-medium">{user.username}</h3>
                            {user.admin && (
                              <Badge variant="secondary">Admin</Badge>
                            )}
                            <Badge variant={user.verified ? "default" : "destructive"}>
                              {user.verified ? "Verified" : "Unverified"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                          <p className="text-xs text-muted-foreground">
                             {t('joined')}: {new Date(user.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        
                        <div className="flex space-x-2">
                          {!user.verified ? (
                            <Button
                              size="sm"
                              onClick={() => verifyUser(user._id, true)}
                              disabled={verifying === user._id}
                            >
                              {verifying === user._id ? (
                                <div className="flex items-center gap-2">
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                   {t('loading')}
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <CheckCircle className="h-3 w-3" />
                                   {t('verify')}
                                </div>
                              )}
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => verifyUser(user._id, false)}
                              disabled={verifying === user._id}
                            >
                              {verifying === user._id ? (
                                <div className="flex items-center gap-2">
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
                                   {t('loading')}
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <XCircle className="h-3 w-3" />
                                   {t('unverify')}
                                </div>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="credentials" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                {t('credentialsTitle')}
              </CardTitle>
              <CardDescription>
                {currentUser?.admin 
                  ? t('credentialsDescriptionAdmin')
                  : t('credentialsDescriptionUser')
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={saveCredentials} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="SERPAPI_KEY">SERPAPI_KEY</Label>
                    <div className="relative">
                      <Input
                        id="SERPAPI_KEY"
                        type={showSecrets.SERPAPI_KEY ? 'text' : 'password'}
                        placeholder="Enter SERPAPI key"
                        value={credentials.SERPAPI_KEY}
                        onChange={(e) => setCredentials({ ...credentials, SERPAPI_KEY: e.target.value })}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        onClick={() => setShowSecrets({ ...showSecrets, SERPAPI_KEY: !showSecrets.SERPAPI_KEY })}
                      >
                        {showSecrets.SERPAPI_KEY ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="OPENAI_API_KEY">OPENAI_API_KEY</Label>
                    <div className="relative">
                      <Input
                        id="OPENAI_API_KEY"
                        type={showSecrets.OPENAI_API_KEY ? 'text' : 'password'}
                        placeholder="Enter OpenAI API key"
                        value={credentials.OPENAI_API_KEY}
                        onChange={(e) => setCredentials({ ...credentials, OPENAI_API_KEY: e.target.value })}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        onClick={() => setShowSecrets({ ...showSecrets, OPENAI_API_KEY: !showSecrets.OPENAI_API_KEY })}
                      >
                        {showSecrets.OPENAI_API_KEY ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Server className="h-4 w-4" />
                    SMTP Settings
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="SMTP_HOST">SMTP_HOST</Label>
                      <Input id="SMTP_HOST" value={credentials.SMTP_HOST} onChange={(e) => setCredentials({ ...credentials, SMTP_HOST: e.target.value })} placeholder="smtp.example.com" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="SMTP_PORT">SMTP_PORT</Label>
                      <Input id="SMTP_PORT" value={credentials.SMTP_PORT} onChange={(e) => setCredentials({ ...credentials, SMTP_PORT: e.target.value })} placeholder="587" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="SMTP_USER">SMTP_USER</Label>
                      <Input id="SMTP_USER" value={credentials.SMTP_USER} onChange={(e) => setCredentials({ ...credentials, SMTP_USER: e.target.value })} placeholder="user@example.com" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="SMTP_PASSWORD">SMTP_PASSWORD</Label>
                      <div className="relative">
                        <Input
                          id="SMTP_PASSWORD"
                          type={showSecrets.SMTP_PASSWORD ? 'text' : 'password'}
                          value={credentials.SMTP_PASSWORD}
                          onChange={(e) => setCredentials({ ...credentials, SMTP_PASSWORD: e.target.value })}
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                          onClick={() => setShowSecrets({ ...showSecrets, SMTP_PASSWORD: !showSecrets.SMTP_PASSWORD })}
                        >
                          {showSecrets.SMTP_PASSWORD ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* SMTP Test Section */}
                  <div className="mt-4 border border-gray-200 dark:border-gray-800 rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Send className="h-4 w-4" />
                        Test SMTP Connection
                      </div>
                      <Button 
                        onClick={testSmtpConnection}
                        disabled={testingSmtp}
                        variant={smtpTestStatus === 'success' ? 'default' : 'outline'}
                        size="sm"
                      >
                        {testingSmtp ? (
                          <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
                            Testing...
                          </div>
                        ) : (
                          "Test SMTP"
                        )}
                      </Button>
                    </div>
                    
                    {/* Test Email Recipient Input */}
                    <div className="mt-3 mb-3">
                      <Label htmlFor="testEmailRecipient" className="text-xs text-muted-foreground mb-1 block">Send test email to (optional):</Label>
                      <div className="flex gap-2">
                        <Input
                          id="testEmailRecipient"
                          type="email"
                          placeholder="recipient@example.com"
                          value={testRecipient}
                          onChange={(e) => setTestRecipient(e.target.value)}
                          className="text-sm"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Leave empty to send to the SMTP username</p>
                    </div>
                    
                    {smtpTestStatus === 'success' && (
                      <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-500 bg-green-50 dark:bg-green-900/30 p-2 rounded border border-green-100 dark:border-green-900">
                        <CheckCircle className="h-4 w-4" />
                        Connected! Test email sent successfully.
                      </div>
                    )}
                    
                    {smtpTestStatus === 'error' && (
                      <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-500 bg-red-50 dark:bg-red-900/30 p-2 rounded border border-red-100 dark:border-red-900">
                        <XCircle className="h-4 w-4" />
                        Not connected: {smtpTestError}
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Server className="h-4 w-4" />
                    Google Calendar (Service Account)
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2 md:col-span-1">
                      <Label htmlFor="GOOGLE_SERVICE_ACCOUNT_EMAIL">GOOGLE_SERVICE_ACCOUNT_EMAIL</Label>
                      <Input id="GOOGLE_SERVICE_ACCOUNT_EMAIL" value={credentials.GOOGLE_SERVICE_ACCOUNT_EMAIL} onChange={(e) => setCredentials({ ...credentials, GOOGLE_SERVICE_ACCOUNT_EMAIL: e.target.value })} placeholder="service-account@project.iam.gserviceaccount.com" />
                    </div>
                    <div className="space-y-2 md:col-span-1">
                      <Label htmlFor="GOOGLE_CALENDAR_ID">GOOGLE_CALENDAR_ID</Label>
                      <Input id="GOOGLE_CALENDAR_ID" value={credentials.GOOGLE_CALENDAR_ID} onChange={(e) => setCredentials({ ...credentials, GOOGLE_CALENDAR_ID: e.target.value })} placeholder="your-calendar-id@gmail.com" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY">GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY</Label>
                      <div className="relative">
                        <Input
                          id="GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY"
                          type={showSecrets.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ? 'text' : 'password'}
                          value={credentials.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY}
                          onChange={(e) => setCredentials({ ...credentials, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: e.target.value })}
                          placeholder="-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----"
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                          onClick={() => setShowSecrets({ ...showSecrets, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: !showSecrets.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY })}
                        >
                          {showSecrets.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">Grant the service account access to the target calendar in Google Calendar settings.</p>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Server className="h-4 w-4" />
                    IMAP Settings
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="IMAP_HOST">IMAP_HOST</Label>
                      <Input id="IMAP_HOST" value={credentials.IMAP_HOST} onChange={(e) => setCredentials({ ...credentials, IMAP_HOST: e.target.value })} placeholder="imap.example.com" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="IMAP_PORT">IMAP_PORT</Label>
                      <Input id="IMAP_PORT" value={credentials.IMAP_PORT} onChange={(e) => setCredentials({ ...credentials, IMAP_PORT: e.target.value })} placeholder="993" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="IMAP_USER">IMAP_USER</Label>
                      <Input id="IMAP_USER" value={credentials.IMAP_USER} onChange={(e) => setCredentials({ ...credentials, IMAP_USER: e.target.value })} placeholder="user@example.com" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="IMAP_PASSWORD">IMAP_PASSWORD</Label>
                      <div className="relative">
                        <Input
                          id="IMAP_PASSWORD"
                          type={showSecrets.IMAP_PASSWORD ? 'text' : 'password'}
                          value={credentials.IMAP_PASSWORD}
                          onChange={(e) => setCredentials({ ...credentials, IMAP_PASSWORD: e.target.value })}
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                          onClick={() => setShowSecrets({ ...showSecrets, IMAP_PASSWORD: !showSecrets.IMAP_PASSWORD })}
                        >
                          {showSecrets.IMAP_PASSWORD ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Lock className="h-4 w-4" />
                    Zoom Credentials
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="ZOOM_EMAIL">ZOOM_EMAIL</Label>
                      <Input id="ZOOM_EMAIL" value={credentials.ZOOM_EMAIL} onChange={(e) => setCredentials({ ...credentials, ZOOM_EMAIL: e.target.value })} placeholder="zoom-user@example.com" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ZOOM_PASSWORD">ZOOM_PASSWORD</Label>
                      <div className="relative">
                        <Input
                          id="ZOOM_PASSWORD"
                          type={showSecrets.ZOOM_PASSWORD ? 'text' : 'password'}
                          value={credentials.ZOOM_PASSWORD}
                          onChange={(e) => setCredentials({ ...credentials, ZOOM_PASSWORD: e.target.value })}
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                          onClick={() => setShowSecrets({ ...showSecrets, ZOOM_PASSWORD: !showSecrets.ZOOM_PASSWORD })}
                        >
                          {showSecrets.ZOOM_PASSWORD ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ZOOM_ACCOUNT_ID">ZOOM_ACCOUNT_ID</Label>
                      <Input id="ZOOM_ACCOUNT_ID" value={credentials.ZOOM_ACCOUNT_ID} onChange={(e) => setCredentials({ ...credentials, ZOOM_ACCOUNT_ID: e.target.value })} placeholder="account id" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ZOOM_CLIENT_ID">ZOOM_CLIENT_ID</Label>
                      <Input id="ZOOM_CLIENT_ID" value={credentials.ZOOM_CLIENT_ID} onChange={(e) => setCredentials({ ...credentials, ZOOM_CLIENT_ID: e.target.value })} placeholder="client id" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ZOOM_CLIENT_SECRET">ZOOM_CLIENT_SECRET</Label>
                      <div className="relative">
                        <Input
                          id="ZOOM_CLIENT_SECRET"
                          type={showSecrets.ZOOM_CLIENT_SECRET ? 'text' : 'password'}
                          value={credentials.ZOOM_CLIENT_SECRET}
                          onChange={(e) => setCredentials({ ...credentials, ZOOM_CLIENT_SECRET: e.target.value })}
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                          onClick={() => setShowSecrets({ ...showSecrets, ZOOM_CLIENT_SECRET: !showSecrets.ZOOM_CLIENT_SECRET })}
                        >
                          {showSecrets.ZOOM_CLIENT_SECRET ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" onClick={exportCredentialsJSON}>
                      Export JSON
                    </Button>
                    <input
                      ref={importInputRef}
                      type="file"
                      accept=".json,application/json"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) onImportFile(file);
                        if (importInputRef.current) importInputRef.current.value = '';
                      }}
                    />
                    <Button type="button" variant="outline" disabled={importing} onClick={() => importInputRef.current?.click()}>
                      {importing ? 'Importing...' : 'Import JSON'}
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" onClick={loadCredentials} disabled={loadingCredentials}>
                      {loadingCredentials ? 'Loading...' : 'Reload'}
                    </Button>
                    <Button type="submit" disabled={savingCredentials}>
                      {savingCredentials ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Saving...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Save className="h-4 w-4" />
                          Save Credentials
                        </div>
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 