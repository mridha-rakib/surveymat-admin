import { type ReactNode } from "react"
import { ShieldCheck, WalletCards, UsersRound } from "lucide-react"

const defaultHighlights = [
  "Campaign setup with recipient imports and release pacing",
  "Moderation queue for screenshots, summaries, and sentiment scores",
  "Payout controls, warnings, stars, and withdrawal visibility",
]

export function AdminAuthShell({
  eyebrow,
  title,
  description,
  children,
  highlightTitle = "Admin Flow",
  highlights = defaultHighlights,
}: {
  eyebrow: string
  title: string
  description: string
  children: ReactNode
  highlightTitle?: string
  highlights?: string[]
}) {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f7faff,#eef4ff)] px-6 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-[2.25rem] border border-[var(--brand-sky-200)] bg-[linear-gradient(145deg,#ffffff,#eef4ff)] p-8 shadow-[0_28px_90px_rgba(29,78,216,0.08)]">
          <div className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-sky-100)] px-4 py-2 text-sm font-semibold text-[var(--brand-sky-700)]">
            <ShieldCheck className="size-4" />
            {eyebrow}
          </div>
          <h1 className="mt-6 max-w-3xl text-5xl font-semibold tracking-[-0.06em] text-foreground sm:text-6xl">
            {title}
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
            {description}
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              {
                label: "Campaign routing",
                detail: "Task management now has its own route instead of a tab-only dashboard state.",
                icon: UsersRound,
              },
              {
                label: "Moderation flow",
                detail: "Reviews, worker controls, and payout views are independently addressable screens.",
                icon: ShieldCheck,
              },
              {
                label: "Payout visibility",
                detail: "The admin ledger and withdrawal queue remain tied to the same local demo state.",
                icon: WalletCards,
              },
            ].map(({ label, detail, icon: Icon }) => (
              <div
                key={label}
                className="rounded-[1.6rem] border border-[var(--brand-sky-200)] bg-white/92 p-5"
              >
                <div className="flex size-11 items-center justify-center rounded-2xl bg-[var(--brand-sky-100)] text-[var(--brand-sky-700)]">
                  <Icon className="size-5" />
                </div>
                <p className="mt-4 text-sm font-semibold text-[var(--brand-sky-900)]">
                  {label}
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {detail}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-[1.8rem] bg-[linear-gradient(145deg,#1d4ed8,#60a5fa)] p-6 text-white">
            <p className="text-sm font-semibold tracking-[0.2em] text-white/72 uppercase">
              {highlightTitle}
            </p>
            <div className="mt-5 grid gap-3">
              {highlights.map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm leading-6 text-white/84"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-[2.25rem] border border-[var(--brand-sky-200)] bg-white/94 p-8 shadow-[0_28px_90px_rgba(29,78,216,0.08)]">
          <div>
            <p className="text-xs font-semibold tracking-[0.22em] text-[var(--brand-sky-500)] uppercase">
              Admin Access
            </p>
            <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-foreground">
              Frontend-only control surface
            </p>
          </div>
          <div className="mt-8">{children}</div>
        </section>
      </div>
    </main>
  )
}
