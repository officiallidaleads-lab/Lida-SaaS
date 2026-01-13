import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const { company, url, snippet } = await request.json();

        // Check for Groq API Key (Free, Fast, and Generous!)
        if (!process.env.GROQ_API_KEY) {
            console.error("Missing GROQ_API_KEY");
            return NextResponse.json({ error: "Server Configuration Error" }, { status: 500 });
        }

        // 1. Construct Prompt
        const promptText = `You are a lead enrichment bot. 
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
}`;

        // 2. Call Groq API (OpenAI-compatible, FREE!)
        console.log("Calling Groq API for lead enrichment...");
        
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile", // Fast and smart model
                messages: [
                    {
                        role: "system",
                        content: "You are a lead enrichment assistant. Always respond with valid JSON only, no markdown."
                    },
                    {
                        role: "user",
                        content: promptText
                    }
                ],
                temperature: 0.3,
                max_tokens: 500
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Groq API Error:", errorText);
            throw new Error(`Groq API Failed: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        
        // 3. Parse Response
        const text = result.choices?.[0]?.message?.content || "{}";
        
        // Clean any potential markdown
        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const data = JSON.parse(cleanedText);

        console.log("Groq enrichment successful!");
        return NextResponse.json(data);

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error("Enrichment Error:", errorMessage);
        return NextResponse.json(
            { error: "Failed to enrich data", details: errorMessage },
            { status: 500 }
        );
    }
}
