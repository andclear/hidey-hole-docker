import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('settings')
      .select('*');

    if (error) throw error;

    // Convert array to object
    const settings: Record<string, any> = {};
    data?.forEach(item => {
      settings[item.key] = item.value;
    });

    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    console.error('Settings GET Error:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // 1. Check Env
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("CRITICAL: SUPABASE_SERVICE_ROLE_KEY is missing!");
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const body = await request.json();
    console.log("Settings PATCH Body:", JSON.stringify(body));

    const updates = Object.entries(body).map(([key, value]) => ({
      key,
      value,
      updated_at: new Date().toISOString()
    }));
    
    // Manual Upsert Loop
    for (const update of updates) {
      console.log(`Processing key: ${update.key}`);
      
      // 1. Check if exists
      const { data: existing, error: fetchError } = await supabaseAdmin
        .from('settings')
        .select('key')
        .eq('key', update.key)
        .maybeSingle();
      
      if (fetchError) {
        console.error(`Error checking key ${update.key}:`, fetchError);
        return NextResponse.json({ error: 'Database read error', details: fetchError }, { status: 500 });
      }

      if (existing) {
        // 2. Update
        console.log(`Updating key: ${update.key}`);
        const { error: updateError } = await supabaseAdmin
          .from('settings')
          .update({ value: update.value, updated_at: update.updated_at })
          .eq('key', update.key);
        
        if (updateError) {
          console.error(`Error updating key ${update.key}:`, updateError);
          return NextResponse.json({ error: 'Database update error', details: updateError }, { status: 500 });
        }
      } else {
        // 3. Insert
        console.log(`Inserting key: ${update.key}`);
        const { error: insertError } = await supabaseAdmin
          .from('settings')
          .insert(update);
        
        if (insertError) {
          console.error(`Error inserting key ${update.key}:`, insertError);
          return NextResponse.json({ error: 'Database insert error', details: insertError }, { status: 500 });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Settings PATCH Uncaught Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      message: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
}
