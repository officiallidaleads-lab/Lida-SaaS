import { NextResponse } from 'next/server';
import axios from 'axios';

const GOOGLE_API_KEY = 'AIzaSyC0sq5-_lJgbgvK8g4ZdZd38vYxlzU6Ais';
const GOOGLE_CX = '05327eefe87954be5';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');
    const start = searchParams.get('start') || '1';

    if (!query) {
        return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    try {
        const url = `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(query)}&key=${GOOGLE_API_KEY}&cx=${GOOGLE_CX}&start=${start}`;
        
        console.log(`Searching Google: ${url}`);
        
        const response = await axios.get(url);
        
        return NextResponse.json(response.data);
    } catch (error: any) {
        console.error('Google Search Error:', error.response?.data || error.message);
        return NextResponse.json(
            { error: 'Failed to fetch results from Google' },
            { status: 500 }
        );
    }
}
