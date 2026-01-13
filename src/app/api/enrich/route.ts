import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

// Initialize Gemini (Replace with your actual key in .env.local)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(request: Request) {
    try {
        const { company, url, snippet } = await request.json();

        if (!process.env.GEMINI_API_KEY) {
            console.error("Missing GEMINI_API_KEY");
            return NextResponse.json({ error: "Server Configuration Error" }, { status: 500 });
        }

        // 1. Construct Prompt
        const promptText = `
            You are a lead enrichment bot. 
            Analyze this company information and predict/extract valid contact details.
            
            Company: ${company}
            Website: ${url}
            Context: ${snippet}
            
            Return ONLY a JSON object with this format (no markdown):
            {
                "email": "best guess support/info email or null",
                "phone": "best guess phone number or null",
                "confidence": "high/medium/low",
                "formatted_address": "best guess address or null",
                "social_linkedin": "linkedin url or null"
            }
        `;

        // 2. Call Gemini REST API with Smart Retry Strategy
        // gemini-2.0-flash is the only model confirmed to exist (others return 404), 
        // so we focus on retrying it when we hit Rate Limits (429).
        const models = ['gemini-2.0-flash']; 
        const apiKey = process.env.GEMINI_API_KEY;
        
        let successResponse = null;
        let lastError = null;

        for (const model of models) {
            // We allow up to 3 attempts (Initial + 2 Retries) for the primary model
            for (let attempt = 1; attempt <= 3; attempt++) {
                try {
                    console.log(`Attempting enrichment with model: ${model} (Attempt ${attempt})...`);
                    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

                    const response = await fetch(apiUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{ parts: [{ text: promptText }] }]
                        })
                    });

                    if (response.status === 429) {
                        console.warn(`Rate limit hit for ${model}. Waiting to retry...`);
                        
                        // Gemini Free Tier requires waiting significantly (often >6s)
                        // We use a progressive backoff: 10s, 20s, 30s
                        const waitTime = 10000 * attempt;
                        await new Promise(resolve => setTimeout(resolve, waitTime));
                        continue; // Try again
                    }

                    if (!response.ok) {
                        const errorText = await response.text();
                        throw new Error(`${response.status} ${response.statusText} - ${errorText}`);
                    }

                    successResponse = await response.json();
                    console.log(`Success with model: ${model}`);
                    break; // Exit retry loop

                } catch (error: any) {
                    console.warn(`Failed with ${model}:`, error.message);
                    lastError = error;
                    // If it's not a 429 (caught above), we might break or continue depending on error type
                    // For now, we continue to next attempt if appropriate, or break if it's fatal
                    if (!error.message.includes('429')) break; 
                }
            }
            
            if (successResponse) break; // Exit model loop if successful
        }

        if (!successResponse) {
            console.error("Gemini API failed after retries.");
            // Return a specific 429 response if appropriate, else 500
            if (lastError?.message?.includes('429')) {
                return NextResponse.json(
                    { error: "Usage limit exceeded. Please wait a minute and try again." }, 
                    { status: 429 }
                );
            }
            throw lastError || new Error("Enrichment failed after retries");
        }
        
        const result = successResponse;
        
        // 3. Parse Response
        // The structure is result.candidates[0].content.parts[0].text
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
        
        // Clean markdown code blocks if present
        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const data = JSON.parse(cleanedText);

        return NextResponse.json(data);
    } catch (error: any) {
        console.error("Enrichment Error:", error);
        return NextResponse.json(
            { error: "Failed to enrich data", details: error.message },
            { status: 500 }
        );
    }
}
