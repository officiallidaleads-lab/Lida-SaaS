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

        // 2. Call Gemini REST API with Model Fallback Strategy
        // We try multiple models in order of preference to handle 404s (availability) or 429s (rate limits)
        const models = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro'];
        const apiKey = process.env.GEMINI_API_KEY;
        
        let lastError = null;
        let successResponse = null;

        for (const model of models) {
            try {
                console.log(`Attempting enrichment with model: ${model}...`);
                const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: promptText }] }]
                    })
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    // If rate limited (429) or not found (404), throw to try next model
                    // For other errors (500), we might also want to retry, so we treat all non-ok as try-next
                    throw new Error(`${response.status} ${response.statusText} - ${errorText}`);
                }

                successResponse = await response.json();
                console.log(`Success with model: ${model}`);
                break; // Exit loop on success

            } catch (error: any) {
                console.warn(`Failed with ${model}:`, error.message);
                lastError = error;
                // Continue to next model
            }
        }

        if (!successResponse) {
            console.error("All Gemini models failed.");
            throw lastError || new Error("All models failed");
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
