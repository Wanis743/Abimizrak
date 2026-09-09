
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { useUser } from "@/lib/auth";
import { useParams } from "wouter";
import { PageIntro, ErrorState } from "./shared";
import { LoaderCircle, User, Github, Linkedin, Briefcase, Plus, X } from "lucide-react";
import { useState, useEffect } from "react";

export function PortfolioPage() {
  const { user } = useUser();
  const { userId } = useParams();
  const queryClient = useQueryClient();
  
  const isOwner = user?.id === userId;
  
  const [isEditing, setIsEditing] = useState(false);
  const [bio, setBio] = useState("");
  const [github, setGithub] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [seekingTeam, setSeekingTeam] = useState(false);
  
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["portfolio", userId],
    queryFn: () => customFetch<any>(`/api/talent/${userId}`),
    enabled: !!userId,
  });

  useEffect(() => {
    if (data?.portfolio) {
      setBio(data.portfolio.bio || "");
      setGithub(data.portfolio.github_url || "");
      setLinkedin(data.portfolio.linkedin_url || "");
      setSeekingTeam(data.portfolio.looking_for_team || false);
    }
  }, [data?.portfolio, isEditing]);

  const updatePortfolio = useMutation({
    mutationFn: async (updates: any) => customFetch(`/api/talent/${userId}`, { method: "PUT", body: JSON.stringify(updates) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolio", userId] });
      queryClient.invalidateQueries({ queryKey: ["talent-graph"] });
      setIsEditing(false);
    }
  });
  
  const addSkill = useMutation({
    mutationFn: async (skillId: string) => customFetch(`/api/talent/${userId}/skills`, { method: "POST", body: JSON.stringify({ skillId, proficiency: "beginner" }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["portfolio", userId] })
  });

  const removeSkill = useMutation({
    mutationFn: async (id: string) => customFetch(`/api/talent/${userId}/skills/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["portfolio", userId] })
  });

  const handleSave = () => {
    updatePortfolio.mutate({
      bio,
      github_url: github,
      linkedin_url: linkedin,
      looking_for_team: seekingTeam
    });
  };

  if (isLoading) return <div className="flex justify-center py-12"><LoaderCircle className="animate-spin text-[#216F58]" size={32} /></div>;
  if (isError || !data) return <ErrorState onRetry={() => void refetch()} />;

  const availableSkills = data.allSkills.filter((s: any) => !data.skills.some((ms: any) => ms.skill_id === s.id));

  return (
    <div className="mx-auto max-w-3xl h-full flex flex-col pb-12">
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#25423A] text-2xl font-bold text-white shadow-md">
            {data.member?.display_name?.charAt(0) || <User size={32} />}
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold text-[#25423A]">
              {data.member?.display_name || "Anonymous Student"}
            </h1>
            {data.member?.role && (
              <div className="mt-1 text-sm font-bold uppercase tracking-wider text-[#89958F]">
                {data.member.role}
              </div>
            )}
          </div>
        </div>
        
        {isOwner && !isEditing && (
          <button onClick={() => setIsEditing(true)} className="rounded-xl bg-[#E5EFE6] px-4 py-2 text-sm font-bold text-[#216F58] hover:bg-[#DDE8DF]">
            Edit Profile
          </button>
        )}
      </div>

      <div className="space-y-6">
        {/* Status */}
        {(isEditing || seekingTeam) && (
          <div className="rounded-2xl border border-[#D9D1C2] bg-white p-6 shadow-sm">
            <h2 className="font-display text-lg font-bold text-[#25423A] mb-4">Status</h2>
            {isEditing ? (
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={seekingTeam} onChange={(e) => setSeekingTeam(e.target.checked)} className="h-5 w-5 rounded border-[#D9D1C2] text-[#216F58] focus:ring-[#216F58]" />
                <span className="font-bold text-[#59706A]">I am looking for a team to join</span>
              </label>
            ) : (
              <div className="flex items-center gap-2 text-[#216F58] font-bold">
                <Briefcase size={18} /> Available for projects
              </div>
            )}
          </div>
        )}

        {/* Bio */}
        <div className="rounded-2xl border border-[#D9D1C2] bg-white p-6 shadow-sm">
          <h2 className="font-display text-lg font-bold text-[#25423A] mb-4">About Me</h2>
          {isEditing ? (
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell everyone a bit about yourself..."
              className="w-full min-h-[100px] rounded-xl border border-[#D9D1C2] bg-[#FBF9F4] p-3 text-[#25423A] outline-none focus:border-[#216F58] focus:ring-1 focus:ring-[#216F58]"
            />
          ) : (
            <p className="text-[#59706A] whitespace-pre-wrap">{bio || "No bio provided yet."}</p>
          )}
        </div>

        {/* Links */}
        <div className="rounded-2xl border border-[#D9D1C2] bg-white p-6 shadow-sm">
          <h2 className="font-display text-lg font-bold text-[#25423A] mb-4">Links</h2>
          {isEditing ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Github className="text-[#89958F]" size={20} />
                <input
                  type="url"
                  value={github}
                  onChange={(e) => setGithub(e.target.value)}
                  placeholder="GitHub URL"
                  className="flex-1 rounded-xl border border-[#D9D1C2] bg-[#FBF9F4] p-2 text-[#25423A] outline-none focus:border-[#216F58] focus:ring-1 focus:ring-[#216F58]"
                />
              </div>
              <div className="flex items-center gap-3">
                <Linkedin className="text-[#89958F]" size={20} />
                <input
                  type="url"
                  value={linkedin}
                  onChange={(e) => setLinkedin(e.target.value)}
                  placeholder="LinkedIn URL"
                  className="flex-1 rounded-xl border border-[#D9D1C2] bg-[#FBF9F4] p-2 text-[#25423A] outline-none focus:border-[#216F58] focus:ring-1 focus:ring-[#216F58]"
                />
              </div>
            </div>
          ) : (
            <div className="flex gap-4">
              {github && (
                <a href={github} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[#59706A] hover:text-[#216F58] font-bold">
                  <Github size={20} /> GitHub
                </a>
              )}
              {linkedin && (
                <a href={linkedin} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[#59706A] hover:text-[#216F58] font-bold">
                  <Linkedin size={20} /> LinkedIn
                </a>
              )}
              {!github && !linkedin && <span className="text-[#89958F] italic">No links added.</span>}
            </div>
          )}
        </div>

        {/* Skills */}
        <div className="rounded-2xl border border-[#D9D1C2] bg-white p-6 shadow-sm">
          <h2 className="font-display text-lg font-bold text-[#25423A] mb-4">Skills</h2>
          <div className="flex flex-wrap gap-2">
            {data.skills.map((ms: any) => (
              <div key={ms.id} className="flex items-center gap-1 rounded-lg bg-[#E5EFE6] px-3 py-1.5 text-sm font-bold text-[#216F58]">
                {ms.skill?.name}
                {isEditing && (
                  <button onClick={() => removeSkill.mutate(ms.id)} className="ml-1 rounded-full p-0.5 hover:bg-[#DDE8DF] text-[#1B5D4A]">
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
            {data.skills.length === 0 && !isEditing && (
              <span className="text-[#89958F] italic">No skills listed.</span>
            )}
          </div>
          
          {isEditing && availableSkills.length > 0 && (
            <div className="mt-6 border-t border-[#E5DED2] pt-4">
              <h3 className="text-sm font-bold text-[#89958F] mb-3 uppercase tracking-wider">Add a Skill</h3>
              <div className="flex flex-wrap gap-2">
                {availableSkills.map((s: any) => (
                  <button 
                    key={s.id} 
                    onClick={() => addSkill.mutate(s.id)}
                    className="flex items-center gap-1 rounded-lg border border-[#D9D1C2] bg-white px-3 py-1.5 text-sm font-bold text-[#59706A] hover:border-[#216F58] hover:text-[#216F58]"
                  >
                    <Plus size={14} /> {s.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {isEditing && (
          <div className="flex justify-end gap-3 mt-8">
            <button 
              onClick={() => setIsEditing(false)}
              className="rounded-xl px-6 py-2 font-bold text-[#59706A] hover:bg-[#E8EEE8]"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave}
              disabled={updatePortfolio.isPending}
              className="rounded-xl bg-[#216F58] px-6 py-2 font-bold text-white hover:bg-[#1B5D4A] disabled:opacity-50 flex items-center gap-2"
            >
              {updatePortfolio.isPending && <LoaderCircle className="animate-spin" size={16} />}
              Save Changes
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

