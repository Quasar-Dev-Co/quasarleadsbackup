"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "lucide-react";
import { useTranslations } from "@/hooks/use-translations";

interface CalendlyIntegrationProps {
  calendlyUrl: string;
  setCalendlyUrl: (url: string) => void;
}

const CalendlyIntegration = ({
  calendlyUrl,
  setCalendlyUrl,
}: CalendlyIntegrationProps) => {
  const { toast } = useToast();
  const { t } = useTranslations();
  
  const handleSaveCalendlyUrl = () => {
    toast({
      title: String(t("calendlyIntegrationUpdated")),
      description: String(t("calendlyWebhookSaved")),
    });
  };

  const handleTestWebhook = () => {
    if (!calendlyUrl) {
      toast({
        title: String(t("error")),
        description: String(t("enterCalendlyUrlFirst")),
        // @ts-ignore
        variant: "destructive",
      });
      return;
    }
    
    toast({
      title: String(t("testWebhookSent")),
      description: String(t("testNotificationSent")),
    });
  };

  return (
    <div className="space-y-6">
      <Card className="bg-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {String(t("calendlyIntegration"))}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            {String(t("calendlyIntegrationDescription"))}
          </p>
          
          <div className="space-y-2">
            <Label htmlFor="calendlyWebhook">{String(t("calendlyWebhookUrl"))}</Label>
            <Input
              id="calendlyWebhook"
              placeholder={String(t("calendlyWebhookPlaceholder"))}
              value={calendlyUrl}
              onChange={(e) => setCalendlyUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {String(t("calendlyWebhookInstructions"))}
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              className="sm:flex-1"
              onClick={handleTestWebhook}
              disabled={!calendlyUrl}
            >
              {String(t("testConnection"))}
            </Button>
            <Button 
              className="sm:flex-1 bg-fuchsia-600 hover:bg-fuchsia-500" 
              onClick={handleSaveCalendlyUrl}
              disabled={!calendlyUrl}
            >
              {String(t("saveConnection"))}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-card">
        <CardHeader>
          <CardTitle className="text-lg">{String(t("zapierIntegration"))}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            {String(t("zapierAlternativeDescription"))}
          </p>
          
          <div className="space-y-2">
            <Label htmlFor="zapierWebhook">{String(t("zapierWebhookUrl"))}</Label>
            <Input
              id="zapierWebhook"
              placeholder={String(t("zapierWebhookPlaceholder"))}
            />
            <p className="text-xs text-muted-foreground">
              {String(t("zapierWebhookInstructions"))}
            </p>
          </div>
          
          <div className="bg-muted/30 p-3 rounded-md border text-sm space-y-2">
            <p className="font-medium">{String(t("zapierSetupGuide"))}</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>{String(t("createNewZap"))}</li>
              <li>{String(t("selectCalendlyTrigger"))}</li>
              <li>{String(t("chooseScheduledMeeting"))}</li>
              <li>{String(t("connectCalendlyAccount"))}</li>
              <li>{String(t("useWebhookAction"))}</li>
              <li>{String(t("copyWebhookUrl"))}</li>
            </ol>
          </div>
          
          <Button variant="outline" className="w-full">
            {String(t("setupZapierIntegration"))}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default CalendlyIntegration;