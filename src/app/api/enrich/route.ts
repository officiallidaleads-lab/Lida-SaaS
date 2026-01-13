import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const { company, url, snippet } = await request.json();

        // Check for Groq API Key (Free, Fast, and Generous!)
        if (!process.env.GROQ_API_KEY) {
            console.error("Missing GROQ_API_KEY");
            return NextResponse.json({ error: "Server Configuration Error" }, { status: 500 });
        }

        // 1. SCRAPE THE ACTUAL PAGE (not just the snippet!)
        let scrapedContent = snippet; // Fallback to snippet
        let domain = '';
        
        try {
            console.log(`Attempting to scrape: ${url}`);
            
            // Fetch the actual webpage
            const pageResponse = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                signal: AbortSignal.timeout(8000) // 8 second timeout
            });
            
            if (pageResponse.ok) {
                const html = await pageResponse.text();
                
                // Extract text content (strip HTML tags)
                const textContent = html
                    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                    .replace(/<[^>]+>/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();
                
                scrapedContent = textContent.substring(0, 5000); // Use first 5000 chars
                console.log(`Successfully scraped ${scrapedContent.length} characters`);
            } else {
                console.warn(`Failed to scrape (${pageResponse.status}), using snippet only`);
            }
        } catch (scrapeError) {
            console.warn("Scraping failed, using snippet only:", scrapeError);
        }

        // 2. Extract actual company domain from scraped content
        const domainPattern = /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\.[a-zA-Z]{2,})?)/g;
        const domainsInContent = scrapedContent.match(domainPattern) || [];
        
        // Filter out social media domains
        const socialDomains = ['facebook.com', 'linkedin.com', 'instagram.com', 'twitter.com', 'x.com', 'tiktok.com'];
        const companyDomains = domainsInContent
            .map((d: string) => d.replace(/^https?:\/\/(www\.)?/, ''))
            .filter((d: string) => !socialDomains.some(social => d.includes(social)));
        
        domain = companyDomains[0] || ''; // Use first company domain found
        
        console.log("Domain extraction:", { domainsInContent: domainsInContent.slice(0, 5), companyDomains, selectedDomain: domain });

        // 3. PRE-EXTRACTION: Use regex to find emails and phones in scraped content
        const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
        
        // Improved phone pattern for Kenyan numbers
        const phonePattern = /(?:\+254|0)[\s-]?[17]\d{1,2}[\s-]?\d{3}[\s-]?\d{3,4}|\d{4}[\s-]?\d{6}/g;
        
        const extractedEmails = scrapedContent.match(emailPattern) || [];
        const extractedPhones = scrapedContent.match(phonePattern)?.filter((p: string) => {
            const digits = p.replace(/\D/g, '');
            return digits.length >= 9 && digits.length <= 13;
        }) || [];
        
        // Remove duplicates
        const uniqueEmails = [...new Set(extractedEmails)].slice(0, 3); // Max 3 emails
        const uniquePhones = [...new Set(extractedPhones)].slice(0, 2); // Max 2 phones
        
        console.log("Regex extraction:", { extractedEmails: uniqueEmails, extractedPhones: uniquePhones });

        // 4. Construct Enhanced Prompt
        const promptText = `You are a lead enrichment specialist. Extract and organize contact details from this company information.

Company: ${company}
Website: ${url}
Context: ${scrapedContent.substring(0, 2000)}

PRE-EXTRACTED DATA (use these if they look valid):
- Emails found: ${uniqueEmails.join(', ') || 'none'}
- Phones found: ${uniquePhones.join(', ') || 'none'}

INSTRUCTIONS:
- Use the pre-extracted emails/phones if they exist and look legitimate
- If no email was pre-extracted, predict using domain (${domain}): info@, contact@, hello@, support@, sales@
- For phone: Use pre-extracted phone if available
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

        // 5. Call Groq API
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
        
        // 6. Parse Response
        const text = result.choices?.[0]?.message?.content || "{}";
        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        let data = JSON.parse(cleanedText);

        // 7. OVERRIDE: If AI still missed extracted data, force it in
        if (!data.email && uniqueEmails.length > 0) {
            data.email = uniqueEmails[0];
            data.confidence = 'high';
            console.log("AI missed email, using regex extraction:", data.email);
        }
        
        if (!data.phone && uniquePhones.length > 0) {
            data.phone = uniquePhones[0];
            console.log("AI missed phone, using regex extraction:", data.phone);
        }

        // 8. Final Fallback: If still no email and we have domain, predict
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
