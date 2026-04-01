import { useState } from "react"
import { Link } from "react-router-dom"
import { ArrowLeft, MailCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import { AdminAuthShell } from "@/components/admin-auth-shell"

export function AdminForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)

  return (
    <AdminAuthShell
      eyebrow="Password Recovery"
      title="Keep the admin auth flow complete."
      description="This page exists now so the admin-side journey is properly organized before backend auth is connected. It also gives the future password reset API a stable route to plug into."
      highlightTitle="Why This Route Exists"
      highlights={[
        "Operators should not jump directly into dashboard screens without an auth entry point.",
        "Forgot-password and login routes make the final navigation structure realistic.",
        "The current action is intentionally a frontend placeholder only.",
      ]}
    >
      {sent ? (
        <div className="rounded-[1.8rem] border border-[var(--brand-sky-200)] bg-[var(--brand-sky-50)] p-6">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-[var(--brand-sky-100)] text-[var(--brand-sky-700)]">
            <MailCheck className="size-5" />
          </div>
          <h2 className="mt-5 text-2xl font-semibold tracking-[-0.04em] text-foreground">
            Reset flow staged
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            A production reset email would go to {email}. For now, this screen completes the admin authentication flow and keeps routing consistent.
          </p>
          <Link
            to="/login"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--brand-sky-600)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--brand-sky-700)]"
          >
            <ArrowLeft className="size-4" />
            Return to login
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-[var(--brand-sky-900)]">
              Admin email
            </span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="admin@surveymate.app"
              className="h-12 rounded-2xl border border-[var(--brand-sky-200)] bg-[var(--brand-sky-50)] px-4 text-sm text-foreground outline-none transition focus:border-[var(--brand-sky-500)] focus:bg-white"
            />
          </label>

          <p className="text-sm leading-6 text-muted-foreground">
            This route is designed now and will become functional when backend auth is introduced.
          </p>

          <Button
            className="h-12 rounded-full"
            disabled={!email.trim()}
            onClick={() => setSent(true)}
          >
            Continue
          </Button>
        </div>
      )}
    </AdminAuthShell>
  )
}
