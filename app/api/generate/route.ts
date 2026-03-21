import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Anthropic from "@anthropic-ai/sdk";

const genAI = new GoogleGenerativeAI((process.env.GOOGLE_AI_API_KEY || "").trim());
const anthropic = new Anthropic({ apiKey: (process.env.ANTHROPIC_API_KEY || "").trim() });

// Helper to handle AI overloads (529 errors) with retries
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      // 529 is Overloaded, 429 is Rate Limit
      const isRetryable = error.status === 529 || error.status === 429 || error.message?.includes("Overloaded");
      if (isRetryable && i < maxRetries - 1) {
        console.log(`[API] AI Overloaded, retrying in ${Math.pow(2, i)}s... (Attempt ${i + 1}/${maxRetries})`);
        await new Promise(res => setTimeout(res, Math.pow(2, i) * 1000));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

export async function POST(req: NextRequest) {
  try {
    const { step, topic, category, scenario, previousOutput, transcript } = await req.json();
    
    console.log(`[API] Step ${step} triggered.`);
    if (!process.env.ANTHROPIC_API_KEY) console.error("[API] ANTHROPIC_API_KEY is missing!");
    else console.log(`[API] Anthropic key present (length: ${process.env.ANTHROPIC_API_KEY.length})`);

    if (!topic || !scenario) {
      return NextResponse.json({ error: "Topic and scenario are required." }, { status: 400 });
    }

    // Agent logic based on the 7-step workflow
    switch (step) {
      case 1: // Research (Gemini)
        return await handleResearch(topic, category, scenario, transcript);
      case 2: // Brief (Claude)
        return await handleBrief(topic, category, scenario, previousOutput, transcript);
      case 3: // Draft (Claude)
        return await handleDraft(topic, category, scenario, previousOutput, transcript);
      case 4: // Polish (Gemini)
        return await handlePolish(topic, category, scenario, previousOutput);
      case 5: // SEO (Gemini)
        return await handleSEO(topic, category, previousOutput);
      case 6: // Social (Claude)
        return await handleSocial(topic, category, previousOutput);
      case 7: // Carousel (Claude)
        return await handleCarousel(topic, category, previousOutput);
      default:
        return NextResponse.json({ error: "Invalid step number." }, { status: 400 });
    }
  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function handleResearch(topic: string, category: string, scenario: string, transcript?: string) {
  const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
  const isTech = category === "Technical Breakdown";
  
  const prompt = transcript 
    ? `Analyze this YouTube Transcript for Silverpath.ai: 
       "${transcript.substring(0, 10000)}" 
       Extract 5-7 key technical and business insights for an SME audience. Scenario: ${scenario}.`
    : (isTech 
        ? `Research/Analysis task for Silverpath.ai:
           Technical Topic: "${topic}"
           Description: "${scenario}"
           Provide 5-7 technical data points regarding the efficiency, cost-saving, and architecture of such a build in 2026. Focus on UK operational benefits.`
        : `Research task for Silverpath.ai Content Workflow:
           Topic: "${topic}"
           Category: "${category}"
           Scenario: "${scenario}"
           Provide 5-7 key data points and market anchors for an SME in this sector. Focus on the UK market and 2026 predictions.`);
  
  const result = await withRetry(() => model.generateContent(prompt));
  return NextResponse.json({ output: result.response.text(), agent: "Gemini 3.1" });
}

async function handleBrief(topic: string, category: string, scenario: string, research: string, transcript?: string) {
  const response = await withRetry(() => anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1000,
    messages: [{ 
      role: "user", 
      content: `Create a content brief for a ${category} ${transcript ? "repurposed from a video" : ""}:
Topic: ${topic}
Scenario: ${scenario}
${transcript ? `Full Transcript Context: ${transcript.substring(0, 10000)}` : ""}
Research Docs: ${research}
Format it as a professional blog outline tailored to the ${category} format.` 
    }],
  }));
  // @ts-ignore
  return NextResponse.json({ output: response.content[0].text, agent: "Claude 4.6" });
}

// ... other handlers will be implemented similarly ...
// (Simplified placeholders for high-speed drafting)
async function handleDraft(topic: string, category: string, scenario: string, brief: string, transcript?: string) {
  const response = await withRetry(() => anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4000,
    messages: [{ 
      role: "user", 
      content: transcript
        ? `Draft a 1,500-word ${category} repurposed from this YouTube Transcript:
           Transcript (excerpt): ${transcript.substring(0, 15000)}
           SME Audience Scenario: ${scenario}.
           Follow this brief: ${brief}`
        : (category === "Technical Breakdown"
          ? `Draft a deep-dive technical breakdown/how-to for: ${topic}.
             Source Details: ${scenario}.
             Structure: 
             1. The Business Burden (The Problem)
             2. The Digital Blueprint (The Solution)
             3. The Build Logs (Step-by-step logic nodes, e.g. n8n setup)
             4. Post-Build Performance.
             Follow this brief: ${brief}`
          : `Draft a 1,500-word ${category} for: ${topic}. 
             SME Audience: ${scenario}. 
             Follow this brief: ${brief}`)
    }],
  }));
  // @ts-ignore
  return NextResponse.json({ output: response.content[0].text, agent: "Claude 4.6" });
}

async function handlePolish(topic: string, category: string, scenario: string, draft: string) {
  const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
  const prompt = `Polish this ${category} draft for Silverpath.ai:
Draft: ${draft}
Focus: Add 3 specific UK-based statistics and ensure the tone is professional yet accessible for a ${scenario} owner.`;
  const result = await model.generateContent(prompt);
  return NextResponse.json({ output: result.response.text(), agent: "Gemini 3.1" });
}

async function handleSEO(topic: string, category: string, content: string) {
  const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
  const prompt = `Generate SEO Metadata for this ${category}: ${topic}
Full Content: ${content}
Provide Title Tag, Meta Description, and 5 Key Keywords.`;
  const result = await model.generateContent(prompt);
  return NextResponse.json({ output: result.response.text(), agent: "Gemini 3.1" });
}

async function handleSocial(topic: string, category: string, content: string) {
  const response = await withRetry(() => anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    messages: [{ 
      role: "user", 
      content: `Create a social media pack (LinkedIn, Twitter, FB) for this ${category}:
Article: ${content}
Tone: Professional and thought-provoking for SMEs.` 
    }],
  }));
  // @ts-ignore
  return NextResponse.json({ output: response.content[0].text, agent: "Claude 4.6" });
}

async function handleCarousel(topic: string, category: string, content: string) {
  const response = await withRetry(() => anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    messages: [{ 
      role: "user", 
      content: `Create a 7-slide LinkedIn Carousel plan for: ${topic}.
Based on: ${content}
Format: Optimized for ${category} highlights.` 
    }],
  }));
  // @ts-ignore
  return NextResponse.json({ output: response.content[0].text, agent: "Claude 4.6" });
}
