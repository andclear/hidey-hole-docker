
import { Suspense } from 'react';
import { ChatViewerPageClient } from './page-client';

export default function ViewerPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ChatViewerPageClient />
    </Suspense>
  );
}
