import { useState } from "react";
import { PageIntro, EmptyState, LoadingState, ErrorState } from "./shared";
import { UserCheck, ShieldCheck, Clock3, Check, Ban } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetVerificationRequestsQueryKey,
  useGetVerificationRequests,
  useUpdateVerification,
} from "@workspace/api-client-react";

export function AdminVerificationPage() {
  const queryClient = useQueryClient();
  const {
    data: requests,
    isLoading,
    isError,
    refetch,
  } = useGetVerificationRequests();
  const updateVerification = useUpdateVerification({
    mutation: {
      onSettled: () =>
        queryClient.invalidateQueries({
          queryKey: getGetVerificationRequestsQueryKey(),
        }),
    },
  });
  const [processing, setProcessing] = useState<Record<string, boolean>>({});
  const pending = (requests || []).filter(
    (request) =>
      request.membershipStatus !== "approved" ||
      request.roleStatus !== "approved",
  );

  const handleUpdate = async (
    userId: string,
    action: "approve" | "suspend",
  ) => {
    setProcessing((prev) => ({ ...prev, [userId]: true }));
    try {
      await updateVerification.mutateAsync({ userId, data: { action } });
    } finally {
      setProcessing((prev) => ({ ...prev, [userId]: false }));
    }
  };

  return (
    <div className="reveal animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageIntro
        eyebrow="Administration"
        title="Access control"
        detail="Review school affiliation and role requests before members enter protected campus areas."
      />
      <div className="mt-8">
        {isLoading ? (
          <LoadingState label="Loading verification requests" />
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : pending.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="All clear"
            detail="There are no pending verification requests."
          />
        ) : (
          <div className="space-y-4">
            {pending.map((req) => (
              <article
                key={req.userId}
                className="liquid-surface crystal flex flex-col gap-5 p-5 md:flex-row md:items-center md:justify-between"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[var(--lc-line)] bg-white/30 text-[var(--lc-accent)]">
                    <UserCheck size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold">
                      {req.displayName || req.userId}
                    </h3>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-[var(--lc-muted)]">
                      <span className="capitalize">
                        Requested {req.requestedRole}
                      </span>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1">
                        <Clock3 size={12} />
                        Membership {req.membershipStatus}
                      </span>
                      <span>•</span>
                      <span>Role {req.roleStatus}</span>
                    </div>
                    {req.lastReviewNote && (
                      <p className="mt-2 text-xs text-[var(--lc-muted)]">
                        Last note: {req.lastReviewNote}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    disabled={processing[req.userId]}
                    onClick={() => void handleUpdate(req.userId, "suspend")}
                    className="lc-secondary-button"
                  >
                    <Ban size={14} />
                    Suspend
                  </button>
                  <button
                    disabled={processing[req.userId]}
                    onClick={() => void handleUpdate(req.userId, "approve")}
                    className="lc-primary-button"
                  >
                    <Check size={15} />
                    Approve
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
