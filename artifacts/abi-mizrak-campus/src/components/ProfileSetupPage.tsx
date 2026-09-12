import { useUser, useAuthActions } from "@/lib/auth";
import type { VerificationStatus } from "@workspace/api-zod";

export default function ProfileSetupPage({
  status,
}: {
  status?: VerificationStatus;
}) {
  const { signOut } = useAuthActions();
  return (
    <div className="flex h-[100dvh] items-center justify-center bg-[#F5F0E6]">
      <div className="max-w-md rounded-3xl border border-[#D9D1C2] bg-white p-8 text-center shadow-sm">
        <h1 className="font-display text-2xl font-bold text-[#25423A]">
          Setup Your Profile
        </h1>
        <p className="mt-4 text-[#59706A]">
          Please complete your profile to continue.
        </p>
        <div className="mt-8">
          <button
            onClick={() => signOut()}
            className="rounded-xl border border-[#D9D1C2] px-6 py-3 font-bold text-[#59706A] transition-colors hover:bg-[#F5F0E6]"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
