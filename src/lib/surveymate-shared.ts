export type CampaignStatus = "draft" | "live" | "paused" | "completed"
export type ReviewStatus = "pending" | "approved" | "flagged"
export type WorkerStatus = "active" | "watch" | "banned"
export type PayoutStatus = "hold" | "ready" | "scheduled" | "paid"
export type WithdrawalStatus = "processing" | "scheduled" | "paid" | "hold"

export const surveymateRules = {
  manualReviewTaskLimit: 10,
  maxWarningsBeforeBan: 3,
  banWarningCount: 4,
  starAwardStreak: 5,
  earlyPayoutThreshold: 10,
  payoutCadenceLabel: "Weekly",
  nextPayoutDateLabel: "April 5, 2026",
} as const

export type SharedCampaign = {
  id: string
  name: string
  category: string
  reward: number
  quantity: number
  assignedWorkers: number
  approvedSubmissions: number
  recipients: string[]
  messageTemplate: string
  startDate: string
  endDate: string
  status: CampaignStatus
  releasePercent: number
}

export type SharedWorker = {
  id: string
  name: string
  email: string
  region: string
  payoutMethod: string
  joinedAt: string
  rulesAccepted: boolean
  warnings: number
  stars: number
  qualityStreak: number
  approvedCount: number
  pendingReviews: number
  status: WorkerStatus
  availableBalance: number
  pendingBalance: number
  lifetimeEarnings: number
}

export type SharedReviewItem = {
  id: string
  taskId?: string
  workerId: string
  workerName: string
  campaignId: string
  campaignName: string
  responseText: string
  proofCount: number
  sentiment: number
  submittedAt: string
  reward: number
  status: ReviewStatus
}

export type SharedPayoutRow = {
  id: string
  workerId: string
  workerName: string
  method: string
  amount: number
  readyAmount: number
  pendingAmount: number
  status: PayoutStatus
  note: string
  updatedAt: string
}

export type SharedWithdrawalRequest = {
  id: string
  workerId: string
  amount: number
  method: string
  requestedAt: string
  status: WithdrawalStatus
}

const sharedCampaigns: SharedCampaign[] = [
  {
    id: "camp-101",
    name: "Consumer appliance sentiment",
    category: "Consumer research",
    reward: 4.8,
    quantity: 180,
    assignedWorkers: 128,
    approvedSubmissions: 94,
    recipients: [
      "lena.ortiz@examplemail.com",
      "harper.lin@examplemail.com",
      "amir.patel@examplemail.com",
    ],
    messageTemplate:
      "Hi there, I wanted to ask about your recent appliance service experience. What stood out most to you, and did it change how you feel about the brand?",
    startDate: "2026-03-31",
    endDate: "2026-04-21",
    status: "live",
    releasePercent: 72,
  },
  {
    id: "camp-102",
    name: "Restaurant service pulse",
    category: "Service perception",
    reward: 4.1,
    quantity: 150,
    assignedWorkers: 68,
    approvedSubmissions: 51,
    recipients: [
      "noah.rivera@examplemail.com",
      "jamila.price@examplemail.com",
    ],
    messageTemplate:
      "Hi, I wanted to ask about your latest dining experience. What made the service feel either memorable or disappointing?",
    startDate: "2026-03-30",
    endDate: "2026-04-18",
    status: "live",
    releasePercent: 46,
  },
  {
    id: "camp-103",
    name: "Travel booking objections",
    category: "Product objections",
    reward: 5.2,
    quantity: 240,
    assignedWorkers: 203,
    approvedSubmissions: 165,
    recipients: [
      "sara.ahmed@examplemail.com",
      "chloe.bennett@examplemail.com",
      "maya.green@examplemail.com",
    ],
    messageTemplate:
      "Hi, I noticed you recently considered a travel booking. What made you hesitate before confirming it?",
    startDate: "2026-03-28",
    endDate: "2026-04-09",
    status: "paused",
    releasePercent: 83,
  },
  {
    id: "camp-104",
    name: "Mobile banking trust signals",
    category: "Financial product sentiment",
    reward: 5.6,
    quantity: 120,
    assignedWorkers: 0,
    approvedSubmissions: 0,
    recipients: [
      "iman.hossain@examplemail.com",
      "rafael.morris@examplemail.com",
      "sadia.rahim@examplemail.com",
    ],
    messageTemplate:
      "Hi, I am curious what usually makes a banking app feel trustworthy to you. Is it security, support, clarity, or something else?",
    startDate: "2026-04-02",
    endDate: "2026-04-20",
    status: "draft",
    releasePercent: 0,
  },
]

