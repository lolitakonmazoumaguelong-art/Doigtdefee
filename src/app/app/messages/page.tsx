import { deleteMessage, unpinMessage } from "@/actions/messages";
import { MessageComposer } from "@/components/message-composer";
import { requireSession } from "@/lib/auth";
import { listMessages } from "@/lib/queries";

export const metadata = { title: "Team" };

const dayFormat = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "Indian/Mauritius" });
const timeFormat = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Indian/Mauritius" });

export default async function MessagesPage() {
  const { org, user } = await requireSession();
  const messages = await listMessages(org.id);
  const isOwner = user.role === "owner";
  const pinned = messages.filter((m) => m.pinned);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="page-title">Team</h1>
        <p className="mt-2 text-sm text-muted">The {org.name} team thread. Everyone can see it.</p>
      </header>

      {pinned.length > 0 && (
        <section className="rounded-2xl border border-ink/20 bg-chalk/40 p-4 sm:p-5">
          <h2 className="label">Pinned notices</h2>
          <ul className="space-y-3">
            {pinned.map((m) => (
              <li key={m.id} className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm break-words whitespace-pre-line">{m.body}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {m.authorName} · {dayFormat.format(m.createdAt)}
                  </p>
                </div>
                {isOwner && (
                  <form action={unpinMessage}>
                    <input type="hidden" name="id" value={m.id} />
                    <button className="cursor-pointer text-xs text-muted underline underline-offset-4 hover:text-ink">
                      Unpin
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {messages.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="font-display text-2xl">The thread is empty</p>
          <p className="mt-2 text-sm text-muted">
            Start the conversation: the weekly schedule, equipment to order, feedback from a job.
          </p>
        </div>
      ) : (
        <ol className="space-y-3">
          {messages.map((m, index) => {
            const mine = m.userId === user.id;
            const day = dayFormat.format(m.createdAt);
            const showDay = index === 0 || day !== dayFormat.format(messages[index - 1].createdAt);
            return (
              <li key={m.id}>
                {showDay && <p className="my-4 text-center text-xs text-muted first-letter:uppercase">{day}</p>}
                <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                      mine ? "bg-ink text-paper" : "border border-line bg-card"
                    }`}
                  >
                    <p className={`text-xs font-medium ${mine ? "text-paper/70" : "text-muted"}`}>
                      {mine ? "Me" : m.authorName} · {timeFormat.format(m.createdAt)}
                      {m.pinned && " · Notice"}
                    </p>
                    <p className="mt-0.5 text-sm break-words whitespace-pre-line">{m.body}</p>
                    {(mine || isOwner) && (
                      <form action={deleteMessage} className="mt-1 text-right">
                        <input type="hidden" name="id" value={m.id} />
                        <button
                          className={`cursor-pointer text-xs underline underline-offset-4 ${
                            mine ? "text-paper/60 hover:text-paper" : "text-muted hover:text-ink"
                          }`}
                        >
                          Delete
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <MessageComposer canPin={isOwner} count={messages.length} />
    </div>
  );
}
