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

        // 2. PRE-EXTRACTION: Use regex to find emails and phones in snippet (AI sometimes misses these!)
        const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
        const phonePattern = /(\+?\d{1,4}[-.\s]?)?(\(?\d{1,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{3,4}[-.\s]?\d{0,4}/g;
        
        const extractedEmails = snippet.match(emailPattern) || [];
        const extractedPhones = snippet.match(phonePattern)?.filter((p: string) => p.replace(/\D/g, '').length >= 7) || [];
        
        console.log("Regex extraction:", { extractedEmails, extractedPhones });

        // 3. Construct Enhanced Prompt
        const promptText = `You are a lead enrichment specialist. Extract and organize contact details from this company information.

Company: ${company}
Website: ${url}
Context: ${snippet}

PRE-EXTRACTED DATA (use these if they look valid):
- Emails found: ${extractedEmails.join(', ') || 'none'}
- Phones found: ${extractedPhones.join(', ') || 'none'}

INSTRUCTIONS:
- Use the pre-extracted emails/phones if they exist
- If no email was pre-extracted, predict using domain (${domain}): info@, contact@, hello@, support@, sales@
- For phone: Use pre-extracted phone if available, otherwise look for any mentions in context
- Extract any address/location mentioned
- Be precise and use the actual data when available

Return ONLY a JSON object (no markdown, no explanations):
{
    "email": "extracted or predicted email",
    "phone": "extracted phone or null", 
    "confidence": "high/medium/low",
    "formatted_address": "extracted address or null",
    "social_linkedin": "linkedin url or null"
}`;

        // 4. Call Groq API
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
                        content: "You are a lead enrichment assistant. ALWAYS use pre-extracted data when provided. Only predict if extraction is empty. Respond with valid JSON only, no markdown."
                    },
                    {
                        role: "user",
                        content: promptText
                    }
                ],
                temperature: 0.3, // Lower temp for data extraction (we want precision)
                max_tokens: 500
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Groq API Error:", errorText);
            throw new Error(`Groq API Failed: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        
        // 5. Parse Response
        const text = result.choices?.[0]?.message?.content || "{}";
        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        let data = JSON.parse(cleanedText);

        // 6. OVERRIDE: If AI still missed extracted data, force it in
        if (!data.email && extractedEmails.length > 0) {
            data.email = extractedEmails[0];
            data.confidence = 'high';
            console.log("AI missed email, using regex extraction:", data.email);
        }
        
        if (!data.phone && extractedPhones.length > 0) {
            data.phone = extractedPhones[0];
            console.log("AI missed phone, using regex extraction:", data.phone);
        }

        // 7. Final Fallback: If still no email and we have domain, predict
        if (!data.email && domain) {
            const commonPrefixes = ['info', 'contact', 'hello', 'support', 'sales'];
            data.email = `${commonPrefixes[0]}@${domain}`;
            data.confidence = data.confidence || 'medium';
            console.log(`Final fallback email prediction: ${data.email}`);
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
