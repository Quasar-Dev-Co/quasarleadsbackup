import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { getOpenAIClient } from "@/lib/openai";
import dbConnect from '@/lib/mongodb';
import User from '@/models/userSchema';

type Lead = {
	company_name: string;
	company_email?: string | null;
	owner_name?: string | null;
	owner_email?: string | null;
	manager_name?: string | null;
	manager_email?: string | null;
	hr_name?: string | null;
	hr_email?: string | null;
	executive_name?: string | null;
	executive_email?: string | null;
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const companyName: string | undefined = body?.companyName ?? body?.company_name;
    const userId: string | undefined = typeof body?.userId === 'string' ? body.userId : undefined;
    if (!companyName || typeof companyName !== "string" || companyName.trim().length === 0) {
      return NextResponse.json({ error: "companyName is required" }, { status: 400 });
    }

    // ✅ FETCH USER'S OPENAI KEY FROM DATABASE (userSchema.credentials.OPENAI_API_KEY)
    // NO environment variable fallback - key MUST come from database
    if (!userId) {
      return NextResponse.json({ error: 'userId is required for enrichment' }, { status: 400 });
    }
    
    await dbConnect();
    
    let userApiKey: string | undefined = undefined;
    try {
      const user = await User.findById(userId).lean();
      console.log(`🔍 Fetching OpenAI key for user ${userId}:`, !!user);
      
      const maybeKey = (user as any)?.credentials?.OPENAI_API_KEY;
      console.log(`🔑 Database key found:`, maybeKey ? `${maybeKey.substring(0, 10)}... (length: ${maybeKey.length})` : 'NOT FOUND');
      
      if (typeof maybeKey === 'string' && maybeKey.trim()) {
        userApiKey = maybeKey.trim();
        console.log(`✅ Using OpenAI key from database for user ${userId}`);
      }
    } catch (e) {
      console.error(`❌ Error loading user ${userId}:`, e);
      return NextResponse.json({ error: `Failed to load user: ${(e as any)?.message}` }, { status: 500 });
    }
    
    if (!userApiKey) {
      console.error(`❌ No OPENAI_API_KEY found in database for user ${userId}`);
      return NextResponse.json({ 
        error: 'Missing OPENAI_API_KEY in user credentials. Please add your OpenAI API key in account settings.' 
      }, { status: 400 });
    }

    // Create OpenAI client with user's database key
    const openai = getOpenAIClient(userApiKey);

    const prompt = `You are a precise B2B lead researcher. Use web search to verify findings.
Return ONLY a single minified JSON object with keys exactly: company_name, company_email, owner_name, owner_email, manager_name, manager_email, hr_name, hr_email, executive_name, executive_email.
Rules:
- company_name: string
- owner_name: string|null (CEO/Founder/Co-founder)
- owner_email: string|null (only if publicly available)
 - manager_name: string|null (a relevant senior manager if available)
 - manager_email: string|null
 - hr_email: string|null
 - executive_name: string|null (another senior executive e.g., COO/CTO/CRO if available)
 - executive_email: string|null
Set unknown fields to null. Do not include any markdown, backticks, extra keys, or commentary. Company name: ${companyName}`;

    const response = await (openai as any).responses.create({
      model: "gpt-5-mini",
      tools: [{ type: "web_search_preview" }],
      input: prompt,
    } as any);

    let parsed: Lead | null = null;
    try {
      // Parse responses API response (your original format)
      const text: string = (response as any)?.output_text 
        ?? (response as any)?.output?.[0]?.content?.[0]?.text 
        ?? "";
      const tryDirect = () => { try { return text ? (JSON.parse(text) as Lead) : null; } catch { return null; } };
      const tryCodeFence = () => { try { const m = text.match(/```(?:json)?\s*([\s\S]*?)```/i); if (!m) return null; return JSON.parse(m[1]); } catch { return null; } };
      const tryBraces = () => { try { const start = text.indexOf("{"); const end = text.lastIndexOf("}"); if (start === -1 || end === -1 || end <= start) return null; const slice = text.slice(start, end + 1); return JSON.parse(slice); } catch { return null; } };
      parsed = tryDirect() ?? tryCodeFence() ?? tryBraces();
    } catch {
      parsed = null;
    }

    if (!parsed) {
      return NextResponse.json({ error: "Failed to parse model output" }, { status: 500 });
    }

    const lead: Lead = {
      company_name: parsed.company_name?.trim() || companyName,
      company_email: parsed.company_email ?? null,
      owner_name: parsed.owner_name ?? null,
      owner_email: parsed.owner_email ?? null,
      manager_name: parsed.manager_name ?? null,
      manager_email: parsed.manager_email ?? null,
      hr_name: parsed.hr_name ?? null,
      hr_email: parsed.hr_email ?? null,
      executive_name: parsed.executive_name ?? null,
      executive_email: parsed.executive_email ?? null,
    };

    return NextResponse.json({ lead });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Unexpected error" }, { status: 500 });
  }
}


