import { PageIntro, EmptyState } from "./shared";
import { Network } from "lucide-react";

export function HomePage() {
  return (
    <div className="reveal animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageIntro
        eyebrow="Campus Pulse"
        title="Welcome back to Abi Mizrak."
        detail="Catch up on announcements, schedule changes, and school activity."
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* Main Feed */}
        <div className="space-y-6">
          <div className="paper-card rounded-3xl p-8 shadow-sm border border-[#D9D1C2]/60">
            <h3 className="font-display text-xl font-bold text-[#25423A] mb-4">
              Latest Announcements
            </h3>
            <EmptyState
              icon={Network}
              title="All caught up!"
              detail="There are no new school-wide announcements right now."
            />
          </div>
        </div>

        {/* Sidebar / Schedule */}
        <div className="space-y-6">
          <div className="rounded-3xl bg-[#E8EEE8] p-6 shadow-sm border border-[#D9D1C2]/60">
            <h3 className="font-display text-lg font-bold text-[#25423A] mb-4">
              Your Schedule
            </h3>
            <div className="text-sm text-[#59706A]">
              Classes haven't started yet. Join your spaces to see your
              personalized schedule.
            </div>
          </div>

          <div className="rounded-3xl bg-[#F6DDD6]/40 p-6 shadow-sm border border-[#E7B9AD]/60">
            <h3 className="font-display text-lg font-bold text-[#8F3D2E] mb-2">
              Notice
            </h3>
            <div className="text-sm text-[#725A4A]">
              Don't forget to check your Identity page to ensure your school
              affiliation is fully verified.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
