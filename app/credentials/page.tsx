"use client";

import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { setLanguage, LanguageCode } from "@/redux/features/languageSlice";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { SectionHeader } from "@/components/ui/section-header";
import { Globe } from "lucide-react";
import toast from "react-hot-toast";

interface StepSection {
	title: string;
	steps: string[];
	vars?: Array<{ name: string; example?: string }>;
	links?: Array<{ label: string; href: string }>;
}

export default function CredentialsGuidePage() {
	const dispatch = useDispatch();
	const currentLanguage = useSelector((s: RootState) => s.language.currentLanguage);

	const content: Record<LanguageCode, { pageTitle: string; pageDesc: string; sections: StepSection[]; fieldsLabel: string; copyLabel: string; linksLabel: string }> = {
		en: {
			pageTitle: "Credentials Setup",
			pageDesc: "Enter your personal credentials under Account Settings → Credentials. Follow the steps below to obtain each credential.",
			fieldsLabel: "Fields to fill in Account Settings → Credentials",
			copyLabel: "Copy",
			linksLabel: "Helpful links",
			sections: [
				{
					title: "Where to enter credentials",
					steps: [
						"Open Account Settings",
						"Go to the Credentials tab",
						"Paste each value in the matching field and click Save"
					]
				},
				{
					title: "SERPAPI (SERPAPI_KEY)",
					steps: [
						"Create an account on serpapi.com",
						"Go to Dashboard → API Key",
						"Copy your key and store it securely"
					],
					vars: [{ name: "SERPAPI_KEY" }],
					links: [
						{ label: "SerpAPI", href: "https://serpapi.com/" }
					]
				},
				{
					title: "OpenAI (OPENAI_API_KEY)",
					steps: [
						"Create/Sign in at platform.openai.com",
						"Go to API Keys → Create new secret key",
						"Copy the key and paste in Account Settings → Credentials"
					],
					vars: [{ name: "OPENAI_API_KEY" }],
					links: [
						{ label: "OpenAI Platform", href: "https://platform.openai.com/" },
						{ label: "OpenAI API Keys", href: "https://platform.openai.com/api-keys" }
					]
				},
				{
					title: "SMTP (SMTP_*)",
					steps: [
						"Get SMTP host, port, username and password from your email provider",
						"Use port 465 for secure (SSL) or 587 for STARTTLS",
						"Test sending in Account Settings → Credentials"
					],
					vars: [
						{ name: "SMTP_HOST" },
						{ name: "SMTP_PORT" },
						{ name: "SMTP_USER" },
						{ name: "SMTP_PASSWORD" }
					]
				},
				{
					title: "IMAP (IMAP_*)",
					steps: [
						"Get IMAP host, port, username and password from your email provider",
						"Common ports: 993 (SSL)",
						"Use the same inbox as your SMTP user to sync replies"
					],
					vars: [
						{ name: "IMAP_HOST" },
						{ name: "IMAP_PORT" },
						{ name: "IMAP_USER" },
						{ name: "IMAP_PASSWORD" }
					]
				},
				{
					title: "Zoom (Server-to-Server OAuth)",
					steps: [
						"Go to marketplace.zoom.us → Build App → Server-to-Server OAuth",
						"Create app and enable meeting scopes (meetings:read, meetings:write)",
						"Copy Account ID, Client ID, Client Secret"
					],
					vars: [
						{ name: "ZOOM_ACCOUNT_ID" },
						{ name: "ZOOM_CLIENT_ID" },
						{ name: "ZOOM_CLIENT_SECRET" }
					],
					links: [
						{ label: "Zoom Marketplace", href: "https://marketplace.zoom.us/" },
						{ label: "Create Internal App (Zoom Docs)", href: "https://developers.zoom.us/docs/internal-apps/create/" }
					]
				},
				{
					title: "Google Calendar (Service Account)",
					steps: [
						"In Google Cloud Console: create a project",
						"Create a Service Account and a JSON key",
						"From the JSON, use client_email and private_key",
						"In Google Calendar → Settings → Share the target calendar with the service account email",
						"Use the calendar’s ID (often your Gmail address)",
						"Paste the private key exactly; if needed, keep line breaks or use \\n in place of newlines"
					],
					vars: [
						{ name: "GOOGLE_SERVICE_ACCOUNT_EMAIL" },
						{ name: "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY" },
						{ name: "GOOGLE_CALENDAR_ID" }
					],
					links: [
						{ label: "Google Cloud Console", href: "https://console.cloud.google.com/" },
						{ label: "Service Accounts", href: "https://console.cloud.google.com/iam-admin/serviceaccounts" },
						{ label: "Google Calendar", href: "https://calendar.google.com/" },
						{ label: "Share your calendar (Help)", href: "https://support.google.com/calendar/answer/37082?hl=en" }
					]
				}
			]
		},
		nl: {
			pageTitle: "Credentials Instellen",
			pageDesc: "Vul je persoonlijke credentials in via Account Instellingen → Credentials. Volg de stappen hieronder om elke credential te verkrijgen.",
			fieldsLabel: "Velden om in te vullen in Account Instellingen → Credentials",
			copyLabel: "Kopieer",
			linksLabel: "Nuttige links",
			sections: [
				{
					title: "Waar vul je de credentials in",
					steps: [
						"Open Account Instellingen",
						"Ga naar de tab Credentials",
						"Plak elke waarde in het juiste veld en klik op Opslaan"
					]
				},
				{
					title: "SERPAPI (SERPAPI_KEY)",
					steps: [
						"Maak een account aan op serpapi.com",
						"Ga naar Dashboard → API Key",
						"Kopieer je sleutel en bewaar deze veilig"
					],
					vars: [{ name: "SERPAPI_KEY" }],
					links: [
						{ label: "SerpAPI", href: "https://serpapi.com/" }
					]
				},
				{
					title: "OpenAI (OPENAI_API_KEY)",
					steps: [
						"Log in op platform.openai.com",
						"Ga naar API Keys → Maak een nieuwe geheime sleutel",
						"Kopieer de sleutel en plak in Account Instellingen → Credentials"
					],
					vars: [{ name: "OPENAI_API_KEY" }],
					links: [
						{ label: "OpenAI Platform", href: "https://platform.openai.com/" },
						{ label: "OpenAI API Keys", href: "https://platform.openai.com/api-keys" }
					]
				},
				{
					title: "SMTP (SMTP_*)",
					steps: [
						"Haal SMTP host, poort, gebruikersnaam en wachtwoord op bij je mailprovider",
						"Gebruik poort 465 voor SSL of 587 voor STARTTLS",
						"Test het versturen in Account Instellingen → Credentials"
					],
					vars: [
						{ name: "SMTP_HOST" },
						{ name: "SMTP_PORT" },
						{ name: "SMTP_USER" },
						{ name: "SMTP_PASSWORD" }
					]
				},
				{
					title: "IMAP (IMAP_*)",
					steps: [
						"Haal IMAP host, poort, gebruikersnaam en wachtwoord op bij je mailprovider",
						"Gebruikelijke poort: 993 (SSL)",
						"Gebruik dezelfde inbox als je SMTP-gebruiker om reacties te synchroniseren"
					],
					vars: [
						{ name: "IMAP_HOST" },
						{ name: "IMAP_PORT" },
						{ name: "IMAP_USER" },
						{ name: "IMAP_PASSWORD" }
					]
				},
				{
					title: "Zoom (Server-to-Server OAuth)",
					steps: [
						"Ga naar marketplace.zoom.us → Build App → Server-to-Server OAuth",
						"Maak app en zet meeting-scopes aan (meetings:read, meetings:write)",
						"Kopieer Account ID, Client ID, Client Secret"
					],
					vars: [
						{ name: "ZOOM_ACCOUNT_ID" },
						{ name: "ZOOM_CLIENT_ID" },
						{ name: "ZOOM_CLIENT_SECRET" }
					],
					links: [
						{ label: "Zoom Marketplace", href: "https://marketplace.zoom.us/" },
						{ label: "Interne app maken (Zoom Docs)", href: "https://developers.zoom.us/docs/internal-apps/create/" }
					]
				},
				{
					title: "Google Calendar (Serviceaccount)",
					steps: [
						"In Google Cloud Console: maak een project",
						"Maak een Serviceaccount en een JSON-sleutel",
						"Gebruik uit de JSON: client_email en private_key",
						"In Google Calendar → Instellingen → Deel de agenda met het serviceaccount",
						"Gebruik het agenda-ID (vaak je Gmail-adres)",
						"Plak de private key exact; indien nodig gebruik je \\n in plaats van nieuwe regels"
					],
					vars: [
						{ name: "GOOGLE_SERVICE_ACCOUNT_EMAIL" },
						{ name: "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY" },
						{ name: "GOOGLE_CALENDAR_ID" }
					],
					links: [
						{ label: "Google Cloud Console", href: "https://console.cloud.google.com/" },
						{ label: "Serviceaccounts", href: "https://console.cloud.google.com/iam-admin/serviceaccounts" },
						{ label: "Google Calendar", href: "https://calendar.google.com/" },
						{ label: "Agenda delen (Help)", href: "https://support.google.com/calendar/answer/37082?hl=nl" }
					]
				}
			]
		}
	};

	const { pageTitle, pageDesc, sections } = content[currentLanguage];

	return (
		<div className="min-h-screen w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
			<div className="max-w-6xl mx-auto">
				<div className="flex items-center justify-between mb-6">
					<SectionHeader title={pageTitle} description={pageDesc} />
					<Button
						variant="outline"
						onClick={() => dispatch(setLanguage(currentLanguage === "en" ? "nl" : "en"))}
						className="flex items-center gap-2"
					>
						<Globe className="h-4 w-4" /> {currentLanguage === "en" ? "Nederlands" : "English"}
					</Button>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					{sections.map((sec) => (
						<Card key={sec.title}>
							<CardHeader>
								<CardTitle>{sec.title}</CardTitle>
							</CardHeader>
							<CardContent>
								<ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
									{sec.steps.map((s, idx) => (
										<li key={idx}>{s}</li>
									))}
								</ol>
								{sec.links && sec.links.length > 0 && (
									<>
										<Separator className="my-4" />
										<div className="space-y-2">
											<Label>{content[currentLanguage].linksLabel}</Label>
											<ul className="list-disc list-inside text-sm">
												{sec.links.map((l) => (
													<li key={l.href}>
														<a href={l.href} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
															{l.label}
														</a>
													</li>
												))}
											</ul>
										</div>
									</>
								)}
								{sec.vars && sec.vars.length > 0 && (
									<>
										<Separator className="my-4" />
										<div className="space-y-2">
											<Label>{content[currentLanguage].fieldsLabel}</Label>
											<div className="space-y-2">
												{sec.vars.map((v) => (
													<div key={v.name} className="border rounded-md p-2 text-sm font-mono">{v.name}</div>
												))}
											</div>
										</div>
									</>
								)}
							</CardContent>
						</Card>
					))}
				</div>
			</div>
		</div>
	);
}
