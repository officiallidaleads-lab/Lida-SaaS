import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const { company, url, snippet } = await request.json();

        // Check for Groq API Key (Free, Fast, and Generous!)
        if (!process.env.GROQ_API_KEY) {
            console.error("Missing GROQ_API_KEY");
            return NextResponse.json({ error: "Server Configuration Error" }, { status: 500 });
        }

        // 1. Extract domain from URL for smart predictions
        let domain = '';
        try {
            const urlObj = new URL(url);
            domain = urlObj.hostname.replace('www.', '');
        } catch (e) {
            console.warn("Invalid URL, using company name for email prediction");
        }

        // 2. Construct Enhanced Prompt
        const promptText = `You are a lead enrichment specialist. Analyze this company and PREDICT their most likely contact details.

Company: ${company}
Website: ${url}
Context: ${snippet}

INSTRUCTIONS:
- For email: If not explicitly shown, predict using the domain (${domain}). Common patterns: info@, contact@, hello@, support@, sales@
- For phone: Look for any phone numbers in the context. If none found, return null.
- For address: Extract any location/address mentioned in the context.
- Be creative and confident in your predictions.

Return ONLY a JSON object (no markdown, no explanations):
{
    "email": "predicted email or null",
    "phone": "extracted phone or null", 
    "confidence": "high/medium/low",
    "formatted_address": "extracted address or null",
    "social_linkedin": "linkedin url or null"
}`;

        // 3. Call Groq API
        console.log("Calling Groq API for lead enrichment...");
        
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [
                    {
                        role: "system",
                        content: "You are a lead enrichment assistant. Always predict contact details when possible. Respond with valid JSON only, no markdown."
                    },
                    {
                        role: "user",
                        content: promptText
                    }
                ],
                temperature: 0.5, // Slightly higher for more creative predictions
                max_tokens: 500
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Groq API Error:", errorText);
            throw new Error(`Groq API Failed: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        
        // 4. Parse Response
        const text = result.choices?.[0]?.message?.content || "{}";
        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        let data = JSON.parse(cleanedText);

        // 5. Fallback: If AI returned null email but we have a domain, make smart predictions
        if (!data.email && domain) {
            const commonPrefixes = ['info', 'contact', 'hello', 'support', 'sales'];
            data.email = `${commonPrefixes[0]}@${domain}`; // Default to info@
            data.confidence = data.confidence || 'medium';
            console.log(`Fallback email prediction: ${data.email}`);
        }

        console.log("Groq enrichment successful!", data);
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
