import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Helper to get profile
async function getAdminProfile() {
  // First check user_settings table
  const { data: userSettings, error: userError } = await supabaseAdmin
    .from('user_settings')
    .select('avatar_url')
    .limit(1)
    .single();
    
  // Then check settings table for other info
  const { data, error } = await supabaseAdmin
    .from('settings')
    .select('value')
    .eq('key', 'admin_profile')
    .single();
  
  let profile = {
      display_name: process.env.ADMIN_USERNAME || 'Admin',
      avatar_url: '',
      bio: 'Super Administrator'
  };

  if (data && data.value) {
      profile = { ...profile, ...data.value };
  }
  
  // Override avatar_url from user_settings if exists
  if (userSettings && userSettings.avatar_url) {
      profile.avatar_url = userSettings.avatar_url;
  }
  
  return profile;
}

export async function GET() {
  try {
    const profile = await getAdminProfile();
    return NextResponse.json({ success: true, data: profile });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { display_name, avatar_url } = body;
    
    // Get existing profile to merge
    const currentProfile = await getAdminProfile();
    
    // Update settings table for display_name
    if (display_name !== undefined) {
        const newSettingsProfile = {
            display_name,
            bio: currentProfile.bio
            // We don't store avatar_url in settings table anymore, or keep it sync?
            // Let's keep it clean: settings table stores display_name, user_settings stores avatar
        };
        
        await supabaseAdmin
          .from('settings')
          .upsert({ 
            key: 'admin_profile', 
            value: newSettingsProfile,
            updated_at: new Date().toISOString() 
          });
    }

    // Update user_settings table for avatar_url
    if (avatar_url !== undefined) {
         const { data: existing } = await supabaseAdmin.from('user_settings').select('id').limit(1).single();
         if (existing) {
            await supabaseAdmin.from('user_settings').update({ avatar_url }).eq('id', existing.id);
         } else {
            await supabaseAdmin.from('user_settings').insert({ avatar_url });
         }
    }
    
    // Return combined profile
    const newProfile = {
      ...currentProfile,
      ...(display_name !== undefined && { display_name }),
      ...(avatar_url !== undefined && { avatar_url }),
    };

    return NextResponse.json({ success: true, data: newProfile });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
