
import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

// This endpoint should be called by a cron job (e.g. Vercel Cron)
// Schedule: 0 0 * * * (Daily at midnight)
export async function GET() {
  try {
    // 1. Get settings
    const { data: settings } = await supabaseAdmin
        .from('settings')
        .select('value')
        .eq('key', 'general_config')
        .single();
    
    const config = settings?.value || {};
    const retentionDays = config.trash_auto_delete_days;

    // If 0 or undefined, disable auto cleanup
    if (!retentionDays || retentionDays <= 0) {
        return NextResponse.json({ success: true, message: "Auto cleanup disabled" });
    }

    // 2. Calculate threshold date
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - retentionDays);
    const thresholdISO = thresholdDate.toISOString();

    // 3. Find cards to delete
    const { data: cardsToDelete } = await supabaseAdmin
        .from('character_cards')
        .select('id, file_name')
        .eq('is_deleted', true)
        .lt('deleted_at', thresholdISO);

    if (!cardsToDelete || cardsToDelete.length === 0) {
        return NextResponse.json({ success: true, message: "No cards to cleanup" });
    }

    // 4. Hard Delete (or just mark as really deleted if you want to keep files? No, trash cleanup means hard delete)
    // Actually, we should probably delete files from S3 too if we are doing hard delete.
    // For now, let's just remove the DB records. S3 cleanup can be a separate task or triggered here.
    
    const ids = cardsToDelete.map(c => c.id);
    
    const { error } = await supabaseAdmin
        .from('character_cards')
        .delete()
        .in('id', ids);

    if (error) throw error;

    return NextResponse.json({ 
        success: true, 
        message: `Cleaned up ${ids.length} cards older than ${retentionDays} days`,
        deleted_ids: ids
    });

  } catch (error: any) {
    console.error("Cleanup Cron Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
