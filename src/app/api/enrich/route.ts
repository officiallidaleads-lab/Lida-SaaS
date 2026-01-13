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

        // 2. Call Gemini REST API directly (Bypassing SDK to avoid version issues)
        // Using gemini-1.5-flash which is the current stable standard
        const apiKey = process.env.GEMINI_API_KEY;
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

        console.log("Sending request to Gemini REST API...");

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: promptText }]
                }]
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Gemini REST API Error:", errorText);
            throw new Error(`Gemini API Failed: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        
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