const sharedWorkers: SharedWorker[] = [
  {
    id: "worker-1",
    name: "Maya Rahman",
    email: "maya.rahman@example.com",
    region: "Dhaka, Bangladesh",
    payoutMethod: "Payoneer",
    joinedAt: "2026-03-12T09:00:00.000Z",
    rulesAccepted: true,
    warnings: 1,
    stars: 2,
    qualityStreak: 2,
    approvedCount: 11,
    pendingReviews: 1,
    status: "active",
    availableBalance: 32,
    pendingBalance: 4.8,
    lifetimeEarnings: 68.8,
  },
  {
    id: "worker-2",
    name: "Jamal Khan",
    email: "jamal.khan@example.com",
    region: "Lahore, Pakistan",
    payoutMethod: "Wise",
    joinedAt: "2026-03-10T08:15:00.000Z",
    rulesAccepted: true,
    warnings: 2,
    stars: 1,
    qualityStreak: 0,
    approvedCount: 6,
    pendingReviews: 1,
    status: "watch",
    availableBalance: 11,
    pendingBalance: 8,
    lifetimeEarnings: 34.2,
  },
  {
    id: "worker-3",
    name: "Nadia Sultana",
    email: "nadia.sultana@example.com",
    region: "Chittagong, Bangladesh",
    payoutMethod: "Bank transfer",
    joinedAt: "2026-03-05T10:00:00.000Z",
    rulesAccepted: true,
    warnings: 0,
    stars: 3,
    qualityStreak: 4,
    approvedCount: 18,
    pendingReviews: 1,
    status: "active",
    availableBalance: 64,
    pendingBalance: 0,
    lifetimeEarnings: 92.6,
  },
  {
    id: "worker-4",
    name: "Harun Molla",
    email: "harun.molla@example.com",
    region: "Khulna, Bangladesh",
    payoutMethod: "Payoneer",
    joinedAt: "2026-03-02T07:45:00.000Z",
    rulesAccepted: true,
    warnings: 4,
    stars: 0,
    qualityStreak: 0,
    approvedCount: 3,
    pendingReviews: 0,
    status: "banned",
    availableBalance: 0,
    pendingBalance: 0,
    lifetimeEarnings: 12,
  },
]

const sharedReviews: SharedReviewItem[] = [
  {
    id: "review-401",
    taskId: "task-101",
    workerId: "worker-1",
    workerName: "Maya Rahman",
    campaignId: "camp-101",
    campaignName: "Consumer appliance sentiment",
    responseText:
      "Recipient described fast technician arrival and clear communication as the main trust signal.",
    proofCount: 2,
    sentiment: 8,
    submittedAt: "2026-03-29T10:30:00.000Z",
    reward: 4.8,
    status: "pending",
  },
  {
    id: "review-402",
    workerId: "worker-2",
    workerName: "Jamal Khan",
    campaignId: "camp-102",
    campaignName: "Restaurant service pulse",
    responseText:
      "Reply was short and needs another follow-up to confirm what made the service feel weak.",
    proofCount: 1,
    sentiment: 5,
    submittedAt: "2026-03-29T08:45:00.000Z",
    reward: 4.1,
    status: "pending",
  },
  {
    id: "review-403",
    workerId: "worker-3",
    workerName: "Nadia Sultana",
    campaignId: "camp-103",
    campaignName: "Travel booking objections",
    responseText:
      "Recipient said unclear baggage fees and poor refund confidence created the hesitation.",
    proofCount: 3,
    sentiment: 9,
    submittedAt: "2026-03-28T15:20:00.000Z",
    reward: 5.2,
    status: "pending",
  },
]

const sharedPayoutRows: SharedPayoutRow[] = [
  {
    id: "payout-301",
    workerId: "worker-1",
    workerName: "Maya Rahman",
    method: "Payoneer",
    amount: 36.8,
    readyAmount: 32,
    pendingAmount: 4.8,
    status: "ready",
    note: "Approved work is ready for this week and one submission is still under review.",
    updatedAt: "2026-03-29T09:10:00.000Z",
  },
  {
    id: "payout-302",
    workerId: "worker-2",
    workerName: "Jamal Khan",
    method: "Wise",
    amount: 19,
    readyAmount: 11,
    pendingAmount: 8,
    status: "hold",
    note: "One review is still flagged for follow-up before release.",
    updatedAt: "2026-03-29T08:50:00.000Z",
  },
  {
    id: "payout-303",
    workerId: "worker-3",
    workerName: "Nadia Sultana",
    method: "Bank transfer",
    amount: 64,
    readyAmount: 64,
    pendingAmount: 0,
    status: "scheduled",
    note: "Scheduled for the next weekly batch.",
    updatedAt: "2026-03-28T12:00:00.000Z",
  },
]

const sharedWithdrawalRequests: SharedWithdrawalRequest[] = [
  {
    id: "withdrawal-48",
    workerId: "worker-1",
    amount: 20,
    method: "Payoneer",
    requestedAt: "2026-03-22T07:30:00.000Z",
    status: "scheduled",
  },
  {
    id: "withdrawal-44",
    workerId: "worker-1",
    amount: 12,
    method: "Payoneer",
    requestedAt: "2026-03-15T07:30:00.000Z",
    status: "paid",
  },
  {
    id: "withdrawal-52",
    workerId: "worker-2",
    amount: 11,
    method: "Wise",
    requestedAt: "2026-03-29T08:30:00.000Z",
    status: "processing",
  },
]

export const getSharedCampaigns = () =>
  sharedCampaigns.map((campaign) => ({
    ...campaign,
    recipients: [...campaign.recipients],
  }))

export const getSharedWorkers = () => sharedWorkers.map((worker) => ({ ...worker }))

export const getSharedWorkerById = (workerId: string) =>
  sharedWorkers.find((worker) => worker.id === workerId)

export const getSharedReviews = () => sharedReviews.map((review) => ({ ...review }))

export const getSharedPayoutRows = () => sharedPayoutRows.map((row) => ({ ...row }))

export const getSharedWithdrawalRequests = (workerId?: string) =>
  sharedWithdrawalRequests
    .filter((request) => !workerId || request.workerId === workerId)
    .map((request) => ({ ...request }))
