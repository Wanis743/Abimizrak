import { useGetSpaces } from '@workspace/api-client-react';
import { Link, useLocation } from 'wouter';
import { Compass, Home, Sparkles, BookOpen, Users, CalendarDays, LoaderCircle, Plus } from 'lucide-react';

const typeIcon: Record<string, any> = { school: Home, class: BookOpen, club: Users, project: Sparkles, event: CalendarDays };
const accent = (name?: string) => {
  const map: Record<string, string> = { emerald: 'bg-[hsl(var(--lc-accent)/.12)] text-[var(--lc-accent)]', coral: 'bg-[#F6DDD6] text-[#8F3D2E]', sand: 'bg-[#E9DCC8] text-[#725A4A]', slate: 'bg-[#E2E8F0] text-[#475569]' };
  return map[name || ''] || 'bg-white/20 text-[var(--lc-muted)]';
};

export function ServerSidebar() {
  const [location] = useLocation();
  const { data, isLoading } = useGetSpaces();
  const spaces = data || [];
  
  // Only show spaces the user has joined for the sidebar
  const joinedSpaces = spaces.filter(s => s.joined);
  
  const isHome = location === '/' || location === '/activity' || location === '/identity' || location === '/spaces' || location === '/admin/verification';

  return (
    <nav className="flex w-[72px] shrink-0 flex-col items-center gap-3 overflow-y-auto border-r border-[var(--lc-line)] bg-white/10 backdrop-blur-xl py-5 hide-scrollbar">
      {/* Home / Campus Server */}
      <Link href="/">
        <div className="group relative flex w-full justify-center">
          <div className={`absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-[#25423A] transition-all ${isHome ? 'opacity-100 scale-100' : 'opacity-0 scale-0 group-hover:opacity-100 group-hover:scale-75'}`} />
          <button className={`flex h-12 w-12 items-center justify-center rounded-2xl liquid-surface deep font-bold text-white shadow-[0_16px_40px_hsl(var(--lc-shadow)/.18)] transition-all ${isHome ? 'rounded-[16px]' : 'hover:rounded-[16px]'}`}>
            AM
          </button>
        </div>
      </Link>
      
      <div className="h-[2px] w-8 rounded-full bg-[#D9D1C2]/60" />

      {/* Joined Spaces */}
      {isLoading ? (
        <LoaderCircle className="animate-spin text-[#89958F]" size={20} />
      ) : (
        joinedSpaces.map((space) => {
          const isActive = location.startsWith(`/spaces/${space.id}`);
          const Icon = typeIcon[space.type] || Compass;
          const colorClass = accent(space.accent);
          
          return (
            <Link key={space.id} href={`/spaces/${space.id}`}>
              <div className="group relative flex w-full justify-center" title={space.name}>
                <div className={`absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-[#25423A] transition-all ${isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-0 group-hover:opacity-100 group-hover:scale-75'}`} />
                <button className={`flex h-12 w-12 items-center justify-center rounded-full transition-all ${isActive ? 'rounded-[16px]' : 'hover:rounded-[16px]'} ${colorClass}`}>
                  <Icon size={20} />
                </button>
              </div>
            </Link>
          );
        })
      )}

      {/* Discover / Add Space */}
      <Link href="/spaces">
        <div className="group relative flex mt-2 w-full justify-center" title="Discover Spaces">
          <button className="flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-[var(--lc-line)] text-[var(--lc-muted)] transition-all hover:rounded-[16px] hover:border-[hsl(var(--lc-accent)/.55)] hover:bg-[hsl(var(--lc-accent)/.10)] hover:text-[var(--lc-accent)]">
            <Plus size={20} />
          </button>
        </div>
      </Link>
    </nav>
  );
}
