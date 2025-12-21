
import { Suspense } from 'react';
import { SharePageClient } from './page-client';
import { supabaseAdmin } from '@/lib/supabase';
import { notFound } from 'next/navigation';

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  // Verify token
  const { data: link, error } = await supabaseAdmin
    .from('shared_links')
    .select('*, chat_sessions(*, character_cards(name, regex_scripts, data))')
    .eq('token', token)
    .single();

  if (error || !link || !link.chat_sessions) {
    return notFound();
  }

  const session = link.chat_sessions;
  const card = session.character_cards;

  // Get Presigned URL
  // We can't use client-side fetch for this in RSC, need direct call
  // But wait, the viewer component expects a URL.
  // We should probably generate the URL here.
  
  // NOTE: This presigned URL will expire. That's fine for page load.
  // Ideally, the client component should fetch it, but passing it as prop is faster.
  // However, we need 'getStorageClient' which is server-side only.
  
  // Let's pass basic info to client, and client fetches the actual file content via proxy.
  // Actually, we can reuse the existing proxy API if we have the S3 key.
  // But the proxy API might require auth or context?
  // Our proxy API `/api/proxy` takes a URL.
  // We need to generate a presigned URL here.
  
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SharePageClient 
        token={token} 
        initialSession={session} 
        cardName={card?.name || "未知角色"}
        cardId={session.card_id}
      />
    </Suspense>
  );
}
