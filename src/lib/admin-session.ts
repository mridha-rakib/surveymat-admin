export type DemoAdminAccount = {
  id: string
  name: string
  email: string
  role: string
}

export type AdminSession = {
  id: string
  name: string
  email: string
  role: string
  signedInAt: string
}

export const ADMIN_SESSION_STORAGE_KEY = "surveymate-admin-session-v1"

export const demoAdminAccounts: DemoAdminAccount[] = [
  {
    id: "admin-owner",
    name: "Avery Chen",
    email: "admin@surveymate.app",
    role: "Platform Owner",
  },
  {
    id: "admin-ops",
    name: "Nadia Rahman",
    email: "ops@surveymate.app",
    role: "Operations Lead",
  },
]

export const readAdminSession = (): AdminSession | null => {
  if (typeof window === "undefined") {
    return null
  }

  const raw = window.localStorage.getItem(ADMIN_SESSION_STORAGE_KEY)

  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as AdminSession
  } catch {
    window.localStorage.removeItem(ADMIN_SESSION_STORAGE_KEY)
    return null
  }
}

export const writeAdminSession = (account: DemoAdminAccount) => {
  if (typeof window === "undefined") {
    return
  }

  const session: AdminSession = {
    id: account.id,
    name: account.name,
    email: account.email,
    role: account.role,
    signedInAt: new Date().toISOString(),
  }

  window.localStorage.setItem(ADMIN_SESSION_STORAGE_KEY, JSON.stringify(session))
}

export const clearAdminSession = () => {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.removeItem(ADMIN_SESSION_STORAGE_KEY)
}

export const findDemoAdminByEmail = (email: string) =>
  demoAdminAccounts.find(
    (account) => account.email.toLowerCase() === email.trim().toLowerCase()
  )
