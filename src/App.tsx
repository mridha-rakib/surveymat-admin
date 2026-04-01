import {
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react"
import {
  AlertTriangle,
  BadgeDollarSign,
  CheckCheck,
  ClipboardCheck,
  LayoutDashboard,
  LogOut,
  MailOpen,
  PauseCircle,
  PlayCircle,
  PlusCircle,
  ShieldAlert,
  ShieldCheck,
  Star,
  Upload,
  UsersRound,
  WalletCards,
  type LucideIcon,
} from "lucide-react"
import { useLocation, useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import {
  createInitialAdminWorkspaceState,
  surveymateRules,
  type AdminView,
  type AdminWorkspaceState,
  type Campaign,
  type CampaignStatus,
  type PayoutRow,
  type PayoutStatus,
  type ReviewItem,
  type ReviewStatus,
  type WithdrawalRequest,
  type Worker,
  type WorkerStatus,
} from "@/lib/admin-workspace-data"
import { getAdminPath, getAdminViewFromPath } from "@/lib/admin-routes"
import { clearAdminSession, readAdminSession } from "@/lib/admin-session"
import { cn } from "@/lib/utils"

const STORAGE_KEY = "surveymate-admin-workspace-v2"
const RELEASE_STEP = 15

type NoticeTone = "info" | "success" | "warning"

type Notice = {
  message: string
  tone: NoticeTone
} | null

type CampaignDraft = {
  name: string
  category: string
  reward: string
  quantity: string
  startDate: string
  endDate: string
  messageTemplate: string
  recipientsText: string
}

const navItems: Array<{
  view: AdminView
  label: string
  icon: LucideIcon
  description: string
}> = [
  {
    view: "overview",
    label: "Overview",
    icon: LayoutDashboard,
    description: "Command center",
  },
  {
    view: "campaigns",
    label: "Campaigns",
    icon: MailOpen,
    description: "Create and pace tasks",
  },
  {
    view: "reviews",
    label: "Reviews",
    icon: ClipboardCheck,
    description: "Approve or flag proof",
  },
  {
    view: "users",
    label: "Users",
    icon: UsersRound,
    description: "Warnings, stars, bans",
  },
  {
    view: "payouts",
    label: "Payouts",
    icon: WalletCards,
    description: "Release and settle balances",
  },
]

const campaignStatusStyles: Record<CampaignStatus, string> = {
  draft: "bg-[var(--brand-sky-100)] text-[var(--brand-sky-700)]",
  live: "bg-[rgba(37,99,235,0.16)] text-[var(--brand-sky-700)]",
  paused: "bg-[rgba(37,99,235,0.12)] text-[var(--brand-sky-900)]",
  completed: "bg-[rgba(37,99,235,0.22)] text-[var(--brand-sky-900)]",
}

const reviewStatusStyles: Record<ReviewStatus, string> = {
  pending: "bg-[var(--brand-sky-100)] text-[var(--brand-sky-700)]",
  approved: "bg-[rgba(34,197,94,0.15)] text-[var(--brand-success)]",
  flagged: "bg-[rgba(239,68,68,0.12)] text-[var(--brand-danger)]",
}

const workerStatusStyles: Record<WorkerStatus, string> = {
  active: "bg-[rgba(37,99,235,0.16)] text-[var(--brand-sky-700)]",
  watch: "bg-[rgba(245,158,11,0.15)] text-[var(--brand-warning)]",
  banned: "bg-[rgba(239,68,68,0.12)] text-[var(--brand-danger)]",
}

const payoutStatusStyles: Record<PayoutStatus, string> = {
  hold: "bg-[rgba(245,158,11,0.15)] text-[var(--brand-warning)]",
  ready: "bg-[rgba(37,99,235,0.16)] text-[var(--brand-sky-700)]",
  scheduled: "bg-[rgba(59,130,246,0.14)] text-[var(--brand-sky-800)]",
  paid: "bg-[rgba(34,197,94,0.15)] text-[var(--brand-success)]",
}

const withdrawalStatusStyles: Record<WithdrawalRequest["status"], string> = {
  processing: "bg-[var(--brand-sky-100)] text-[var(--brand-sky-700)]",
  scheduled: "bg-[rgba(59,130,246,0.14)] text-[var(--brand-sky-800)]",
  paid: "bg-[rgba(34,197,94,0.15)] text-[var(--brand-success)]",
  hold: "bg-[rgba(245,158,11,0.15)] text-[var(--brand-warning)]",
}

const emptyCampaignDraft = (): CampaignDraft => ({
  name: "",
  category: "",
  reward: "",
  quantity: "",
  startDate: "",
  endDate: "",
  messageTemplate: "",
  recipientsText: "",
})

const roundCurrency = (value: number) => Math.round(value * 100) / 100

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value)

const formatShortDate = (value: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(value))

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value))

const deriveWorkerStatus = (warnings: number, forceBanned = false): WorkerStatus => {
  if (forceBanned || warnings >= surveymateRules.banWarningCount) {
    return "banned"
  }

  if (warnings >= 2) {
    return "watch"
  }

  return "active"
}

const derivePayoutStatus = (
  workerStatus: WorkerStatus,
  readyAmount: number,
  pendingAmount: number,
  previousStatus?: PayoutStatus
): PayoutStatus => {
  if (workerStatus !== "active") {
    return "hold"
  }

  if (previousStatus === "scheduled" && readyAmount > 0) {
    return "scheduled"
  }

  if (readyAmount > 0) {
    return "ready"
  }

  if (pendingAmount > 0) {
    return "hold"
  }

  if (previousStatus === "paid") {
    return "paid"
  }

  return "hold"
}

const getAssignedWorkers = (quantity: number, releasePercent: number) =>
  Math.min(quantity, Math.ceil(quantity * (releasePercent / 100)))

const extractRecipientEmails = (input: string) => {
  const matches =
    input.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)?.map((value) =>
      value.toLowerCase()
    ) ?? []

  return Array.from(new Set(matches))
}

const parseRecipients = (input: string) => {
  const emails = extractRecipientEmails(input)

  if (emails.length > 0) {
    return emails
  }

  return Array.from(
    new Set(
      input
        .split(/[\n,;]+/)
        .map((value) => value.trim())
        .filter(Boolean)
    )
  )
}

const createBasePayoutRow = (worker: Worker, now: string): PayoutRow => ({
  id: `payout-${worker.id}`,
  workerId: worker.id,
  workerName: worker.name,
  method: worker.payoutMethod,
  amount: 0,
  readyAmount: 0,
  pendingAmount: 0,
  status: worker.status === "active" ? "ready" : "hold",
  note: "New payout record created.",
  updatedAt: now,
})

const replacePayoutRow = (rows: PayoutRow[], nextRow: PayoutRow) => {
  const index = rows.findIndex((row) => row.workerId === nextRow.workerId)

  if (index === -1) {
    return [nextRow, ...rows]
  }

  const clone = [...rows]
  clone[index] = nextRow
  return clone
}

function SurfaceCard({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <article
      className={cn(
        "rounded-[1.85rem] border border-white/90 bg-white/88 p-5 shadow-[0_24px_60px_rgba(29,78,216,0.08)] backdrop-blur",
        className
      )}
    >
      {children}
    </article>
  )
}

function StatusBadge({
  label,
  className,
}: {
  label: string
  className: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold capitalize",
        className
      )}
    >
      {label}
    </span>
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: LucideIcon
  label: string
  value: string
  detail: string
}) {
  return (
    <SurfaceCard className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-[var(--brand-sky-900)]">
            {value}
          </p>
        </div>
        <div className="flex size-11 items-center justify-center rounded-2xl bg-[var(--brand-sky-100)] text-[var(--brand-sky-700)]">
          <Icon className="size-5" />
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-muted-foreground">{detail}</p>
    </SurfaceCard>
  )
}

