import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const { company, url, snippet } = await request.json();

        // Check for Groq API Key (Free, Fast, and Generous!)
        if (!process.env.GROQ_API_KEY) {
            console.error("Missing GROQ_API_KEY");
            return NextResponse.json({ error: "Server Configuration Error" }, { status: 500 });
        }

        // 1. Extract actual company domain from snippet (NOT the search result URL!)
        // The URL is often facebook.com/linkedin.com, which is useless for email prediction
        let domain = '';
        
        // Try to find actual company domains in the snippet (e.g., almondestateltd.co.ke)
        const domainPattern = /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\.[a-zA-Z]{2,})?)/g;
        const domainsInSnippet = snippet.match(domainPattern) || [];
        
        // Filter out social media domains
        const socialDomains = ['facebook.com', 'linkedin.com', 'instagram.com', 'twitter.com', 'x.com', 'tiktok.com'];
        const companyDomains = domainsInSnippet
            .map((d: string) => d.replace(/^https?:\/\/(www\.)?/, ''))
            .filter((d: string) => !socialDomains.some(social => d.includes(social)));
        
        domain = companyDomains[0] || ''; // Use first company domain found
        
        console.log("Domain extraction:", { url, domainsInSnippet, companyDomains, selectedDomain: domain });

        // 2. PRE-EXTRACTION: Use regex to find emails and phones in snippet
        const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
        
        // Improved phone pattern for Kenyan numbers: 07XX XXX XXX, +254 7XX XXX XXX, etc.
        const phonePattern = /(?:\+254|0)[\s-]?[17]\d{1,2}[\s-]?\d{3}[\s-]?\d{3,4}|\d{4}[\s-]?\d{6}/g;
        
        const extractedEmails = snippet.match(emailPattern) || [];
        const extractedPhones = snippet.match(phonePattern)?.filter((p: string) => {
            const digits = p.replace(/\D/g, '');
            return digits.length >= 9 && digits.length <= 13; // Valid phone number length
        }) || [];
        
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
