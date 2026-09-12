export const facilityIssueStatuses = [
  "reported",
  "assigned",
  "in_progress",
  "resolved",
  "closed",
] as const;

export type FacilityIssueStatus = (typeof facilityIssueStatuses)[number];

const nextFacilityStatus: Record<FacilityIssueStatus, FacilityIssueStatus | null> = {
  reported: "assigned",
  assigned: "in_progress",
  in_progress: "resolved",
  resolved: "closed",
  closed: null,
};

export function isFacilityIssueStatus(value: unknown): value is FacilityIssueStatus {
  return (facilityIssueStatuses as readonly unknown[]).includes(value);
}

export function canTransitionFacilityIssue(
  from: FacilityIssueStatus,
  to: FacilityIssueStatus,
): boolean {
  return nextFacilityStatus[from] === to;
}