function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const [workspace, setWorkspace] = useState<AdminWorkspaceState>(
    createInitialAdminWorkspaceState
  )
  const [isHydrated, setIsHydrated] = useState(false)
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null)
  const [campaignDraft, setCampaignDraft] = useState<CampaignDraft>(emptyCampaignDraft)
  const [campaignFilter, setCampaignFilter] = useState<CampaignStatus | "all">("all")
  const [reviewFilter, setReviewFilter] = useState<ReviewStatus | "all">("pending")
  const [workerFilter, setWorkerFilter] = useState<WorkerStatus | "all">("all")
  const [importSummary, setImportSummary] = useState(
    "Upload a CSV or paste recipient emails into the list below."
  )
  const [notice, setNotice] = useState<Notice>(null)
  const currentView = getAdminViewFromPath(location.pathname)
  const adminSession = readAdminSession()

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const stored = window.localStorage.getItem(STORAGE_KEY)

      if (!stored) {
        setIsHydrated(true)
        return
      }

      try {
        const parsed = JSON.parse(stored) as AdminWorkspaceState
        setWorkspace(parsed)
      } catch {
        window.localStorage.removeItem(STORAGE_KEY)
      } finally {
        setIsHydrated(true)
      }
    })

    return () => window.cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    if (!isHydrated) {
      return
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace))
  }, [isHydrated, workspace])

  useEffect(() => {
    if (!isHydrated) {
      return
    }

    setWorkspace((current) =>
      current.activeView === currentView
        ? current
        : { ...current, activeView: currentView }
    )
  }, [currentView, isHydrated])

  const liveCampaignCount = workspace.campaigns.filter(
    (campaign) => campaign.status === "live"
  ).length
  const pendingReviews = workspace.reviews.filter((review) => review.status === "pending")
  const moderationRiskCount = workspace.workers.filter(
    (worker) => worker.status !== "active"
  ).length
  const readyPayoutAmount = workspace.payouts.reduce(
    (total, row) => total + row.readyAmount,
    0
  )
  const pendingPayoutAmount = workspace.payouts.reduce(
    (total, row) => total + row.pendingAmount,
    0
  )
  const openWithdrawalRequests = workspace.withdrawalRequests
    .filter((request) => request.status !== "paid")
    .sort((left, right) => right.requestedAt.localeCompare(left.requestedAt))
  const filteredCampaigns = workspace.campaigns.filter(
    (campaign) => campaignFilter === "all" || campaign.status === campaignFilter
  )
  const filteredReviews = workspace.reviews
    .filter((review) => reviewFilter === "all" || review.status === reviewFilter)
    .sort((left, right) => right.submittedAt.localeCompare(left.submittedAt))
  const filteredWorkers = workspace.workers
    .filter((worker) => workerFilter === "all" || worker.status === workerFilter)
    .sort((left, right) => right.warnings - left.warnings || left.name.localeCompare(right.name))
  const sortedPayouts = [...workspace.payouts].sort(
    (left, right) => right.updatedAt.localeCompare(left.updatedAt)
  )
  const topCampaigns = [...workspace.campaigns]
    .sort((left, right) => right.releasePercent - left.releasePercent)
    .slice(0, 3)
  const watchWorkers = workspace.workers.filter((worker) => worker.status === "watch")
  const latestReviews = [...workspace.reviews]
    .sort((left, right) => right.submittedAt.localeCompare(left.submittedAt))
    .slice(0, 3)

  const updateWorkspace = (updater: (current: AdminWorkspaceState) => AdminWorkspaceState) => {
    setWorkspace((current) => updater(current))
  }

  const openCampaignComposer = (campaign?: Campaign) => {
    if (!campaign) {
      setEditingCampaignId(null)
      setCampaignDraft(emptyCampaignDraft())
      setImportSummary("Upload a CSV or paste recipient emails into the list below.")
      handleViewChange("campaigns")
      return
    }

    setEditingCampaignId(campaign.id)
    setCampaignDraft({
      name: campaign.name,
      category: campaign.category,
      reward: String(campaign.reward),
      quantity: String(campaign.quantity),
      startDate: campaign.startDate,
      endDate: campaign.endDate,
      messageTemplate: campaign.messageTemplate,
      recipientsText: campaign.recipients.join("\n"),
    })
    setImportSummary(`${campaign.recipients.length} recipients loaded into the editor.`)
    handleViewChange("campaigns")
  }

  const resetCampaignComposer = () => {
    setEditingCampaignId(null)
    setCampaignDraft(emptyCampaignDraft())
    setImportSummary("Upload a CSV or paste recipient emails into the list below.")
  }

  const handleViewChange = (view: AdminView) => {
    navigate(getAdminPath(view))
  }

  const handleCampaignInput = (
    field: keyof CampaignDraft,
    value: CampaignDraft[keyof CampaignDraft]
  ) => {
    setCampaignDraft((current) => ({ ...current, [field]: value }))
  }

  const handleRecipientImport = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        return
      }

      const existing = parseRecipients(campaignDraft.recipientsText)
      const imported = parseRecipients(reader.result)
      const merged = Array.from(new Set([...existing, ...imported]))

      setCampaignDraft((current) => ({
        ...current,
        recipientsText: merged.join("\n"),
      }))
      setImportSummary(`${imported.length} recipients imported from ${file.name}.`)
      setNotice({
        tone: "success",
        message: `${imported.length} recipients merged into the campaign list.`,
      })
    }

    reader.readAsText(file)
    event.target.value = ""
  }

  const handleCampaignSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const recipients = parseRecipients(campaignDraft.recipientsText)
    const reward = Number(campaignDraft.reward)
    const quantity = Number(campaignDraft.quantity)

    if (
      !campaignDraft.name.trim() ||
      !campaignDraft.category.trim() ||
      !campaignDraft.startDate ||
      !campaignDraft.endDate ||
      !campaignDraft.messageTemplate.trim()
    ) {
      setNotice({
        tone: "warning",
        message: "Campaign name, category, schedule, and message template are required.",
      })
      return
    }

    if (!Number.isFinite(reward) || reward <= 0 || !Number.isFinite(quantity) || quantity <= 0) {
      setNotice({
        tone: "warning",
        message: "Reward and quantity must both be positive numbers.",
      })
      return
    }

    if (recipients.length === 0) {
      setNotice({
        tone: "warning",
        message: "Add at least one recipient email before saving the campaign.",
      })
      return
    }

    const existingCampaign = editingCampaignId
      ? workspace.campaigns.find((campaign) => campaign.id === editingCampaignId)
      : undefined

    const nextCampaign: Campaign = {
      id: existingCampaign?.id ?? `camp-${Date.now()}`,
      name: campaignDraft.name.trim(),
      category: campaignDraft.category.trim(),
      reward,
      quantity,
      assignedWorkers: existingCampaign?.assignedWorkers ?? 0,
      approvedSubmissions: existingCampaign?.approvedSubmissions ?? 0,
      recipients,
      messageTemplate: campaignDraft.messageTemplate.trim(),
      startDate: campaignDraft.startDate,
      endDate: campaignDraft.endDate,
      status: existingCampaign?.status ?? "draft",
      releasePercent: existingCampaign?.releasePercent ?? 0,
    }

    updateWorkspace((current) => ({
      ...current,
      campaigns: editingCampaignId
        ? current.campaigns.map((campaign) =>
            campaign.id === editingCampaignId ? nextCampaign : campaign
          )
        : [nextCampaign, ...current.campaigns],
    }))

    setNotice({
      tone: "success",
      message: editingCampaignId
        ? `${nextCampaign.name} updated for the current release plan.`
        : `${nextCampaign.name} created and saved as a draft campaign.`,
    })
    resetCampaignComposer()
  }

  const setCampaignStatus = (campaignId: string, status: CampaignStatus) => {
    const campaign = workspace.campaigns.find((entry) => entry.id === campaignId)

    if (!campaign) {
      return
    }

    updateWorkspace((current) => ({
      ...current,
      campaigns: current.campaigns.map((entry) => {
        if (entry.id !== campaignId) {
          return entry
        }

        if (status === "completed") {
          return {
            ...entry,
            status,
            releasePercent: 100,
            assignedWorkers: entry.quantity,
          }
        }

        if (status === "live") {
          const releasePercent = entry.releasePercent === 0 ? 20 : entry.releasePercent
          return {
            ...entry,
            status,
            releasePercent,
            assignedWorkers: Math.max(
              entry.assignedWorkers,
              getAssignedWorkers(entry.quantity, releasePercent)
            ),
          }
        }

        return {
          ...entry,
          status,
        }
      }),
    }))

    setNotice({
      tone: "info",
      message: `${campaign.name} is now marked as ${status}.`,
    })
  }

  const releaseMoreTasks = (campaignId: string) => {
    const campaign = workspace.campaigns.find((entry) => entry.id === campaignId)

    if (!campaign || campaign.status === "completed") {
      return
    }

    const nextReleasePercent = Math.min(100, campaign.releasePercent + RELEASE_STEP)

    updateWorkspace((current) => ({
      ...current,
      campaigns: current.campaigns.map((entry) =>
        entry.id === campaignId
          ? {
              ...entry,
              status: "live",
              releasePercent: nextReleasePercent,
              assignedWorkers: Math.max(
                entry.assignedWorkers,
                getAssignedWorkers(entry.quantity, nextReleasePercent)
              ),
            }
          : entry
      ),
    }))

    setNotice({
      tone: "success",
      message: `${campaign.name} moved to ${nextReleasePercent}% release coverage.`,
    })
  }

  const syncWorkerPayout = (
    rows: PayoutRow[],
    worker: Worker,
    review: ReviewItem,
    mode: "approve" | "flag",
    now: string
  ) => {
    const existingRow = rows.find((row) => row.workerId === worker.id)
    const currentRow = existingRow ?? createBasePayoutRow(worker, now)
    let readyAmount = currentRow.readyAmount
    let pendingAmount = currentRow.pendingAmount

    if (mode === "approve") {
      pendingAmount = Math.max(0, roundCurrency(pendingAmount - review.reward))
      readyAmount = roundCurrency(readyAmount + review.reward)
    } else {
      pendingAmount = Math.max(0, roundCurrency(pendingAmount - review.reward))
    }

    const nextRow: PayoutRow = {
      ...currentRow,
      workerName: worker.name,
      method: worker.payoutMethod,
      readyAmount,
      pendingAmount,
      amount: roundCurrency(readyAmount + pendingAmount),
      status: derivePayoutStatus(worker.status, readyAmount, pendingAmount, currentRow.status),
      note:
        mode === "approve"
          ? "Approved work moved into the ready balance."
          : "Flagged work removed from the payable balance.",
      updatedAt: now,
    }

    return replacePayoutRow(rows, nextRow)
  }

  const approveReview = (reviewId: string) => {
    const review = workspace.reviews.find((entry) => entry.id === reviewId)

    if (!review || review.status !== "pending") {
      return
    }

    const now = new Date().toISOString()
    let awardedStar = false

    updateWorkspace((current) => {
      const nextReviews: ReviewItem[] = current.reviews.map((entry) =>
        entry.id === reviewId ? { ...entry, status: "approved" as const } : entry
      )

      let updatedWorker: Worker | null = null
      const nextWorkers = current.workers.map((worker) => {
        if (worker.id !== review.workerId) {
          return worker
        }

        const approvedCount = worker.approvedCount + 1
        const qualityStreak = worker.qualityStreak + 1
        const nextStars =
          qualityStreak % surveymateRules.starAwardStreak === 0
            ? worker.stars + 1
            : worker.stars

        awardedStar = nextStars > worker.stars
        updatedWorker = {
          ...worker,
          approvedCount,
          stars: nextStars,
          qualityStreak,
          pendingReviews: Math.max(0, worker.pendingReviews - 1),
          status: deriveWorkerStatus(worker.warnings),
        }

        return updatedWorker
      })

      const nextCampaigns = current.campaigns.map((campaign) =>
        campaign.id === review.campaignId
          ? {
              ...campaign,
              approvedSubmissions: campaign.approvedSubmissions + 1,
            }
          : campaign
      )

      const payouts = updatedWorker
        ? syncWorkerPayout(current.payouts, updatedWorker, review, "approve", now)
        : current.payouts

      return {
        ...current,
        reviews: nextReviews,
        workers: nextWorkers,
        campaigns: nextCampaigns,
        payouts,
      }
    })

    setNotice({
      tone: "success",
      message: awardedStar
        ? `${review.workerName} was approved and earned a new star.`
        : `${review.workerName}'s submission was approved and moved to payout-ready.`,
    })
  }

  const flagReview = (reviewId: string) => {
    const review = workspace.reviews.find((entry) => entry.id === reviewId)

    if (!review || review.status !== "pending") {
      return
    }

    const now = new Date().toISOString()

    updateWorkspace((current) => {
      const nextReviews: ReviewItem[] = current.reviews.map((entry) =>
        entry.id === reviewId ? { ...entry, status: "flagged" as const } : entry
      )

      let updatedWorker: Worker | null = null
      const nextWorkers = current.workers.map((worker) => {
        if (worker.id !== review.workerId) {
          return worker
        }

        const warnings = worker.warnings + 1
        updatedWorker = {
          ...worker,
          warnings,
          qualityStreak: 0,
          pendingReviews: Math.max(0, worker.pendingReviews - 1),
          status: deriveWorkerStatus(warnings),
        }

        return updatedWorker
      })

      const payouts = updatedWorker
        ? syncWorkerPayout(current.payouts, updatedWorker, review, "flag", now)
        : current.payouts
      const workerForRequests =
        nextWorkers.find((entry) => entry.id === review.workerId) ?? null

      return {
        ...current,
        reviews: nextReviews,
        workers: nextWorkers,
        payouts,
        withdrawalRequests: workerForRequests
          ? current.withdrawalRequests.map((request) =>
              request.workerId === workerForRequests.id && request.status !== "paid"
                ? {
                    ...request,
                    status: workerForRequests.status === "active" ? request.status : "hold",
                  }
                : request
            )
          : current.withdrawalRequests,
      }
    })

    setNotice({
      tone: "warning",
      message: `${review.workerName} was flagged and their moderation risk was increased.`,
    })
  }

  const issueWarning = (workerId: string) => {
    const worker = workspace.workers.find((entry) => entry.id === workerId)

    if (!worker) {
      return
    }

    const now = new Date().toISOString()

    updateWorkspace((current) => {
      const nextWorkers = current.workers.map((entry) => {
        if (entry.id !== workerId) {
          return entry
        }

        const warnings = entry.warnings + 1
        return {
          ...entry,
          warnings,
          qualityStreak: 0,
          status: deriveWorkerStatus(warnings),
        }
      })

      const workerForPayout = nextWorkers.find((entry) => entry.id === workerId) ?? null
      const nextPayouts = workerForPayout
        ? current.payouts.map((row) =>
            row.workerId === workerId
              ? {
                  ...row,
                  status: derivePayoutStatus(
                    workerForPayout.status,
                    row.readyAmount,
                    row.pendingAmount,
                    row.status
                  ),
                  note:
                    workerForPayout.status === "banned"
                      ? "Payout placed on hold because the worker is banned."
                      : row.note,
                  updatedAt: now,
                }
              : row
          )
        : current.payouts

      return {
        ...current,
        workers: nextWorkers,
        payouts: nextPayouts,
        withdrawalRequests: workerForPayout
          ? current.withdrawalRequests.map((request) =>
              request.workerId === workerId && request.status !== "paid"
                ? {
                    ...request,
                    status:
                      workerForPayout.status === "active" ? request.status : "hold",
                  }
                : request
            )
          : current.withdrawalRequests,
      }
    })

    setNotice({
      tone: "warning",
      message:
        worker.warnings + 1 >= surveymateRules.banWarningCount
          ? `${worker.name} reached the ban threshold and payouts are now on hold.`
          : `${worker.name} received another warning.`,
    })
  }

  const awardStar = (workerId: string) => {
    const worker = workspace.workers.find((entry) => entry.id === workerId)

    if (!worker) {
      return
    }

    updateWorkspace((current) => ({
      ...current,
      workers: current.workers.map((entry) =>
        entry.id === workerId ? { ...entry, stars: entry.stars + 1 } : entry
      ),
    }))

    setNotice({
      tone: "success",
      message: `${worker.name} received a trust star for consistent task quality.`,
    })
  }

  const toggleBan = (workerId: string) => {
    const worker = workspace.workers.find((entry) => entry.id === workerId)

    if (!worker) {
      return
    }

    const nextStatus =
      worker.status === "banned" ? deriveWorkerStatus(worker.warnings) : "banned"
    const now = new Date().toISOString()

    updateWorkspace((current) => ({
      ...current,
      workers: current.workers.map((entry) =>
        entry.id === workerId
          ? {
              ...entry,
              status: nextStatus,
            }
          : entry
      ),
      payouts: current.payouts.map((row) =>
        row.workerId === workerId
          ? {
              ...row,
              status: derivePayoutStatus(nextStatus, row.readyAmount, row.pendingAmount, row.status),
              note:
                nextStatus === "banned"
                  ? "Payout placed on hold because the worker is banned."
                  : row.readyAmount > 0
                    ? "Payout reopened after moderation cleared the worker."
                    : row.note,
              updatedAt: now,
            }
          : row
      ),
      withdrawalRequests: current.withdrawalRequests.map((request) =>
        request.workerId === workerId && request.status !== "paid"
          ? {
              ...request,
              status: nextStatus === "active" ? "processing" : "hold",
            }
          : request
      ),
    }))

    setNotice({
      tone: nextStatus === "banned" ? "warning" : "success",
      message:
        nextStatus === "banned"
          ? `${worker.name} is now banned and cannot receive new work.`
          : `${worker.name} was restored to ${deriveWorkerStatus(worker.warnings)} status.`,
    })
  }

  const updatePayoutStatus = (rowId: string, status: Exclude<PayoutStatus, "paid">) => {
    const payout = workspace.payouts.find((row) => row.id === rowId)

    if (!payout) {
      return
    }

    const messageByStatus: Record<Exclude<PayoutStatus, "paid">, string> = {
      hold: `${payout.workerName}'s payout was held for manual follow-up.`,
      ready: `${payout.workerName}'s payout is ready for the next release window.`,
      scheduled: `${payout.workerName}'s payout was scheduled for the weekly batch.`,
    }

    const noteByStatus: Record<Exclude<PayoutStatus, "paid">, string> = {
      hold: "Held by admin while moderation confirms quality.",
      ready: "Ready for the next payout run.",
      scheduled: "Scheduled for the next weekly payout batch.",
    }

    updateWorkspace((current) => ({
      ...current,
      payouts: current.payouts.map((row) =>
        row.id === rowId
          ? {
              ...row,
              status,
              note: noteByStatus[status],
              updatedAt: new Date().toISOString(),
            }
          : row
      ),
      withdrawalRequests: current.withdrawalRequests.map((request) => {
        if (request.workerId !== payout.workerId || request.status === "paid") {
          return request
        }

        if (status === "hold") {
          return { ...request, status: "hold" }
        }

        if (status === "scheduled") {
          return { ...request, status: "scheduled" }
        }

        return { ...request, status: "processing" }
      }),
    }))

    setNotice({
      tone: status === "hold" ? "warning" : "success",
      message: messageByStatus[status],
    })
  }

  const markPayoutPaid = (rowId: string) => {
    const payout = workspace.payouts.find((row) => row.id === rowId)

    if (!payout || payout.readyAmount <= 0) {
      return
    }

    const paidAmount = payout.readyAmount
    const nextPendingAmount = payout.pendingAmount

    updateWorkspace((current) => ({
      ...current,
      payouts: current.payouts.map((row) => {
        if (row.id !== rowId) {
          return row
        }

        const readyAmount = 0
        return {
          ...row,
          readyAmount,
          amount: roundCurrency(readyAmount + nextPendingAmount),
          pendingAmount: nextPendingAmount,
          status: nextPendingAmount > 0 ? "hold" : "paid",
          note:
            nextPendingAmount > 0
              ? "Ready balance paid. Remaining pending work stays on hold."
              : "Weekly payout batch completed.",
          updatedAt: new Date().toISOString(),
        }
      }),
      withdrawalRequests: current.withdrawalRequests.map((request) =>
        request.workerId === payout.workerId && request.status !== "paid"
          ? { ...request, status: "paid" }
          : request
      ),
    }))

    setNotice({
      tone: "success",
      message: `${formatCurrency(paidAmount)} was marked as paid for ${payout.workerName}.`,
    })
  }

  const signOut = () => {
    clearAdminSession()
    navigate("/login")
  }

  const activeViewMeta = navItems.find((item) => item.view === currentView) ?? navItems[0]

  const renderOverview = () => (
    <div className="grid gap-5">
      <section className="grid gap-4 xl:grid-cols-4">
        <MetricCard
          icon={MailOpen}
          label="Live campaigns"
          value={String(liveCampaignCount)}
          detail="Release windows that are currently pacing worker traffic."
        />
        <MetricCard
          icon={ClipboardCheck}
          label="Pending reviews"
          value={String(pendingReviews.length)}
          detail="Submissions waiting for approval or a flag decision."
        />
        <MetricCard
          icon={ShieldAlert}
          label="Moderation risk"
          value={String(moderationRiskCount)}
          detail="Workers in watch or banned status that need operator attention."
        />
        <MetricCard
          icon={BadgeDollarSign}
          label="Ready payouts"
          value={formatCurrency(readyPayoutAmount)}
          detail="Approved balances that can move into the next payout batch."
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.9fr]">
        <SurfaceCard className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                Operations snapshot
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[var(--brand-sky-900)]">
                Admin actions now map directly to the Surveymate workflow.
              </h2>
            </div>
            <StatusBadge
              label="Local state saved"
              className="bg-[var(--brand-sky-100)] text-[var(--brand-sky-700)]"
            />
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {[
              "Campaign drafts accept direct CSV imports for recipient lists.",
              "Pending reviews can move straight into payout-ready balances.",
              "Warnings, stars, and bans immediately change worker payout state.",
            ].map((item) => (
              <div
                key={item}
                className="rounded-[1.4rem] border border-[var(--brand-sky-100)] bg-[var(--brand-sky-50)] px-4 py-4 text-sm leading-6 text-muted-foreground"
              >
                {item}
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {topCampaigns.map((campaign) => {
              const completion = Math.round(
                (campaign.approvedSubmissions / Math.max(campaign.quantity, 1)) * 100
              )

              return (
                <div
                  key={campaign.id}
                  className="rounded-[1.5rem] border border-[var(--brand-sky-100)] bg-white px-4 py-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[var(--brand-sky-900)]">
                        {campaign.name}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">{campaign.category}</p>
                    </div>
                    <StatusBadge
                      label={campaign.status}
                      className={campaignStatusStyles[campaign.status]}
                    />
                  </div>
                  <div className="mt-5 h-2 rounded-full bg-[var(--brand-sky-100)]">
                    <div
                      className="h-2 rounded-full bg-[linear-gradient(90deg,var(--brand-sky-500),var(--brand-sky-700))]"
                      style={{ width: `${campaign.releasePercent}%` }}
                    />
                  </div>
                  <div className="mt-4 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Released</span>
                    <span className="font-semibold text-[var(--brand-sky-900)]">
                      {campaign.releasePercent}%
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Approved</span>
                    <span className="font-semibold text-[var(--brand-sky-900)]">
                      {completion}%
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </SurfaceCard>

        <div className="grid gap-5">
          <SurfaceCard className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                  Review queue
                </p>
                <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[var(--brand-sky-900)]">
                  Latest submissions waiting on moderation.
                </h2>
              </div>
              <StatusBadge
                label={`${pendingReviews.length} pending`}
                className="bg-[var(--brand-sky-100)] text-[var(--brand-sky-700)]"
              />
            </div>

            <div className="mt-5 space-y-3">
              {latestReviews.map((review) => (
                <div
                  key={review.id}
                  className="rounded-[1.4rem] border border-[var(--brand-sky-100)] bg-[var(--brand-sky-50)] px-4 py-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[var(--brand-sky-900)]">
                        {review.workerName}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {review.campaignName}
                      </p>
                    </div>
                    <StatusBadge
                      label={review.status}
                      className={reviewStatusStyles[review.status]}
                    />
                  </div>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    {review.responseText}
                  </p>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {review.proofCount} proof files
                    </span>
                    <span className="font-semibold text-[var(--brand-sky-900)]">
                      Sentiment {review.sentiment}/10
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </SurfaceCard>

          <SurfaceCard className="p-6">
            <p className="text-sm font-semibold tracking-[0.18em] text-muted-foreground uppercase">
              Moderation focus
            </p>
            <div className="mt-5 space-y-3">
              {watchWorkers.length === 0 ? (
                <div className="rounded-[1.4rem] border border-[var(--brand-sky-100)] bg-[var(--brand-sky-50)] px-4 py-4 text-sm text-muted-foreground">
                  No workers are currently in watch status.
                </div>
              ) : (
                watchWorkers.map((worker) => (
                  <div
                    key={worker.id}
                    className="flex items-center justify-between gap-3 rounded-[1.4rem] border border-[var(--brand-sky-100)] bg-[var(--brand-sky-50)] px-4 py-4"
                  >
                    <div>
                      <p className="font-semibold text-[var(--brand-sky-900)]">{worker.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {worker.warnings} warnings, {worker.pendingReviews} reviews pending
                      </p>
                    </div>
                    <StatusBadge
                      label={worker.status}
                      className={workerStatusStyles[worker.status]}
                    />
                  </div>
                ))
              )}
            </div>
          </SurfaceCard>
        </div>
      </section>
    </div>
  )

  const renderCampaigns = () => (
    <div className="grid gap-5 xl:grid-cols-[0.94fr_1.06fr]">
      <SurfaceCard className="p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold tracking-[0.18em] text-muted-foreground uppercase">
              Campaign composer
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[var(--brand-sky-900)]">
              {editingCampaignId ? "Update an active campaign" : "Create a new campaign"}
            </h2>
          </div>
          {editingCampaignId ? (
            <Button
              variant="outline"
              className="rounded-full"
              onClick={resetCampaignComposer}
            >
              New draft
            </Button>
          ) : null}
        </div>

        <form className="mt-6 grid gap-4" onSubmit={handleCampaignSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium text-[var(--brand-sky-900)]">
              Campaign name
              <input
                value={campaignDraft.name}
                onChange={(event) => handleCampaignInput("name", event.target.value)}
                placeholder="Restaurant feedback wave"
                className="h-12 rounded-2xl border border-[var(--brand-sky-200)] bg-[var(--brand-sky-50)] px-4 text-sm text-[var(--brand-sky-900)] outline-none transition focus:border-[var(--brand-sky-500)] focus:bg-white"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-[var(--brand-sky-900)]">
              Category
              <input
                value={campaignDraft.category}
                onChange={(event) => handleCampaignInput("category", event.target.value)}
                placeholder="Service perception"
                className="h-12 rounded-2xl border border-[var(--brand-sky-200)] bg-[var(--brand-sky-50)] px-4 text-sm text-[var(--brand-sky-900)] outline-none transition focus:border-[var(--brand-sky-500)] focus:bg-white"
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium text-[var(--brand-sky-900)]">
              Reward per task
              <input
                type="number"
                min="0"
                step="0.1"
                value={campaignDraft.reward}
                onChange={(event) => handleCampaignInput("reward", event.target.value)}
                placeholder="4.5"
                className="h-12 rounded-2xl border border-[var(--brand-sky-200)] bg-[var(--brand-sky-50)] px-4 text-sm text-[var(--brand-sky-900)] outline-none transition focus:border-[var(--brand-sky-500)] focus:bg-white"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-[var(--brand-sky-900)]">
              Quantity
              <input
                type="number"
                min="1"
                step="1"
                value={campaignDraft.quantity}
                onChange={(event) => handleCampaignInput("quantity", event.target.value)}
                placeholder="150"
                className="h-12 rounded-2xl border border-[var(--brand-sky-200)] bg-[var(--brand-sky-50)] px-4 text-sm text-[var(--brand-sky-900)] outline-none transition focus:border-[var(--brand-sky-500)] focus:bg-white"
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium text-[var(--brand-sky-900)]">
              Start date
              <input
                type="date"
                value={campaignDraft.startDate}
                onChange={(event) => handleCampaignInput("startDate", event.target.value)}
                className="h-12 rounded-2xl border border-[var(--brand-sky-200)] bg-[var(--brand-sky-50)] px-4 text-sm text-[var(--brand-sky-900)] outline-none transition focus:border-[var(--brand-sky-500)] focus:bg-white"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-[var(--brand-sky-900)]">
              End date
              <input
                type="date"
                value={campaignDraft.endDate}
                onChange={(event) => handleCampaignInput("endDate", event.target.value)}
                className="h-12 rounded-2xl border border-[var(--brand-sky-200)] bg-[var(--brand-sky-50)] px-4 text-sm text-[var(--brand-sky-900)] outline-none transition focus:border-[var(--brand-sky-500)] focus:bg-white"
              />
            </label>
          </div>

          <label className="grid gap-2 text-sm font-medium text-[var(--brand-sky-900)]">
            Outreach template
            <textarea
              rows={5}
              value={campaignDraft.messageTemplate}
              onChange={(event) => handleCampaignInput("messageTemplate", event.target.value)}
              placeholder="Hi, I wanted to ask about your recent experience..."
              className="rounded-[1.4rem] border border-[var(--brand-sky-200)] bg-[var(--brand-sky-50)] px-4 py-3 text-sm leading-6 text-[var(--brand-sky-900)] outline-none transition focus:border-[var(--brand-sky-500)] focus:bg-white"
            />
          </label>

          <div className="rounded-[1.5rem] border border-dashed border-[var(--brand-sky-300)] bg-[var(--brand-sky-50)] p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold text-[var(--brand-sky-900)]">
                  Recipient import
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{importSummary}</p>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[var(--brand-sky-700)] shadow-[0_10px_30px_rgba(29,78,216,0.08)]">
                <Upload className="size-4" />
                Upload CSV
                <input
                  type="file"
                  accept=".csv,.txt"
                  className="sr-only"
                  onChange={handleRecipientImport}
                />
              </label>
            </div>
          </div>

          <label className="grid gap-2 text-sm font-medium text-[var(--brand-sky-900)]">
            Recipient list
            <textarea
              rows={8}
              value={campaignDraft.recipientsText}
              onChange={(event) => handleCampaignInput("recipientsText", event.target.value)}
              placeholder={`one@examplemail.com\ntwo@examplemail.com`}
              className="rounded-[1.4rem] border border-[var(--brand-sky-200)] bg-[var(--brand-sky-50)] px-4 py-3 text-sm leading-6 text-[var(--brand-sky-900)] outline-none transition focus:border-[var(--brand-sky-500)] focus:bg-white"
            />
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <Button className="h-11 rounded-full px-5">
              {editingCampaignId ? "Save campaign" : "Create campaign"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-full px-5"
              onClick={resetCampaignComposer}
            >
              Clear form
            </Button>
            <span className="text-sm text-muted-foreground">
              {parseRecipients(campaignDraft.recipientsText).length} recipients queued
            </span>
          </div>
        </form>
      </SurfaceCard>

      <SurfaceCard className="p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold tracking-[0.18em] text-muted-foreground uppercase">
              Campaign roster
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[var(--brand-sky-900)]">
              Release pacing, pause control, and task completion.
            </h2>
          </div>

          <div className="flex flex-wrap gap-2">
            {(["all", "draft", "live", "paused", "completed"] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setCampaignFilter(status)}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-semibold capitalize transition",
                  campaignFilter === status
                    ? "bg-[var(--brand-sky-600)] text-white"
                    : "bg-[var(--brand-sky-100)] text-[var(--brand-sky-700)] hover:bg-[var(--brand-sky-200)]"
                )}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {filteredCampaigns.map((campaign) => {
            const completion = Math.round(
              (campaign.approvedSubmissions / Math.max(campaign.quantity, 1)) * 100
            )

            return (
              <div
                key={campaign.id}
                className="rounded-[1.6rem] border border-[var(--brand-sky-100)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(239,246,255,0.88))] p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-lg font-semibold text-[var(--brand-sky-900)]">
                        {campaign.name}
                      </p>
                      <StatusBadge
                        label={campaign.status}
                        className={campaignStatusStyles[campaign.status]}
                      />
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{campaign.category}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatShortDate(campaign.startDate)} to {formatShortDate(campaign.endDate)}
                    </p>
                  </div>

                  <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                    <div className="rounded-2xl bg-[var(--brand-sky-50)] px-4 py-3">
                      <p>Reward</p>
                      <p className="mt-1 font-semibold text-[var(--brand-sky-900)]">
                        {formatCurrency(campaign.reward)}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-[var(--brand-sky-50)] px-4 py-3">
                      <p>Recipients</p>
                      <p className="mt-1 font-semibold text-[var(--brand-sky-900)]">
                        {campaign.recipients.length}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-3">
                  <div className="rounded-2xl bg-white px-4 py-4">
                    <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                      Released
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-[var(--brand-sky-900)]">
                      {campaign.releasePercent}%
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {campaign.assignedWorkers} of {campaign.quantity} workers
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-4">
                    <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                      Approved
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-[var(--brand-sky-900)]">
                      {campaign.approvedSubmissions}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">{completion}% completion</p>
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-4">
                    <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                      Distribution
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-[var(--brand-sky-900)]">
                      {campaign.quantity}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Total planned task slots
                    </p>
                  </div>
                </div>

                <div className="mt-5 h-2 rounded-full bg-[var(--brand-sky-100)]">
                  <div
                    className="h-2 rounded-full bg-[linear-gradient(90deg,var(--brand-sky-500),var(--brand-sky-700))]"
                    style={{ width: `${campaign.releasePercent}%` }}
                  />
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    className="rounded-full"
                    onClick={() => openCampaignComposer(campaign)}
                  >
                    Edit
                  </Button>
                  {campaign.status !== "live" && campaign.status !== "completed" ? (
                    <Button
                      className="rounded-full"
                      onClick={() => setCampaignStatus(campaign.id, "live")}
                    >
                      <PlayCircle className="size-4" />
                      Launch
                    </Button>
                  ) : null}
                  {campaign.status === "live" ? (
                    <Button
                      variant="outline"
                      className="rounded-full"
                      onClick={() => setCampaignStatus(campaign.id, "paused")}
                    >
                      <PauseCircle className="size-4" />
                      Pause
                    </Button>
                  ) : null}
                  {campaign.status !== "completed" ? (
                    <Button
                      variant="outline"
                      className="rounded-full"
                      onClick={() => releaseMoreTasks(campaign.id)}
                    >
                      <PlusCircle className="size-4" />
                      Release +15%
                    </Button>
                  ) : null}
                  {campaign.status !== "completed" ? (
                    <Button
                      variant="outline"
                      className="rounded-full"
                      onClick={() => setCampaignStatus(campaign.id, "completed")}
                    >
                      <CheckCheck className="size-4" />
                      Complete
                    </Button>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      </SurfaceCard>
    </div>
  )

  const renderReviews = () => (
    <div className="grid gap-5">
      <SurfaceCard className="p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold tracking-[0.18em] text-muted-foreground uppercase">
              Manual moderation
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[var(--brand-sky-900)]">
              Approve clean proof or flag weak submissions before payout.
            </h2>
          </div>

          <div className="flex flex-wrap gap-2">
            {(["all", "pending", "approved", "flagged"] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setReviewFilter(status)}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-semibold capitalize transition",
                  reviewFilter === status
                    ? "bg-[var(--brand-sky-600)] text-white"
                    : "bg-[var(--brand-sky-100)] text-[var(--brand-sky-700)] hover:bg-[var(--brand-sky-200)]"
                )}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          {filteredReviews.map((review) => (
            <div
              key={review.id}
              className="rounded-[1.6rem] border border-[var(--brand-sky-100)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(239,246,255,0.84))] p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-lg font-semibold text-[var(--brand-sky-900)]">
                      {review.workerName}
                    </p>
                    <StatusBadge
                      label={review.status}
                      className={reviewStatusStyles[review.status]}
                    />
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{review.campaignName}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Submitted {formatDateTime(review.submittedAt)}
                  </p>
                </div>
                <div className="rounded-2xl bg-white px-4 py-3 text-right">
                  <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                    Reward
                  </p>
                  <p className="mt-2 text-lg font-semibold text-[var(--brand-sky-900)]">
                    {formatCurrency(review.reward)}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl bg-white px-4 py-3">
                  <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                    Proof files
                  </p>
                  <p className="mt-2 text-lg font-semibold text-[var(--brand-sky-900)]">
                    {review.proofCount}
                  </p>
                </div>
                <div className="rounded-2xl bg-white px-4 py-3">
                  <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                    Sentiment
                  </p>
                  <p className="mt-2 text-lg font-semibold text-[var(--brand-sky-900)]">
                    {review.sentiment}/10
                  </p>
                </div>
                <div className="rounded-2xl bg-white px-4 py-3">
                  <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                    Decision impact
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[var(--brand-sky-900)]">
                    {review.status === "pending"
                      ? "Can still change payout readiness"
                      : review.status === "approved"
                        ? "Moved to ready balance"
                        : "Reward withheld"}
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-[1.4rem] border border-[var(--brand-sky-100)] bg-white px-4 py-4">
                <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                  Response summary
                </p>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {review.responseText}
                </p>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <Button
                  className="rounded-full"
                  disabled={review.status !== "pending"}
                  onClick={() => approveReview(review.id)}
                >
                  <ShieldCheck className="size-4" />
                  Approve
                </Button>
                <Button
                  variant="outline"
                  className="rounded-full"
                  disabled={review.status !== "pending"}
                  onClick={() => flagReview(review.id)}
                >
                  <AlertTriangle className="size-4" />
                  Flag
                </Button>
              </div>
            </div>
          ))}
        </div>
      </SurfaceCard>
    </div>
  )

  const renderUsers = () => (
    <div className="grid gap-5">
      <SurfaceCard className="p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold tracking-[0.18em] text-muted-foreground uppercase">
              Worker controls
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[var(--brand-sky-900)]">
              Warnings, stars, and ban state update instantly.
            </h2>
          </div>

          <div className="flex flex-wrap gap-2">
            {(["all", "active", "watch", "banned"] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setWorkerFilter(status)}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-semibold capitalize transition",
                  workerFilter === status
                    ? "bg-[var(--brand-sky-600)] text-white"
                    : "bg-[var(--brand-sky-100)] text-[var(--brand-sky-700)] hover:bg-[var(--brand-sky-200)]"
                )}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          {filteredWorkers.map((worker) => (
            <div
              key={worker.id}
              className="rounded-[1.6rem] border border-[var(--brand-sky-100)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(239,246,255,0.84))] p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-lg font-semibold text-[var(--brand-sky-900)]">
                      {worker.name}
                    </p>
                    <StatusBadge
                      label={worker.status}
                      className={workerStatusStyles[worker.status]}
                    />
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{worker.region}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Payout via {worker.payoutMethod}
                  </p>
                </div>
                <div className="rounded-2xl bg-white px-4 py-3 text-right">
                  <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                    Approved
                  </p>
                  <p className="mt-2 text-lg font-semibold text-[var(--brand-sky-900)]">
                    {worker.approvedCount}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-4">
                <div className="rounded-2xl bg-white px-4 py-3">
                  <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                    Warnings
                  </p>
                  <p className="mt-2 text-lg font-semibold text-[var(--brand-sky-900)]">
                    {worker.warnings}
                  </p>
                </div>
                <div className="rounded-2xl bg-white px-4 py-3">
                  <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                    Stars
                  </p>
                  <p className="mt-2 text-lg font-semibold text-[var(--brand-sky-900)]">
                    {worker.stars}
                  </p>
                </div>
                <div className="rounded-2xl bg-white px-4 py-3">
                  <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                    Pending
                  </p>
                  <p className="mt-2 text-lg font-semibold text-[var(--brand-sky-900)]">
                    {worker.pendingReviews}
                  </p>
                </div>
                <div className="rounded-2xl bg-white px-4 py-3">
                  <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                    Streak
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[var(--brand-sky-900)]">
                    {worker.qualityStreak} clean tasks
                  </p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  className="rounded-full"
                  onClick={() => issueWarning(worker.id)}
                >
                  <ShieldAlert className="size-4" />
                  Warning
                </Button>
                <Button
                  variant="outline"
                  className="rounded-full"
                  onClick={() => awardStar(worker.id)}
                >
                  <Star className="size-4" />
                  Add star
                </Button>
                <Button className="rounded-full" onClick={() => toggleBan(worker.id)}>
                  {worker.status === "banned" ? "Unban" : "Ban"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </SurfaceCard>
    </div>
  )

  const renderPayouts = () => (
    <div className="grid gap-5">
      <section className="grid gap-4 xl:grid-cols-3">
        <MetricCard
          icon={WalletCards}
          label="Ready balance"
          value={formatCurrency(readyPayoutAmount)}
          detail="Approved work that can be released now."
        />
        <MetricCard
          icon={ClipboardCheck}
          label="Pending balance"
          value={formatCurrency(pendingPayoutAmount)}
          detail="Value still tied to pending or held moderation work."
        />
        <MetricCard
          icon={UsersRound}
          label="Payout rows"
          value={String(workspace.payouts.length)}
          detail="Workers currently tracked in the admin ledger."
        />
      </section>

      <SurfaceCard className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold tracking-[0.18em] text-muted-foreground uppercase">
              Early withdrawals
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[var(--brand-sky-900)]">
              User payout requests stay visible beside the main ledger.
            </h2>
          </div>
          <StatusBadge
            label={`${openWithdrawalRequests.length} open`}
            className="bg-[var(--brand-sky-100)] text-[var(--brand-sky-700)]"
          />
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-3">
          {openWithdrawalRequests.length === 0 ? (
            <div className="rounded-[1.5rem] border border-[var(--brand-sky-100)] bg-[var(--brand-sky-50)] px-4 py-4 text-sm text-muted-foreground xl:col-span-3">
              No open early withdrawal requests.
            </div>
          ) : (
            openWithdrawalRequests.map((request) => (
              <div
                key={request.id}
                className="rounded-[1.5rem] border border-[var(--brand-sky-100)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(239,246,255,0.84))] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[var(--brand-sky-900)]">
                      {request.workerName}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {request.method} | {formatDateTime(request.requestedAt)}
                    </p>
                  </div>
                  <StatusBadge
                    label={request.status}
                    className={withdrawalStatusStyles[request.status]}
                  />
                </div>
                <p className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-[var(--brand-sky-900)]">
                  {formatCurrency(request.amount)}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Requests reflect the same payout history shown in the worker website.
                </p>
              </div>
            ))
          )}
        </div>
      </SurfaceCard>

      <SurfaceCard className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold tracking-[0.18em] text-muted-foreground uppercase">
              Ledger controls
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[var(--brand-sky-900)]">
              Hold, schedule, or close weekly payout batches.
            </h2>
          </div>
          <StatusBadge
            label={`${formatCurrency(readyPayoutAmount)} ready`}
            className="bg-[var(--brand-sky-100)] text-[var(--brand-sky-700)]"
          />
        </div>

        <div className="mt-6 space-y-4">
          {sortedPayouts.map((row) => (
            <div
              key={row.id}
              className="rounded-[1.6rem] border border-[var(--brand-sky-100)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(239,246,255,0.84))] p-5"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-lg font-semibold text-[var(--brand-sky-900)]">
                      {row.workerName}
                    </p>
                    <StatusBadge
                      label={row.status}
                      className={payoutStatusStyles[row.status]}
                    />
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{row.method}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{row.note}</p>
                </div>
                <div className="text-left lg:text-right">
                  <p className="text-sm text-muted-foreground">
                    Updated {formatDateTime(row.updatedAt)}
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-[var(--brand-sky-900)]">
                    {formatCurrency(row.amount)}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl bg-white px-4 py-4">
                  <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                    Ready now
                  </p>
                  <p className="mt-2 text-lg font-semibold text-[var(--brand-sky-900)]">
                    {formatCurrency(row.readyAmount)}
                  </p>
                </div>
                <div className="rounded-2xl bg-white px-4 py-4">
                  <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                    Pending
                  </p>
                  <p className="mt-2 text-lg font-semibold text-[var(--brand-sky-900)]">
                    {formatCurrency(row.pendingAmount)}
                  </p>
                </div>
                <div className="rounded-2xl bg-white px-4 py-4">
                  <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                    Payout track
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[var(--brand-sky-900)]">
                    {row.status === "scheduled"
                      ? "In the next batch"
                      : row.status === "paid"
                        ? "Settled"
                        : row.status === "ready"
                          ? "Release eligible"
                          : "Needs review"}
                  </p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  className="rounded-full"
                  onClick={() => updatePayoutStatus(row.id, "hold")}
                >
                  Hold
                </Button>
                <Button
                  variant="outline"
                  className="rounded-full"
                  onClick={() => updatePayoutStatus(row.id, "ready")}
                  disabled={row.readyAmount <= 0}
                >
                  Set ready
                </Button>
                <Button
                  className="rounded-full"
                  onClick={() => updatePayoutStatus(row.id, "scheduled")}
                  disabled={row.readyAmount <= 0}
                >
                  Schedule
                </Button>
                <Button
                  variant="outline"
                  className="rounded-full"
                  onClick={() => markPayoutPaid(row.id)}
                  disabled={row.readyAmount <= 0}
                >
                  Mark paid
                </Button>
              </div>
            </div>
          ))}
        </div>
      </SurfaceCard>
    </div>
  )

  const renderActiveView = () => {
    switch (currentView) {
      case "campaigns":
        return renderCampaigns()
      case "reviews":
        return renderReviews()
      case "users":
        return renderUsers()
      case "payouts":
        return renderPayouts()
      case "overview":
      default:
        return renderOverview()
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen lg:grid-cols-[288px_1fr]">
        <aside className="relative overflow-hidden border-b border-white/60 bg-[linear-gradient(180deg,#f5f8ff,#e6efff_58%,#dce8ff)] lg:border-b-0 lg:border-r lg:border-[var(--brand-sky-100)]">
          <div
            aria-hidden="true"
            className="absolute -right-24 top-8 h-64 w-64 rounded-full bg-[rgba(37,99,235,0.18)] blur-3xl"
          />
          <div
            aria-hidden="true"
            className="absolute -left-20 bottom-10 h-52 w-52 rounded-full bg-white/80 blur-3xl"
          />

          <div className="relative flex h-full flex-col p-6">
              <div className="flex items-center gap-3">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-[var(--brand-sky-600)] text-sm font-semibold tracking-[0.22em] text-white">
                  SM
              </div>
              <div>
                <p className="text-sm font-semibold tracking-[0.18em] uppercase text-[var(--brand-sky-900)]">
                  Surveymate
                </p>
                <p className="text-xs text-muted-foreground">Admin workspace</p>
              </div>
            </div>

            <nav className="mt-10 grid gap-2">
              {navItems.map(({ view, label, icon: Icon, description }) => {
                const active = currentView === view

                return (
                  <button
                    key={view}
                    type="button"
                    onClick={() => handleViewChange(view)}
                    className={cn(
                      "rounded-[1.4rem] border px-4 py-4 text-left transition",
                      active
                        ? "border-[var(--brand-sky-200)] bg-white text-[var(--brand-sky-900)] shadow-[0_18px_40px_rgba(29,78,216,0.08)]"
                        : "border-transparent bg-white/45 text-[var(--brand-sky-700)] hover:border-[var(--brand-sky-100)] hover:bg-white/75"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "flex size-10 items-center justify-center rounded-2xl",
                          active
                            ? "bg-[var(--brand-sky-100)] text-[var(--brand-sky-700)]"
                            : "bg-white text-[var(--brand-sky-500)]"
                        )}
                      >
                        <Icon className="size-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{label}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </nav>

            <div className="mt-8 rounded-[1.7rem] border border-white/80 bg-white/72 p-5">
              <p className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">
                Operator rules
              </p>
              <div className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
                <div className="rounded-2xl bg-[var(--brand-sky-50)] px-4 py-3">
                  First {surveymateRules.manualReviewTaskLimit} tasks stay under manual review before scale.
                </div>
                <div className="rounded-2xl bg-[var(--brand-sky-50)] px-4 py-3">
                  Warnings escalate workers into watch, then a {surveymateRules.banWarningCount}th warning triggers a ban.
                </div>
                <div className="rounded-2xl bg-[var(--brand-sky-50)] px-4 py-3">
                  Only approved tasks move into the ready payout balance.
                </div>
              </div>
            </div>

            <div className="mt-auto rounded-[1.7rem] border border-white/80 bg-white/72 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-[var(--brand-sky-900)]">
                    {adminSession?.name ?? "Admin session"}
                  </p>
                  <p className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    {adminSession?.role ?? "Local demo access"}
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="rounded-full"
                  onClick={signOut}
                >
                  <LogOut className="size-4" />
                  Sign out
                </Button>
              </div>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                Admin actions are saved in local storage so campaign edits, moderation
                decisions, and payout changes survive refreshes.
              </p>
            </div>
          </div>
        </aside>

        <section className="px-5 py-6 sm:px-6 lg:px-8 lg:py-8">
          <header className="rounded-[2rem] border border-white/90 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(219,234,254,0.82))] p-6 shadow-[0_24px_60px_rgba(29,78,216,0.08)]">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-3xl">
                <p className="text-sm font-semibold tracking-[0.2em] text-muted-foreground uppercase">
                  {activeViewMeta.label}
                </p>
                <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-[var(--brand-sky-900)] sm:text-5xl">
                  Manage campaigns, moderation, and payouts in one admin flow.
                </h1>
                <p className="mt-4 text-base leading-7 text-muted-foreground">
                  {activeViewMeta.description}. This workspace now handles the full admin
                  side of Surveymate: campaign setup, CSV imports, proof review, worker
                  enforcement, and payout control.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button className="h-11 rounded-full px-5" onClick={() => openCampaignComposer()}>
                  Create campaign
                </Button>
                <Button
                  variant="outline"
                  className="h-11 rounded-full px-5"
                  onClick={() => handleViewChange("payouts")}
                >
                  Open payout queue
                </Button>
              </div>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {[
                `${liveCampaignCount} campaigns are actively releasing work to users.`,
                `${pendingReviews.length} submissions can still change payout readiness.`,
                `${formatCurrency(readyPayoutAmount)} is ready to schedule for the next batch.`,
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-[1.4rem] border border-white/90 bg-white/72 px-4 py-4 text-sm leading-6 text-muted-foreground"
                >
                  {item}
                </div>
              ))}
            </div>
          </header>

          {notice ? (
            <div
              className={cn(
                "mt-5 rounded-[1.5rem] border px-5 py-4 text-sm font-medium shadow-[0_16px_36px_rgba(29,78,216,0.06)]",
                notice.tone === "success" &&
                  "border-[rgba(34,197,94,0.18)] bg-[rgba(34,197,94,0.08)] text-[var(--brand-success)]",
                notice.tone === "warning" &&
                  "border-[rgba(245,158,11,0.2)] bg-[rgba(245,158,11,0.1)] text-[var(--brand-warning)]",
                notice.tone === "info" &&
                  "border-[var(--brand-sky-200)] bg-[var(--brand-sky-50)] text-[var(--brand-sky-700)]"
              )}
            >
              {notice.message}
            </div>
          ) : null}

          <section className="mt-6">{renderActiveView()}</section>
        </section>
      </div>
    </main>
  )
}

export default App
