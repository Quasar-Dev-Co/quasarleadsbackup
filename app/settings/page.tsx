"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { SectionHeader } from "@/components/ui/section-header";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/hooks/use-translations";
import toast from "react-hot-toast";
import { auth } from "@/lib/auth";

const Settings = () => {
    const { t } = useTranslations();
    
    const [aiResponsiveness, setAIResponsiveness] = useState(true);
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [emailNotifications, setEmailNotifications] = useState(true);
    const [apiKey, setApiKey] = useState("");
    const [companyName, setCompanyName] = useState("");
    const [companyWebsite, setCompanyWebsite] = useState("");

    // SMTP Settings
    const [smtpHost, setSmtpHost] = useState("");
    const [smtpPort, setSmtpPort] = useState("587");
    const [smtpUser, setSmtpUser] = useState("");
    const [smtpPassword, setSmtpPassword] = useState("");
    const [showSmtpPassword, setShowSmtpPassword] = useState(false);
    const [testingSmtp, setTestingSmtp] = useState(false);
    const [smtpStatus, setSmtpStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
    const [smtpError, setSmtpError] = useState("");

    // Load user credentials from API (no next-auth)
    useEffect(() => {
        const loadCredentials = async () => {
            try {
                const authHeader = auth.getAuthHeader();
                const res = await fetch('/api/credentials', {
                    headers: authHeader ? { Authorization: authHeader } : undefined,
                });
                const data = await res.json();
                const creds = data?.credentials || {};
                if (res.ok && data.success) {
                    if (creds.SMTP_HOST) setSmtpHost(creds.SMTP_HOST);
                    if (creds.SMTP_PORT) setSmtpPort(creds.SMTP_PORT);
                    if (creds.SMTP_USER) setSmtpUser(creds.SMTP_USER);
                    if (creds.SMTP_PASSWORD) setSmtpPassword(creds.SMTP_PASSWORD);
                }
            } catch (e) {
                // silently ignore
            }
        };
        loadCredentials();
    }, []);

    const handleSaveSettings = () => {
        toast.success("settingsSaved");
    };

    const handleTestSmtp = async () => {
        // Validate SMTP settings
        if (!smtpHost || !smtpPort || !smtpUser || !smtpPassword) {
            toast.error("Please fill all SMTP fields");
            return;
        }

        setTestingSmtp(true);
        setSmtpStatus('testing');
        setSmtpError("");

        try {
            const response = await fetch('/api/test-smtp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    smtpHost,
                    smtpPort,
                    smtpUser,
                    smtpPassword,
                    saveCredentials: true
                })
            });

            const data = await response.json();

            if (data.success) {
                setSmtpStatus('success');
                toast.success("SMTP connection successful! Test email sent.");
            } else {
                setSmtpStatus('error');
                setSmtpError(data.error || "Failed to connect to SMTP server");
                toast.error(`SMTP test failed: ${data.error}`);
            }
        } catch (error: any) {
            setSmtpStatus('error');
            setSmtpError(error.message || "An unknown error occurred");
            toast.error(`Error: ${error.message || "Failed to test SMTP"}`);
        } finally {
            setTestingSmtp(false);
        }
    };

    return (
        <div className="animate-in">
            <SectionHeader
                title={String(t("settingsTitle"))}
                description={String(t("settingsDescription"))}
                action={
                    <Button onClick={handleSaveSettings} className="bg-fuchsia-600 text-white">
                        {String(t("saveChanges"))}
                    </Button>
                }
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <Card className="bg-card">
                    <CardHeader>
                        <CardTitle>{String(t("companyInformation"))}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label htmlFor="companyName">{String(t("companyName"))}</Label>
                            <Input
                                id="companyName"
                                value={companyName}
                                onChange={(e) => setCompanyName(e.target.value)}
                                placeholder={String(t("yourCompanyName"))}
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <Label htmlFor="companyWebsite">{String(t("companyWebsite"))}</Label>
                            <Input
                                id="companyWebsite"
                                value={companyWebsite}
                                onChange={(e) => setCompanyWebsite(e.target.value)}
                                placeholder={String(t("companyWebsitePlaceholder"))}
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <Label htmlFor="apiKey">{String(t("apiKey"))}</Label>
                            <Input
                                id="apiKey"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                type="password"
                                placeholder={String(t("enterApiKey"))}
                                className="mt-1"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                {String(t("apiKeyDescription"))}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-card">
                    <CardHeader>
                        <CardTitle>{String(t("aiSettings"))}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <Label htmlFor="aiResponsiveness" className="block mb-1">
                                    {String(t("aiAutoResponse"))}
                                </Label>
                                <p className="text-sm text-muted-foreground">
                                    {String(t("aiAutoResponseDescription"))}
                                </p>
                            </div>
                            <Switch
                                id="aiResponsiveness"
                                checked={aiResponsiveness}
                                onCheckedChange={setAIResponsiveness}
                                className={cn(
                                    "data-[state=checked]:bg-fuchsia-600", // track color when checked
                                    "bg-gray-300", // track color when unchecked
                                )}
                            />
                        </div>

                        <Separator />

                        <div className="flex items-center justify-between">
                            <div>
                                <Label htmlFor="notificationsEnabled" className="block mb-1">
                                    {String(t("dashboardNotifications"))}
                                </Label>
                                <p className="text-sm text-muted-foreground">
                                    {String(t("realTimeNotifications"))}
                                </p>
                            </div>
                            <Switch
                                id="notificationsEnabled"
                                checked={notificationsEnabled}
                                onCheckedChange={setNotificationsEnabled}
                                className={cn(
                                    "data-[state=checked]:bg-fuchsia-600", // track color when checked
                                    "bg-gray-300", // track color when unchecked
                                )}
                            />
                        </div>

                        <Separator />

                        <div className="flex items-center justify-between">
                            <div>
                                <Label htmlFor="emailNotifications" className="block mb-1">
                                    {String(t("emailNotifications"))}
                                </Label>
                                <p className="text-sm text-muted-foreground">
                                    {String(t("receiveEmailNotifications"))}
                                </p>
                            </div>
                            <Switch
                                id="emailNotifications"
                                checked={emailNotifications}
                                onCheckedChange={setEmailNotifications}
                                className={cn(
                                    "data-[state=checked]:bg-fuchsia-600", // track color when checked
                                    "bg-gray-300", // track color when unchecked
                                )}
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="bg-card mt-6">
                <CardHeader>
                    <CardTitle>{String(t("emailSettings")) || "Email Settings"}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="smtpHost">SMTP Host</Label>
                        <Input
                            id="smtpHost"
                            value={smtpHost}
                            onChange={(e) => setSmtpHost(e.target.value)}
                            placeholder="smtp.example.com"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="smtpPort">SMTP Port</Label>
                        <Input
                            id="smtpPort"
                            value={smtpPort}
                            onChange={(e) => setSmtpPort(e.target.value)}
                            placeholder="587"
                        />
                        <p className="text-xs text-muted-foreground">
                            Common ports: 587 (TLS), 465 (SSL), 25 (unsecured)
                        </p>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="smtpUser">SMTP Username</Label>
                        <Input
                            id="smtpUser"
                            value={smtpUser}
                            onChange={(e) => setSmtpUser(e.target.value)}
                            placeholder="user@example.com"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="smtpPassword">SMTP Password</Label>
                        <div className="relative">
                            <Input
                                id="smtpPassword"
                                type={showSmtpPassword ? "text" : "password"}
                                value={smtpPassword}
                                onChange={(e) => setSmtpPassword(e.target.value)}
                                placeholder="••••••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm"
                            >
                                {showSmtpPassword ? "Hide" : "Show"}
                            </button>
                        </div>
                    </div>
                    <div className="mt-4">
                        <Button 
                            onClick={handleTestSmtp}
                            disabled={testingSmtp}
                            className={`w-full md:w-auto ${smtpStatus === 'success' ? 'bg-green-600' : 'hover:bg-fuchsia-600'} hover:text-white`}
                        >
                            {testingSmtp ? "Testing..." : "Test SMTP Connection"}
                        </Button>
                        
                        {smtpStatus === 'success' && (
                            <p className="text-green-500 text-sm mt-2">Connected! Test email sent successfully.</p>
                        )}
                        
                        {smtpStatus === 'error' && (
                            <p className="text-red-500 text-sm mt-2">
                                Not connected: {smtpError}
                            </p>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-card mt-6">
                <CardHeader>
                    <CardTitle>{String(t("advancedSettings"))}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <Label htmlFor="dataExport">{String(t("exportData"))}</Label>
                            <div className="mt-1">
                                <Button className="w-full md:w-auto hover:text-white hover:bg-fuchsia-600 cursor-pointer bg-transparent border text-white">
                                    {String(t("exportLeadsCSV"))}
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {String(t("downloadLeadsCSV"))}
                            </p>
                        </div>
                        <div>
                            <Label htmlFor="accountSettings">{String(t("accountSettings"))}</Label>
                            <div className="mt-1">
                                <Button className="w-full md:w-auto hover:bg-fuchsia-600 hover:text-white cursor-pointer bg-transparent border text-white">
                                    {String(t("manageSubscription"))}
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {String(t("updateSubscriptionPlan"))}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default Settings;