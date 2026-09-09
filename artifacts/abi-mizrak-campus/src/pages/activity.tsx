import { PageIntro, EmptyState, LoadingState } from './shared';
import { Network } from 'lucide-react';

export function ActivityPage() {
  return (
    <div className="reveal animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageIntro eyebrow="Activity" title="Campus Activity" detail="Recent posts and updates from spaces you follow." />
      <div className="mt-8">
        <EmptyState icon={Network} title="No activity yet" detail="When things happen, they will appear here." />
      </div>
    </div>
  );
}
