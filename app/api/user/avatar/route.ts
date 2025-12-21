
import { supabaseAdmin } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('user_settings')
      .select('avatar_url')
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is not found
        throw error;
    }

    return NextResponse.json({ success: true, avatar_url: data?.avatar_url || "" });
  } catch (error) {
    console.error("Fetch Avatar Error:", error);
    return NextResponse.json({ error: "Failed to fetch avatar" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
    try {
        const { avatar_url } = await request.json();
        
        // Check if user_settings exists (assuming single user for now)
        // We might need a fixed ID or just use the first row
        // Let's assume we use a fixed ID 'default' or just upsert the first row
        
        // Actually, let's check if table has rows. If not, insert. If yes, update.
        const { data: existing } = await supabaseAdmin.from('user_settings').select('id').limit(1).single();
        
        let error;
        if (existing) {
            const res = await supabaseAdmin.from('user_settings').update({ avatar_url }).eq('id', existing.id);
            error = res.error;
        } else {
            const res = await supabaseAdmin.from('user_settings').insert({ avatar_url });
            error = res.error;
        }

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Update Avatar Error:", error);
        return NextResponse.json({ error: "Failed to update avatar" }, { status: 500 });
    }
}
