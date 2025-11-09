import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Forward seeding request to backend API
    const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
    
    const response = await fetch(`${API_BASE_URL}/api/seed`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Backend API responded with status: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Seeding API proxy error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to seed database',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Forward seeding status request to backend API
    const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
    
    const response = await fetch(`${API_BASE_URL}/api/seed`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Backend API responded with status: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Seeding status API proxy error:', error);
    return NextResponse.json({
      seeded: false,
      message: 'Seeding endpoint available. Use POST method to seed database.',
      instructions: 'Send POST request to /api/seed to populate database with Analytics_Test_Data.json',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}