import { PageIntro, EmptyState } from './shared';
import { CircleHelp } from 'lucide-react';
import { Link } from 'wouter';

export default function NotFound() {
  return (
    <div className="flex h-[80vh] flex-col items-center justify-center">
      <EmptyState icon={CircleHelp} title="Lost in the halls" detail="We couldn't find the page you're looking for." />
      <div className="mt-8">
        <Link href="/" className="rounded-xl bg-[#25423A] px-6 py-3 font-bold text-white transition-colors hover:bg-[#1A2E28]">
          Return to Campus Home
        </Link>
      </div>
    </div>
  );
}
