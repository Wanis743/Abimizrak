import { type ReactNode } from 'react';
import { Compass, Sparkles, BookOpen, Users, CalendarDays, CircleHelp, Hash, Library, ArrowUpRight, ShieldAlert, LoaderCircle, RefreshCw } from 'lucide-react';
import { Link } from 'wouter';
import type { Space } from '@workspace/api-zod';

export const LogoMark = () => <div className="liquid-panel flex h-10 w-10 items-center justify-center rounded-[14px] text-xl font-bold">AM</div>;

export const ErrorState = ({ onRetry, label = 'Something went wrong' }: { onRetry: () => void; label?: string }) => <div className="flex flex-col items-center justify-center rounded-3xl border border-[#E7B9AD] bg-[#F6DDD6]/30 px-6 py-16 text-center"><ShieldAlert size={32} className="text-[#8F3D2E]" /><h3 className="mt-4 font-display text-lg font-bold text-[#8F3D2E]">{label}</h3><button onClick={onRetry} className="mt-4 flex items-center gap-2 rounded-xl bg-[#8F3D2E] px-4 py-2 text-sm font-bold text-white hover:bg-[#702E21]"><RefreshCw size={14} /> Try again</button></div>;

export const LoadingState = ({ label = 'Loading...' }: { label?: string }) => <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-[#89958F]"><LoaderCircle className="animate-spin text-[#216F58]" size={32} /><p className="font-mono-campus text-sm uppercase tracking-widest">{label}</p></div>;

export const EmptyState = ({ icon: Icon, title, detail }: { icon: any; title: string; detail: string }) => (
  <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-[#D9D1C2] px-6 py-16 text-center">
    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#E9DCC8]/50 text-[#92765D]">
      <Icon size={24} />
    </div>
    <h3 className="mt-4 font-display text-lg font-bold text-[#25423A]">{title}</h3>
    <p className="mt-2 max-w-sm text-sm text-[#725A4A]">{detail}</p>
  </div>
);

export const PageIntro = ({ eyebrow, title, detail, action }: { eyebrow: string; title: string; detail?: string; action?: ReactNode }) => (
  <header className="mb-8 md:mb-12">
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div>
        <div className="font-mono-campus text-xs uppercase tracking-[.2em] text-[#89958F]">{eyebrow}</div>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-[#25423A] md:text-4xl">{title}</h1>
        {detail && <p className="mt-3 max-w-2xl text-base leading-relaxed text-[#59706A]">{detail}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  </header>
);

export const typeLabels: Record<string, string> = { school: 'School', class: 'Class', club: 'Club', project: 'Project', event: 'Event', help: 'Help', library: 'Library', department: 'Department' };
export const typeIcon: Record<string, any> = { school: Library, class: BookOpen, club: Users, project: Sparkles, event: CalendarDays, help: CircleHelp, library: BookOpen, department: Hash };

export const accent = (name?: string) => {
  const map: Record<string, string> = { emerald: 'bg-[#E5EFE6] text-[#216F58]', coral: 'bg-[#F6DDD6] text-[#8F3D2E]', sand: 'bg-[#E9DCC8] text-[#725A4A]', slate: 'bg-[#E2E8F0] text-[#475569]' };
  return map[name || ''] || 'bg-[#F0ECE3] text-[#725A4A]';
};

export const SpaceCard = ({ space, onJoin, isJoining }: { space: Space & { joined?: boolean }; onJoin: (id: string) => void; isJoining?: boolean }) => {
  const Icon = typeIcon[space.type] || Compass;
  const color = accent(space.accent);
  return (
    <div className="liquid-surface group relative flex flex-col justify-between overflow-hidden rounded-[26px] p-5 transition-all hover:-translate-y-1">
      <div>
        <div className="flex items-start justify-between">
          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${color}`}>
            <Icon size={20} />
          </div>
          <div className="rounded-full border border-[#D9D1C2] bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[#89958F]">
            {typeLabels[space.type] || space.type}
          </div>
        </div>
        <div className="mt-5">
          <h3 className="font-display text-lg font-bold text-[#25423A]">{space.name}</h3>
          {space.description && <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[#71807A]">{space.description}</p>}
        </div>
      </div>
      <div className="mt-6 flex items-center justify-between border-t border-[#E5DED2] pt-4">
        <div className="flex items-center gap-1.5 text-xs font-bold text-[#89958F]">
          <Users size={14} />{(space as any).memberCount || 0}
        </div>
        {space.joined ? (
          <Link href={`/spaces/${space.id}`} className="inline-flex items-center gap-1.5 rounded-xl bg-[#E8EEE8] px-4 py-2 text-xs font-bold text-[#216F58] hover:bg-[#DDE8DF]">
            Enter <ArrowUpRight size={14} />
          </Link>
        ) : (
          <button onClick={() => onJoin(space.id)} disabled={isJoining} className="inline-flex items-center gap-1.5 rounded-xl bg-[#25423A] px-4 py-2 text-xs font-bold text-white hover:bg-[#1A2E28]">
            {isJoining ? 'Joining...' : 'Join'}
          </button>
        )}
      </div>
    </div>
  );
};
