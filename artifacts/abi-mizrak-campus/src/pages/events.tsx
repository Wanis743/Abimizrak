import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";

type CampusEvent = {
  id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  attendeeStatus?: string | null;
};
import { LoadingState, ErrorState } from "./shared";
import { Calendar, MapPin, Clock } from "lucide-react";

export function EventsPage() {
  const queryClient = useQueryClient();
  const {
    data: events,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["campus_events"],
    queryFn: () => customFetch<CampusEvent[]>("/api/events"),
  });

  const rsvpMutation = useMutation({
    mutationFn: ({ eventId, status }: { eventId: string; status: string }) =>
      customFetch(`/api/events/${eventId}/rsvp`, {
        method: "POST",
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["campus_events"] });
    },
  });

  if (isLoading) return <LoadingState label="Loading events" />;
  if (isError)
    return (
      <ErrorState onRetry={() => refetch()} label="Failed to load events" />
    );

  return (
    <div className="flex h-full flex-col animate-in fade-in slide-in-from-bottom-4 duration-500 p-8 overflow-y-auto">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-bold text-[#25423A]">
          Campus Events
        </h1>
        <p className="mt-2 text-[#71807A]">
          Discover and join upcoming events happening around the campus.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {events?.map((event) => {
          const isGoing = event.attendeeStatus === "going";
          return (
            <div
              key={event.id}
              className="flex flex-col rounded-3xl border border-[#D9D1C2] bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <h2 className="text-xl font-bold text-[#25423A]">
                {event.title}
              </h2>
              <p className="mt-3 text-sm text-[#71807A] flex-1">
                {event.description}
              </p>

              <div className="mt-5 space-y-2.5 text-sm text-[#59706A]">
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-[#216F58]" />
                  <span className="font-medium">
                    {event.startTime ? new Date(event.startTime).toLocaleDateString() : "Date pending"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-[#216F58]" />
                  <span className="font-medium">
                    {event.startTime ? new Date(event.startTime).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    }) : "Time pending"}{" "}
                    -
                    {event.endTime ? new Date(event.endTime).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    }) : "Time pending"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-[#216F58]" />
                  <span className="font-medium">{event.location}</span>
                </div>
              </div>

              <div className="mt-6 flex gap-2 pt-4 border-t border-[#F0ECE3]">
                <button
                  onClick={() =>
                    rsvpMutation.mutate({
                      eventId: event.id,
                      status: isGoing ? "declined" : "going",
                    })
                  }
                  disabled={rsvpMutation.isPending}
                  className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors ${
                    isGoing
                      ? "bg-[#E5EFE6] text-[#216F58] hover:bg-[#D4E4D5]"
                      : "bg-[#216F58] text-white hover:bg-[#1B5D4A]"
                  }`}
                >
                  {isGoing ? "Going (Click to cancel)" : "RSVP to Event"}
                </button>
              </div>
            </div>
          );
        })}
        {events?.length === 0 && (
          <div className="col-span-full py-12 text-center text-[#89958F]">
            No upcoming events at the moment. Check back later!
          </div>
        )}
      </div>
    </div>
  );
}
