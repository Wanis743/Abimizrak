import { useState, useEffect, useRef } from "react";
import { Send, LoaderCircle } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { customFetch } from "@workspace/api-client-react";
import { supabase } from "@/lib/supabase";

interface Message {
  id: string;
  userId?: string;
  user_id?: string;
  content: string;
  createdAt?: string;
  created_at?: string;
}
const messageUserId = (message: Message) =>
  message.userId ?? message.user_id ?? "";

export function ChannelChat({
  spaceId,
  channelId,
}: {
  spaceId: string;
  channelId: string;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void customFetch<Message[]>(
      `/api/spaces/${encodeURIComponent(spaceId)}/channels/${encodeURIComponent(channelId)}/messages`,
    )
      .then((data) => {
        if (active) {
          setMessages(data);
          void customFetch(
            `/api/spaces/${encodeURIComponent(spaceId)}/channels/${encodeURIComponent(channelId)}/read`,
            { method: "POST" },
          ).catch(() => {});
        }
      })
      .catch(() => {
        if (active) setMessages([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    // Realtime is intentionally used only as a delivery signal; the API remains the source of truth.
    const channel = supabase
      .channel(`room:${spaceId}:${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "campus_messages",
          filter: `channel_id=eq.${channelId}`,
        },
        () => {
          void customFetch<Message[]>(
            `/api/spaces/${encodeURIComponent(spaceId)}/channels/${encodeURIComponent(channelId)}/messages`,
          )
            .then((data) => {
              if (active) {
                setMessages(data);
                void customFetch(
                  `/api/spaces/${encodeURIComponent(spaceId)}/channels/${encodeURIComponent(channelId)}/read`,
                  { method: "POST" },
                ).catch(() => {});
              }
            })
            .catch(() => {});
        },
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [spaceId, channelId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSendMessage = async () => {
    const content = newMessage.trim();
    if (!content || !user?.id) return;
    setNewMessage("");
    try {
      const created = await customFetch<Message>(
        `/api/spaces/${encodeURIComponent(spaceId)}/channels/${encodeURIComponent(channelId)}/messages`,
        { method: "POST", body: JSON.stringify({ content }) },
      );
      setMessages((current) => [...current, created]);
    } catch {
      setNewMessage(content);
    }
  };

  return (
    <section className="liquid-surface flex h-[600px] flex-col p-6 md:p-8">
      <div className="flex shrink-0 items-center justify-between border-b border-[var(--lc-line)] pb-5">
        <div>
          <div className="lc-eyebrow"># {channelId} / this space</div>
          <h2 className="mt-1 font-display text-2xl font-bold tracking-[-.04em]">
            Conversation
          </h2>
        </div>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto py-4">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <LoaderCircle className="animate-spin text-[var(--lc-accent)]" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-sm font-bold text-[var(--lc-ink)]">
              The conversation starts here.
            </p>
            <p className="mt-1 max-w-sm text-xs leading-5 text-[var(--lc-muted)]">
              Start a thread and keep the discussion tied to this Space.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const own = messageUserId(msg) === user?.id;
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${own ? "items-end" : "items-start"}`}
              >
                <div className="mb-1 text-xs text-[var(--lc-muted)]">
                  {messageUserId(msg).slice(0, 8)}
                </div>
                <div
                  className={`max-w-[80%] rounded-[20px] px-4 py-3 text-sm ${own ? "lc-message-own" : "lc-message-other"}`}
                >
                  {msg.content}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
      <div className="mt-4 shrink-0 border-t border-[var(--lc-line)] pt-4">
        <div className="lc-composer">
          <input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleSendMessage();
            }}
            className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-[var(--lc-muted)]"
            placeholder={`Message #${channelId}...`}
          />
          <button
            onClick={() => void handleSendMessage()}
            disabled={!newMessage.trim()}
            className="lc-icon-button"
            aria-label="Send message"
          >
            <Send size={17} />
          </button>
        </div>
      </div>
    </section>
  );
}
