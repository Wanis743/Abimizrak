
import { useQuery } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { Link } from "wouter";
import { PageIntro, EmptyState, ErrorState } from "./shared";
import { LoaderCircle, Search, User, Briefcase, ExternalLink, Network } from "lucide-react";
import { useState } from "react";

export function TalentGraph() {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: portfolios, isLoading, isError, refetch } = useQuery({
    queryKey: ["talent-graph"],
    queryFn: () => customFetch<any[]>('/api/talent'),
  });

  const filteredPortfolios = portfolios?.filter((p: any) => 
    p.member?.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.bio?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.skills?.some((s: any) => s.skill?.name?.toLowerCase().includes(searchTerm.toLowerCase()))
  ) || [];

  return (
    <div className="mx-auto max-w-5xl h-full flex flex-col">
      <PageIntro 
        eyebrow="The Network" 
        title="Talent Graph" 
        detail="Discover students, view their skills, and find teammates for your next project."
      />

      <div className="mb-6 flex items-center rounded-xl border border-[#D9D1C2] bg-white px-3 shadow-sm">
        <Search className="text-[#89958F]" size={20} />
        <input 
          type="text"
          placeholder="Search by name, skill, or bio..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-transparent p-3 text-sm outline-none text-[#25423A]"
        />
      </div>

      <div className="flex-1 overflow-y-auto pb-8">
        {isLoading ? (
          <div className="flex justify-center py-12"><LoaderCircle className="animate-spin text-[#216F58]" size={32} /></div>
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : filteredPortfolios.length === 0 ? (
          <EmptyState 
            icon={Network} 
            title="No talent found" 
            detail="Try adjusting your search terms." 
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredPortfolios.map((portfolio: any) => (
              <Link key={portfolio.id} href={`/talent/${portfolio.user_id}`}>
                <div className="group flex h-full cursor-pointer flex-col rounded-2xl border border-[#D9D1C2] bg-white p-5 transition-all hover:-translate-y-1 hover:border-[#216F58] hover:shadow-lg hover:shadow-[#216F58]/10 relative">
                  {portfolio.looking_for_team && (
                    <div className="absolute -top-3 -right-3 rounded-full bg-[#216F58] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm flex items-center gap-1">
                      <Briefcase size={12} /> Seeking Team
                    </div>
                  )}
                  
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#E5EFE6] text-lg font-bold text-[#216F58]">
                      {portfolio.member?.display_name?.charAt(0) || <User size={20} />}
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-[#25423A] group-hover:text-[#216F58]">
                        {portfolio.member?.display_name || "Anonymous Student"}
                      </h3>
                      {portfolio.member?.role && (
                        <div className="text-[10px] font-bold uppercase tracking-wider text-[#89958F]">
                          {portfolio.member.role}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <p className="line-clamp-3 text-sm text-[#59706A] mb-4 flex-1">
                    {portfolio.bio || "No bio provided."}
                  </p>
                  
                  {portfolio.skills && portfolio.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-auto">
                      {portfolio.skills.slice(0, 3).map((skill: any) => (
                        <span key={skill.id} className="rounded-md bg-[#F4F1EA] px-2 py-1 text-[10px] font-bold text-[#59706A]">
                          {skill.skill?.name || "Unknown Skill"}
                        </span>
                      ))}
                      {portfolio.skills.length > 3 && (
                        <span className="rounded-md bg-[#F4F1EA] px-2 py-1 text-[10px] font-bold text-[#59706A]">
                          +{portfolio.skills.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

