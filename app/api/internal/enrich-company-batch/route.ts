import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { getOpenAIClient } from "@/lib/openai";
import dbConnect from '@/lib/mongodb';
import User from '@/models/userSchema';

type InputItem = { index: number; company: string };
type Lead = {
  index: number;
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

function safeParseJson(text: string): any | null {
  try {
    return JSON.parse(text);
  } catch {}
  // Try to extract JSON block between code fences if present
  try {
    const match = text.match(/```(?:json)?\n([\s\S]*?)\n```/i);
    if (match && match[1]) {
      return JSON.parse(match[1]);
    }
  } catch {}
  // Try to extract JSON from braces
  try {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      const slice = text.slice(start, end + 1);
      return JSON.parse(slice);
    }
  } catch {}
  return null;
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Batch enrichment endpoint called');
    await dbConnect();

    const body = await request.json().catch(() => ({} as any));
    console.log('📦 Request body:', JSON.stringify(body, null, 2));
    
    const items: InputItem[] = Array.isArray(body?.companies)
      ? (body?.companies as any[]).map((c, idx) => ({ index: idx, company: String(c) }))
      : Array.isArray(body?.items)
        ? (body?.items as any[]).map((x: any) => ({ index: Number(x?.index ?? 0), company: String(x?.company ?? '') }))
        : [];
    const userId = String(body?.userId || '');

    console.log(`📊 Parsed ${items.length} items for user ${userId}`);

    if (!items.length) {
      console.log('❌ No items provided');
      return NextResponse.json({ success: false, error: 'Provide companies as array or items[{index,company}]' }, { status: 400 });
    }

    // ✅ FETCH USER'S OPENAI KEY FROM DATABASE (userSchema.credentials.OPENAI_API_KEY)
    // NO environment variable fallback - key MUST come from database
    if (!userId) {
      return NextResponse.json({ success: false, error: 'userId is required for enrichment' }, { status: 400 });
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
      return NextResponse.json({ success: false, error: `Failed to load user: ${(e as any)?.message}` }, { status: 500 });
    }
    
    if (!userApiKey) {
      console.error(`❌ No OPENAI_API_KEY found in database for user ${userId}`);
      return NextResponse.json({ 
        success: false, 
        error: 'Missing OPENAI_API_KEY in user credentials. Please add your OpenAI API key in account settings.' 
      }, { status: 400 });
    }

    // Create OpenAI client with user's database key
    const openai = getOpenAIClient(userApiKey);

    // Limit batch to max 10 to keep prompts reasonable; caller can chunk outside
    const limited = items.slice(0, 10);

    const companyList = limited.map((item, idx) => `${idx + 1}. Index ${item.index}: ${item.company}`).join('\n');

    const prompt = `You are a B2B lead researcher. Output ONLY valid JSON matching the schema. Do not invent data. If unsure, use null.

User:
Research these companies (use web search as available):
${companyList}
Return EXACTLY this JSON:
{
"results": [
{
"index": 0,
"company_name": "...",
"company_email": "...|null",
"owner_name": "...|Hoi <Company name> Team",
"owner_email": "...|null",
"manager_name": "...|null",
"manager_email": "...|null",
"hr_name": "...|null",
"hr_email": "...|null",
"executive_name": "...|null",
"executive_email": "...|null"
}
]
}

Rules:
•⁠  index must match input index.
•⁠  ⁠company_email = First Find exact CEO/Founder/President Email personal email if not found then find general inbox (info@, contact@, hello@)ONLY SINGLE VALUE DONT USE COMMA . If none, null.
•⁠  ⁠owner_name = CEO/Founder/President search on internate and find the exact name but If not found then → fallback = "Hoi <company_name> Team”). ONLY SINGLE VALUE DONT USE COMMA"
•⁠  ⁠For any email fields: only if publicly available; otherwise null.
•⁠  ⁠Use null when not found or uncertain.
•⁠  ⁠Output JSON only; no markdown, notes, or extra fields.

**IF INDEX COMPANY IS 5 THEN MUST BE REPLY 5 COMPANY DETAILS MUST.**
`;

    // Use the same responses API format as the single enrichment route
    console.log('🤖 Calling OpenAI with prompt length:', prompt.length);
    console.log('🔑 Using OpenAI key length:', userApiKey.length);
    
    let response;
    try {
      console.log('🔑 About to call OpenAI with key starting with:', userApiKey.substring(0, 7));
      
      // Use your original responses API with web search
      response = await (openai as any).responses.create({
        model: "gpt-5-nano",
        tools: [{ type: "web_search_preview" }],
        input: prompt,
      } as any);
      console.log('✅ OpenAI response received via responses API');
    } catch (openaiError: any) {
      console.error('❌ OpenAI API Error:', openaiError);
      console.error('❌ OpenAI Error message:', openaiError.message);
      console.error('❌ OpenAI Error status:', openaiError.status);
      console.error('❌ OpenAI Error response:', openaiError.response?.data);
      return NextResponse.json({ 
        success: false, 
        error: `OpenAI API failed: ${openaiError.message}`,
        details: openaiError.status ? `Status: ${openaiError.status}` : 'No status'
      }, { status: 502 });
    }

    let parsed: any = null;
    try {
      // Parse responses API response (your original format)
      const text: string = (response as any)?.output_text 
        ?? (response as any)?.output?.[0]?.content?.[0]?.text 
        ?? "";
      
      console.log('📝 Raw OpenAI response text length:', text.length);
      console.log('📝 Raw OpenAI response preview:', text.substring(0, 200) + '...');
      
      parsed = safeParseJson(text);
      console.log('✅ JSON parsed successfully:', !!parsed);
      console.log('✅ Has results array:', Array.isArray(parsed?.results));
    } catch (parseError: any) {
      console.error('❌ JSON parsing error:', parseError);
      parsed = null;
    }

    if (!parsed || !Array.isArray(parsed?.results)) {
      console.error('❌ Invalid parsed result structure:', { parsed: !!parsed, hasResults: Array.isArray(parsed?.results) });
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to parse batch enrichment results',
        debug: {
          hasParsed: !!parsed,
          hasResults: Array.isArray(parsed?.results),
          parsedType: typeof parsed
        }
      }, { status: 502 });
    }

    // Normalize results
    const results: Lead[] = (parsed.results as any[]).map((r) => ({
      index: Number(r.index),
      company_name: String(r.company_name || ''),
      company_email: r.company_email === 'null' ? null : (r.company_email ?? null),
      owner_name: r.owner_name === 'null' ? null : (r.owner_name ?? null),
      owner_email: r.owner_email === 'null' ? null : (r.owner_email ?? null),
      manager_name: r.manager_name === 'null' ? null : (r.manager_name ?? null),
      manager_email: r.manager_email === 'null' ? null : (r.manager_email ?? null),
      hr_name: r.hr_name === 'null' ? null : (r.hr_name ?? null),
      hr_email: r.hr_email === 'null' ? null : (r.hr_email ?? null),
      executive_name: r.executive_name === 'null' ? null : (r.executive_name ?? null),
      executive_email: r.executive_email === 'null' ? null : (r.executive_email ?? null)
    })).filter(r => r && typeof r.index === 'number');

    console.log(`✅ Batch enriched ${limited.length} companies in 1 web_search call`);

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error('❌ Batch enrichment error:', error);
    console.error('Stack trace:', error.stack);
    return NextResponse.json({ success: false, error: error.message || 'Batch enrichment failed' }, { status: 500 });
  }
}