import { PageIntro, EmptyState } from "./shared";
import { CircleHelp } from "lucide-react";
import { Link } from "wouter";
import { usePreferences } from "@/i18n/runtime";

export default function NotFound() {
  const { t } = usePreferences();
  return (
    <div className="flex h-[80vh] flex-col items-center justify-center">
      <EmptyState
        icon={CircleHelp}
        title={t("page.notFound.title")}
        detail={t("page.notFound.detail")}
      />
      <div className="mt-8">
        <Link
          href="/"
          className="rounded-xl bg-[#25423A] px-6 py-3 font-bold text-white transition-colors hover:bg-[#1A2E28]"
        >
          {t("page.notFound.home")}
        </Link>
      </div>
    </div>
  );
}
