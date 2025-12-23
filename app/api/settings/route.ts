import { NextRequest, NextResponse } from 'next/server';
import { settingsService } from '@/lib/services/settings-service';

export async function GET() {
  try {
    const data = await settingsService.getSettings();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Settings GET Error:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    await settingsService.updateSettings(body);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Settings PATCH Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      message: error.message 
    }, { status: 500 });
  }
}
