import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

// Initialize Gemini (Replace with your actual key in .env.local)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(request: Request) {
    try {
        const { company, url, snippet } = await request.json();

        // Debug: Check if key exists (don't log the actual key in prod)
        if (!process.env.GEMINI_API_KEY) {
            console.error("Missing GEMINI_API_KEY");
            return NextResponse.json({ error: "Server Configuration Error" }, { status: 500 });
        }

        // 1. Select Model (Using Gemini 2.0 Flash as per 2026 standards)
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        // 2. Construct Prompt
        const prompt = `
            You are a lead enrichment bot. 
            Analyze this company information and predict/extract valid contact details.
            
            Company: ${company}
            Website: ${url}
            Context: ${snippet}
            
            Return ONLY a JSON object with this format (no markdown):
            {
                "email": "best guess support/info email or null",
                "phone": "best guess phone number or null",
                "confidence": "high/medium/low"
            }
        `;

        // 3. Generate Content
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // 4. Clean & Parse JSON
        // Gemini sometimes wraps in ```json ... ```
        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const data = JSON.parse(cleanedText);

        return NextResponse.json(data);

    } catch (error: any) {
        console.error("Gemini Error:", error);
        return NextResponse.json(
            { error: "Failed to enrich data" },
            { status: 500 }
        );
    }
}
