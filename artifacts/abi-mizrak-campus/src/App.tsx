import {
  type FormEvent,
  type ReactElement,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Activity,
  ArrowLeft,
  ArrowUpRight,
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  ChevronRight,
  CircleHelp,
  Clock3,
  Compass,
  DoorOpen,
  FileBadge2,
  Hash,
  Home,
  Library,
  LoaderCircle,
  LogOut,
  LockKeyhole,
  Menu,
  MessageSquare,
  Network,
  Plus,
  Radio,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserCheck,
  UsersRound,
  X,
} from "lucide-react";
import {
  AuthProvider,
  SignIn,
  SignUp,
  useAuth,
  useAuthActions,
  useUser,
} from "@/lib/auth";
const Show = ({ children }: { children?: React.ReactNode }) => <>{children}</>;
import {
  ActivityItemKind,
  PostInputKind,
  SpaceType,
  type ActivityItem,
  type CampusHome,
  type Credential,
  type Post,
  type Space,
  type SpaceDetail,
  type IdentityProfileInput,
  type VerificationRequest,
  type VerificationStatus,
} from "@workspace/api-client-react";
import {
  getGetCampusActivityQueryKey,
  getGetIdentityCredentialQueryKey,
  getGetVerificationRequestsQueryKey,
  getGetVerificationStatusQueryKey,
  getGetSpaceQueryKey,
  getGetSpacePostsQueryKey,
  getGetSpacesQueryKey,
  useCreatePost,
  useGetCampusActivity,
  useGetCampusHome,
  useGetIdentityCredential,
  useGetVerificationRequests,
  useGetVerificationStatus,
  useUpdateIdentityProfile,
  useGetSpace,
  useGetSpacePosts,
  useGetSpaces,
  useJoinSpace,
  useUpdateVerification,
} from "@workspace/api-client-react";
import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query";
import { ErrorBoundary } from "@/components/error-boundary";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  Link,
  Redirect,
  Route,
  Router as WouterRouter,
  Switch,
  useLocation,
  useParams,
} from "wouter";
import NotFound from "@/pages/not-found";
import { ProjectsDirectory } from "@/pages/projects-directory";
import { ProjectDetailPage } from "@/pages/project-detail";
import { TalentGraph } from "@/pages/talent-graph";
import { PortfolioPage } from "@/pages/portfolio";
import { EventsPage } from "@/pages/events";
import { AdminCenterPage } from "@/pages/admin-center";
import { AcademicPage } from "@/pages/academic";
import { LiquidCampusLayout } from "@/components/layout/LiquidCampusLayout";
import { HomePage } from "@/pages/campus-home";
import { ActivityPage } from "@/pages/activity";
import { SpacesPage } from "@/pages/spaces-directory";
import { SpaceDetailPage } from "@/pages/space-detail";
import { IdentityPage } from "@/pages/identity";
import { AdminVerificationPage } from "@/pages/admin-verification";
import { TeacherWorkspace } from "@/components/TeacherWorkspace";
import { LoadingState, ErrorState } from "@/pages/shared";

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

type CampusRole = "student" | "teacher" | "admin";

const roleOptions: { value: CampusRole; label: string; short: string }[] = [
  { value: "student", label: "Student", short: "ST" },
  { value: "teacher", label: "Teacher", short: "TR" },
  { value: "admin", label: "Admin", short: "AD" },
];

const typeLabels: Record<string, string> = {
  school: "School",
  class: "Class",
  subject: "Subject",
  club: "Club",
  project: "Project",
  event: "Event",
};

const typeIcon: Record<string, typeof Home> = {
  school: Library,
  class: BookOpen,
  subject: BookOpen,
  club: UsersRound,
  project: Sparkles,
  event: CalendarDays,
};

const accentColors: Record<string, string> = {
  terracotta: "#E76F51",
  saffron: "#D99A2B",
  teal: "#216F58",
  sky: "#4E8790",
  plum: "#73556F",
};

function accent(accentName: string | undefined, fallback = "#216F58") {
  return accentColors[accentName || ""] || accentName || fallback;
}

