import { PageIntro } from './shared';
import { ShieldCheck, Calendar, Hash, FileBadge2 } from 'lucide-react';
import { useUser, useAuthActions } from '@/lib/auth';

export function IdentityPage() {
  const { user } = useUser();

  return (
    <div className="reveal animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageIntro eyebrow="Identity" title="Digital Passport" detail="Your verified school credentials and profile settings." />
      <div className="mt-8 flex justify-center">
        <div className="relative w-full max-w-sm overflow-hidden rounded-[2rem] border-2 border-[#D9D1C2] bg-[#FBF9F4] p-8 shadow-sm">
          <div className="absolute right-0 top-0 -mr-16 -mt-16 h-40 w-40 rounded-full bg-[#E5EFE6] opacity-50 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 h-40 w-40 rounded-full bg-[#E9DCC8] opacity-50 blur-3xl"></div>
          <div className="relative">
            <div className="flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#25423A] font-bold text-white shadow-md">AM</div>
              <div className="flex items-center gap-1.5 rounded-full bg-[#E5EFE6] px-3 py-1 text-xs font-bold text-[#216F58]">
                <ShieldCheck size={14} /> Verified
              </div>
            </div>
            <div className="mt-8">
              <div className="font-mono-campus text-[10px] uppercase tracking-[.2em] text-[#89958F]">Student Name</div>
              <div className="mt-1 font-display text-2xl font-bold text-[#25423A]">
                {user?.firstName || user?.fullName || 'Student'} {user?.lastName && user.firstName ? user.lastName : ''}
              </div>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-4">
              <div>
                <div className="font-mono-campus text-[10px] uppercase tracking-[.2em] text-[#89958F]">Role</div>
                <div className="mt-1 flex items-center gap-2 font-bold text-[#25423A]">
                  <FileBadge2 size={16} className="text-[#59706A]" /> Student
                </div>
              </div>
              <div>
                <div className="font-mono-campus text-[10px] uppercase tracking-[.2em] text-[#89958F]">Academic Year</div>
                <div className="mt-1 flex items-center gap-2 font-bold text-[#25423A]">
                  <Calendar size={16} className="text-[#59706A]" /> 2026-2027
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
