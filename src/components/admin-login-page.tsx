import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { ArrowRight, MailOpen, ShieldCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import { AdminAuthShell } from "@/components/admin-auth-shell"
import {
  demoAdminAccounts,
  findDemoAdminByEmail,
  readAdminSession,
  writeAdminSession,
} from "@/lib/admin-session"

export function AdminLoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState(demoAdminAccounts[0].email)
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const session = readAdminSession()

    if (session) {
      navigate("/overview", { replace: true })
    }
  }, [navigate])

  const handleLogin = () => {
    const account = findDemoAdminByEmail(email)

    if (!account) {
      setError("Use one of the seeded admin emails shown below for demo access.")
      return
    }

    if (!password.trim()) {
      setError("Enter any password to continue in this frontend-only admin demo.")
      return
    }

    writeAdminSession(account)
    navigate("/overview")
  }

  return (
    <AdminAuthShell
      eyebrow="Admin Login"
      title="Enter the admin control flow."
      description="This access screen organizes the admin app as a proper routed product: login first, then overview, campaigns, reviews, users, and payouts."
      highlightTitle="Seeded Demo Accounts"
      highlights={demoAdminAccounts.map(
        (account) => `${account.role}: ${account.email}`
      )}
    >
      <div className="space-y-5">
        <div className="rounded-[1.5rem] border border-[var(--brand-sky-200)] bg-[var(--brand-sky-50)] px-5 py-4">
          <p className="text-sm font-semibold text-[var(--brand-sky-900)]">
            Demo-only authentication
          </p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            The login screen is intentionally frontend-only for now. It preserves the final flow structure without introducing backend auth yet.
          </p>
        </div>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-[var(--brand-sky-900)]">Email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="h-12 rounded-2xl border border-[var(--brand-sky-200)] bg-[var(--brand-sky-50)] px-4 text-sm text-foreground outline-none transition focus:border-[var(--brand-sky-500)] focus:bg-white"
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-[var(--brand-sky-900)]">Password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter any password"
            className="h-12 rounded-2xl border border-[var(--brand-sky-200)] bg-[var(--brand-sky-50)] px-4 text-sm text-foreground outline-none transition focus:border-[var(--brand-sky-500)] focus:bg-white"
          />
        </label>

        <div className="flex items-center justify-between gap-4 text-sm">
          <p className="text-muted-foreground">
            Use one of the seeded admin emails listed on the left.
          </p>
          <Link
            to="/forgot-password"
            className="font-medium text-[var(--brand-sky-700)] transition hover:text-[var(--brand-sky-900)]"
          >
            Forgot password
          </Link>
        </div>

        {error ? (
          <div className="rounded-[1.4rem] border border-[rgba(239,68,68,0.16)] bg-[rgba(239,68,68,0.08)] px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        ) : null}

        <Button className="h-12 w-full rounded-full" onClick={handleLogin}>
          Sign In to Admin
          <ArrowRight className="size-4" />
        </Button>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-[1.4rem] border border-[var(--brand-sky-200)] bg-white px-4 py-4 text-sm leading-6 text-muted-foreground">
            <MailOpen className="mb-3 size-4 text-[var(--brand-sky-700)]" />
            Campaign creation, CSV imports, and release pacing are all routed after login.
          </div>
          <div className="rounded-[1.4rem] border border-[var(--brand-sky-200)] bg-white px-4 py-4 text-sm leading-6 text-muted-foreground">
            <ShieldCheck className="mb-3 size-4 text-[var(--brand-sky-700)]" />
            Reviews, warnings, bans, and payouts are all separated into dedicated pages.
          </div>
        </div>
      </div>
    </AdminAuthShell>
  )
}