function LogoMark() {
  return (
    <div className="flex items-center gap-3" data-testid="brand-campus">
      <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-[14px] bg-[#F9F6F0] shadow-[4px_4px_0_#D99A2B]">
        <img
          src={`${basePath}/school-logo-mark.png`}
          alt=""
          className="h-full w-full object-contain"
        />
      </div>
      <div className="leading-none">
        <div className="font-display text-[15px] font-bold tracking-[-0.04em]">
          LYCÉE ABI MIZRAK
        </div>
        <div className="mt-1 font-mono-campus text-[9px] uppercase tracking-[0.17em] text-[#6D7A75]">
          digital campus
        </div>
      </div>
    </div>
  );
}

function LandingPage() {
  return (
    <div className="campus-shell flex min-h-[100dvh] flex-col bg-[#F5F0E6]">
      <header className="flex items-center justify-between border-b border-[#D9D1C2] px-5 py-5 md:px-12">
        <LogoMark />
        <div className="flex items-center gap-3">
          <Link
            href="/sign-in"
            className="rounded-xl px-4 py-2.5 text-sm font-bold text-[#59706A] hover:bg-[#E8EEE8]"
            data-testid="link-sign-in"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="rounded-xl bg-[#216F58] px-4 py-2.5 text-sm font-bold text-[#F5F0E6] shadow-[3px_3px_0_#D99A2B] hover:bg-[#1B5D4A]"
            data-testid="link-sign-up"
          >
            Create account
          </Link>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-[1180px] flex-1 items-center px-5 py-14 md:px-10 md:py-20">
        <div className="grid w-full gap-12 lg:grid-cols-[1.05fr_.95fr] lg:items-center">
          <section className="reveal">
            <div className="mb-4 font-mono-campus text-[10px] font-bold uppercase tracking-[.2em] text-[#E76F51]">
              A private school community
            </div>
            <h1 className="max-w-3xl font-display text-5xl font-bold leading-[.98] tracking-[-.07em] text-[#18332C] md:text-7xl">
              The lycée is <span className="text-[#216F58]">in motion.</span>
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-[#6C7D76]">
              Abi Mizrak brings classes, clubs, projects, and school identity
              into one trusted campus space — available only to verified
              members.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/sign-in"
                className="inline-flex items-center gap-2 rounded-xl bg-[#216F58] px-5 py-3.5 text-sm font-bold text-[#F5F0E6] shadow-[4px_4px_0_#D99A2B] hover:bg-[#1B5D4A]"
                data-testid="button-landing-sign-in"
              >
                Sign in to your campus <ArrowUpRight size={16} />
              </Link>
              <span className="inline-flex items-center gap-2 text-xs font-bold text-[#72817C]">
                <ShieldCheck size={15} className="text-[#216F58]" />
                School affiliation is reviewed by administrators
              </span>
            </div>
          </section>
          <section className="campus-grid relative overflow-hidden rounded-[28px] bg-[#E8EEE8] p-7 shadow-[var(--shadow-deep)] md:p-10">
            <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full border-[35px] border-[#D99A2B]/20" />
            <div className="relative space-y-4">
              {[
                [
                  "01",
                  "Sign in securely",
                  "Use your managed account to enter the campus.",
                ],
                [
                  "02",
                  "Request affiliation",
                  "Your membership and role are clearly marked while they are reviewed.",
                ],
                [
                  "03",
                  "Join the lycée",
                  "Approved members can access school spaces, activity, and their credential.",
                ],
              ].map(([number, title, detail]) => (
                <div
                  className="paper-card flex gap-4 rounded-2xl p-5"
                  key={number}
                >
                  <span className="font-mono-campus text-xs font-bold text-[#E76F51]">
                    {number}
                  </span>
                  <div>
                    <h2 className="font-display text-lg font-bold text-[#25423A]">
                      {title}
                    </h2>
                    <p className="mt-1 text-sm leading-5 text-[#71807A]">
                      {detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
      <footer className="px-5 py-6 text-center font-mono-campus text-[10px] uppercase tracking-[.15em] text-[#8A9690]">
        Abi Mizrak / Tlemcen, Algeria
      </footer>
    </div>
  );
}

function ProfileSetupPage({ status }: { status: VerificationStatus }) {
  const { signOut } = useAuthActions();
  const { user } = useUser();
  const updateProfile = useUpdateIdentityProfile();
  const [displayName, setDisplayName] = useState(
    user?.fullName || status.displayName || "",
  );
  const [className, setClassName] = useState("");
  const [requestedRole, setRequestedRole] = useState<"student" | "teacher">(
    "student",
  );
  const [error, setError] = useState("");
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    const data: IdentityProfileInput = {
      displayName: displayName.trim(),
      className: className.trim(),
      requestedRole,
    };
    if (data.displayName.length < 2 || data.className.length < 2) {
      setError("Please enter your real full name and class or department.");
      return;
    }
    updateProfile.mutate(
      { data },
      {
        onError: () =>
          setError("We could not save your school profile. Please try again."),
      },
    );
  };
  return (
    <div className="campus-shell flex min-h-[100dvh] flex-col bg-[#F5F0E6]">
      <header className="flex items-center justify-between border-b border-[#D9D1C2] px-5 py-5 md:px-12">
        <LogoMark />
        <button
          onClick={() => void signOut({ redirectUrl: basePath || "/" })}
          className="inline-flex items-center gap-2 rounded-xl border border-[#D9D1C2] bg-[#F9F6F0] px-4 py-2.5 text-sm font-bold text-[#59706A] hover:bg-[#E8EEE8]"
          data-testid="button-sign-out"
        >
          <LogOut size={15} />
          Sign out
        </button>
      </header>
      <main className="mx-auto flex w-full max-w-[840px] flex-1 items-center px-5 py-14 md:px-10">
        <section className="w-full reveal">
          <div className="mb-4 font-mono-campus text-[10px] font-bold uppercase tracking-[.2em] text-[#E76F51]">
            First step / your school profile
          </div>
          <h1 className="font-display text-4xl font-bold leading-tight tracking-[-.06em] text-[#18332C] md:text-6xl">
            Tell us who you are at the lycée.
          </h1>
          <p className="mt-5 max-w-2xl text-[15px] leading-7 text-[#6C7D76]">
            Use your real school information so the administration can check
            your affiliation. After you submit, you will see the verification
            status for your account.
          </p>
          <form
            onSubmit={submit}
            className="paper-card mt-8 space-y-5 rounded-[24px] p-6 md:p-8"
          >
            <label className="block">
              <span className="text-sm font-bold text-[#425C53]">
                Full name
              </span>
              <input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                autoComplete="name"
                className="mt-2 w-full rounded-xl border border-[#D9D1C2] bg-[#FBF9F4] px-4 py-3 text-sm text-[#29453D] outline-none focus:border-[#216F58]"
                placeholder="Your real first and last name"
                data-testid="input-profile-name"
              />
            </label>
            <label className="block">
              <span className="text-sm font-bold text-[#425C53]">
                Class or department
              </span>
              <input
                value={className}
                onChange={(event) => setClassName(event.target.value)}
                className="mt-2 w-full rounded-xl border border-[#D9D1C2] bg-[#FBF9F4] px-4 py-3 text-sm text-[#29453D] outline-none focus:border-[#216F58]"
                placeholder="For example: 2AS Sciences 03 or Physics Department"
                data-testid="input-profile-class"
              />
            </label>
            <label className="block">
              <span className="text-sm font-bold text-[#425C53]">
                I am joining as
              </span>
              <select
                value={requestedRole}
                onChange={(event) =>
                  setRequestedRole(event.target.value as "student" | "teacher")
                }
                className="mt-2 w-full rounded-xl border border-[#D9D1C2] bg-[#FBF9F4] px-4 py-3 text-sm font-bold capitalize text-[#29453D] outline-none focus:border-[#216F58]"
                data-testid="select-profile-role"
              >
                <option value="student">Student</option>
                <option value="teacher">Teacher or staff</option>
              </select>
            </label>
            {error && (
              <div
                className="rounded-xl border border-[#E7B9AD] bg-[#F6DDD6] px-4 py-3 text-sm font-bold text-[#8F3D2E]"
                role="alert"
              >
                {error}
              </div>
            )}
            <div className="flex flex-col gap-3 border-t border-[#E5DED2] pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-5 text-[#89958F]">
                Your information is only used for school affiliation review.
              </p>
              <button
                type="submit"
                disabled={updateProfile.isPending}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#216F58] px-5 py-3 text-sm font-bold text-[#F5F0E6] shadow-[3px_3px_0_#D99A2B] hover:bg-[#1B5D4A]"
                data-testid="button-submit-profile"
              >
                {updateProfile.isPending ? (
                  <LoaderCircle size={15} className="animate-spin" />
                ) : (
                  <ArrowUpRight size={15} />
                )}
                {updateProfile.isPending
                  ? "Saving profile…"
                  : "Continue to verification"}
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}

function VerificationGate({ status }: { status: VerificationStatus }) {
  const { signOut } = useAuthActions();
  const { user } = useUser();
  const membershipCopy: Record<
    string,
    { title: string; detail: string; tone: string }
  > = {
    pending: {
      title: "Your school affiliation is under review.",
      detail:
        "An administrator will confirm your membership and role before campus data becomes available.",
      tone: "bg-[#E9DCC8] text-[#725A4A]",
    },
    suspended: {
      title: "Your campus access is suspended.",
      detail:
        "Please contact the administration team at the lycée office for the next step.",
      tone: "bg-[#F6DDD6] text-[#8F3D2E]",
    },
    expired: {
      title: "Your school verification has expired.",
      detail:
        "An administrator needs to renew your affiliation before you can return to campus.",
      tone: "bg-[#E9DCC8] text-[#725A4A]",
    },
  };
  const copy =
    membershipCopy[status.membershipStatus] ?? membershipCopy.pending;
  return (
    <div className="campus-shell flex min-h-[100dvh] flex-col bg-[#F5F0E6]">
      <header className="flex items-center justify-between border-b border-[#D9D1C2] px-5 py-5 md:px-12">
        <LogoMark />
        <button
          onClick={() => void signOut({ redirectUrl: basePath || "/" })}
          className="inline-flex items-center gap-2 rounded-xl border border-[#D9D1C2] bg-[#F9F6F0] px-4 py-2.5 text-sm font-bold text-[#59706A] hover:bg-[#E8EEE8]"
          data-testid="button-sign-out"
        >
          <LogOut size={15} />
          Sign out
        </button>
      </header>
      <main className="mx-auto flex w-full max-w-[760px] flex-1 items-center px-5 py-14 md:px-10">
        <section className="w-full reveal">
          <div className="mb-4 font-mono-campus text-[10px] font-bold uppercase tracking-[.2em] text-[#E76F51]">
            Identity / verification
          </div>
          <h1 className="font-display text-4xl font-bold leading-tight tracking-[-.06em] text-[#18332C] md:text-6xl">
            {copy.title}
          </h1>
          <p className="mt-5 max-w-xl text-[15px] leading-7 text-[#6C7D76]">
            {copy.detail}
          </p>
          <div className={`mt-8 rounded-2xl p-5 ${copy.tone}`}>
            <div className="flex items-center gap-3">
              <ShieldAlert size={20} />
              <div>
                <div className="text-sm font-bold">
                  Signed in as {user?.fullName || status.displayName}
                </div>
                <div className="mt-1 text-xs opacity-80">
                  {user?.primaryEmailAddress?.emailAddress || "Managed account"}
                </div>
              </div>
            </div>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="paper-card rounded-2xl p-5">
              <div className="text-xs font-bold uppercase tracking-[.12em] text-[#89958F]">
                Membership
              </div>
              <div className="mt-2 font-display text-xl font-bold capitalize text-[#25423A]">
                {status.membershipStatus}
              </div>
            </div>
            <div className="paper-card rounded-2xl p-5">
              <div className="text-xs font-bold uppercase tracking-[.12em] text-[#89958F]">
                Role verification
              </div>
              <div className="mt-2 font-display text-xl font-bold capitalize text-[#25423A]">
                {status.roleStatus}
              </div>
            </div>
          </div>
          <p className="mt-7 text-sm leading-6 text-[#71807A]">
            Need a correction? Ask the administration team in person at the
            lycée office. Verification actions are recorded for accountability.
          </p>
        </section>
      </main>
    </div>
  );
}

type AppCampusShellProps = {
  children: ReactNode;
  role: CampusRole;
  displayName: string;
};

const AppCampusShell = ({
  children,
  role,
  displayName,
}: AppCampusShellProps): ReactElement => {
  return (
    <LiquidCampusLayout role={role} displayName={displayName}>
      {children}
    </LiquidCampusLayout>
  );
};

function CampusRouter({ status }: { status: VerificationStatus }) {
  const role: CampusRole = status.isAdministrator
    ? "admin"
    : (status.requestedRole as CampusRole);
  return (
    <AppCampusShell role={role} displayName={status.displayName}>
      <Switch>
        <Route path="/">
          <HomePage />
        </Route>
        <Route path="/spaces/:spaceId">
          <SpaceDetailPage />
        </Route>
        <Route path="/spaces">
          <SpacesPage />
        </Route>
        <Route path="/activity">
          <ActivityPage />
        </Route>
        <Route path="/academic">
          <AcademicPage />
        </Route>
        <Route path="/projects">
          <ProjectsDirectory />
        </Route>
        <Route path="/projects/:projectId">
          <ProjectDetailPage />
        </Route>
        <Route path="/talent">
          <TalentGraph />
        </Route>
        <Route path="/talent/:userId">
          <PortfolioPage />
        </Route>
        <Route path="/events">
          <EventsPage />
        </Route>
        <Route path="/teacher">
          {role === "teacher" || role === "admin" ? (
            <TeacherWorkspace />
          ) : (
            <Redirect to="/" />
          )}
        </Route>
        <Route path="/identity">
          <IdentityPage />
        </Route>
        <Route path="/admin">
          {role === "admin" ? <AdminCenterPage /> : <Redirect to="/" />}
        </Route>
        <Route path="/admin/verification">
          {role === "admin" ? <AdminVerificationPage /> : <Redirect to="/" />}
        </Route>
        <Route component={NotFound} />
      </Switch>
    </AppCampusShell>
  );
}

function AuthenticatedCampus() {
  const { data, isLoading, isError, refetch } = useGetVerificationStatus();
  const status = data as VerificationStatus | undefined;
  if (isLoading)
    return (
      <div className="campus-shell bg-[#F5F0E6] px-5 py-10 md:px-10">
        <LoadingState label="Checking your school affiliation" />
      </div>
    );
  if (isError || !status)
    return (
      <div className="campus-shell bg-[#F5F0E6] px-5 py-10 md:px-10">
        <ErrorState
          onRetry={() => void refetch()}
          label="We could not check your school affiliation"
        />
      </div>
    );
  if (!status.profileCompleted && !status.isAdministrator)
    return <ProfileSetupPage status={status} />;
  if (
    status.membershipStatus !== "approved" ||
    status.roleStatus !== "approved"
  )
    return <VerificationGate status={status} />;
  return <CampusRouter status={status} />;
}

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-5 bg-[#F5F0E6] px-4 py-10">
      <img
        src={`${basePath}/school-logo-mark.png`}
        alt="Lycée Abi Mizrak El-Mezrani"
        className="h-28 w-28 object-contain md:h-36 md:w-36"
      />
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
      />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-5 bg-[#F5F0E6] px-4 py-10">
      <img
        src={`${basePath}/school-logo-mark.png`}
        alt="Lycée Abi Mizrak El-Mezrani"
        className="h-28 w-28 object-contain md:h-36 md:w-36"
      />
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
      />
    </div>
  );
}

function AuthQueryClientCacheInvalidator() {
  const { addListener } = useAuthActions();
  const previousUserId = useRef<string | null | undefined>(undefined);
  const queryClient = useQueryClient();
  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        previousUserId.current !== undefined &&
        previousUserId.current !== userId
      )
        queryClient.clear();
      previousUserId.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);
  return null;
}

function SuperAdminConsole() {
  const { session } = useAuth();
  const [state, setState] = useState<{
    accessLevel?: string;
    email?: string;
    role?: string;
    capabilities?: string[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!session?.access_token) return;
    fetch(`${import.meta.env.VITE_API_URL ?? ""}/api/platform/superadmin`, {
      credentials: "include",
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then(async (response) => {
        const data = await response.json().catch(() => null);
        if (!response.ok) throw new Error(data?.error ?? "Access denied");
        setState(data);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Access denied"),
      );
  }, [session?.access_token]);
  if (error)
    return (
      <div className="min-h-[100dvh] bg-[#F5F0E6] p-8">
        <div className="mx-auto max-w-xl rounded-[28px] border border-[#E7B9AD] bg-[#FFF8F5] p-8">
          <h1 className="font-display text-2xl font-bold text-[#8F3D2E]">
            Privileged console
          </h1>
          <p className="mt-2 text-sm text-[#71807A]">{error}</p>
        </div>
      </div>
    );
  if (!state)
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#F5F0E6]">
        <LoaderCircle className="animate-spin text-[#216F58]" size={24} />
      </div>
    );
  return (
    <div className="min-h-[100dvh] bg-[#0B1210] p-8 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <div className="text-xs uppercase tracking-[.18em] text-white/50">
            Privileged platform console
          </div>
          <h1 className="mt-2 font-display text-4xl font-bold tracking-[-.04em]">
            Super Administrator
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/60">
            Unlisted from normal navigation. Access remains authenticated,
            server-side authorized, and audited.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[22px] border border-white/10 bg-white/5 p-5">
            <div className="text-xs text-white/50">Identity</div>
            <div className="mt-2 font-semibold">{state.email}</div>
          </div>
          <div className="rounded-[22px] border border-white/10 bg-white/5 p-5">
            <div className="text-xs text-white/50">Role</div>
            <div className="mt-2 font-semibold">{state.role}</div>
          </div>
          <div className="rounded-[22px] border border-white/10 bg-white/5 p-5">
            <div className="text-xs text-white/50">Access level</div>
            <div className="mt-2 font-semibold">{state.accessLevel}</div>
          </div>
        </div>
        <div className="mt-6 rounded-[22px] border border-white/10 bg-white/5 p-6">
          <div className="text-xs uppercase tracking-[.14em] text-white/50">
            Capabilities
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {state.capabilities?.map((capability) => (
              <span
                key={capability}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/75"
              >
                {capability}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AuthRouter() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded)
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#F5F0E6]">
        <LoaderCircle className="animate-spin text-[#216F58]" size={24} />
      </div>
    );
  if (!isSignedIn)
    return (
      <Switch>
        <Route path="/sign-in/*?" component={SignInPage} />
        <Route path="/sign-up/*?" component={SignUpPage} />
        <Route component={LandingPage} />
      </Switch>
    );
  return (
    <Switch>
      <Route path="/sign-in/*?" component={() => <Redirect to="/" />} />
      <Route path="/sign-up/*?" component={() => <Redirect to="/" />} />
      <Route path="/platform/control" component={SuperAdminConsole} />
      <Route component={AuthenticatedCampus} />
    </Switch>
  );
}

function AuthProviderWithRoutes() {
  const [, setLocation] = useLocation();
  const stripBase = (path: string) =>
    basePath && path.startsWith(basePath)
      ? path.slice(basePath.length) || "/"
      : path;
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <AuthQueryClientCacheInvalidator />
        <TooltipProvider>
          <ErrorBoundary>
            <AuthRouter />
          </ErrorBoundary>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}

function Router() {
  return (
    <WouterRouter base={basePath}>
      <AuthProviderWithRoutes />
    </WouterRouter>
  );
}

function App() {
  return <Router />;
}

export default App;
