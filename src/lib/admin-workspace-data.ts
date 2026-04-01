import {
  getSharedCampaigns,
  getSharedPayoutRows,
  getSharedReviews,
  getSharedWithdrawalRequests,
  getSharedWorkerById,
  getSharedWorkers,
  surveymateRules,
  type CampaignStatus,
  type PayoutStatus,
  type ReviewStatus,
  type WithdrawalStatus,
  type WorkerStatus,
} from "../../../frontend/src/lib/surveymate-shared"

export type AdminView =
  | "overview"
  | "campaigns"
  | "reviews"
  | "users"
  | "payouts"

export type { CampaignStatus, PayoutStatus, ReviewStatus, WorkerStatus }

export type Campaign = {
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

export type ReviewItem = {
  id: string
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

export type Worker = {
  id: string
  name: string
  region: string
  payoutMethod: string
  warnings: number
  stars: number
  qualityStreak: number
  approvedCount: number
  pendingReviews: number
  status: WorkerStatus
}

export type PayoutRow = {
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

export type WithdrawalRequest = {
  id: string
  workerId: string
  workerName: string
  amount: number
  method: string
  requestedAt: string
  status: WithdrawalStatus
}

export type AdminWorkspaceState = {
  activeView: AdminView
  campaigns: Campaign[]
  reviews: ReviewItem[]
  workers: Worker[]
  payouts: PayoutRow[]
  withdrawalRequests: WithdrawalRequest[]
}

export { surveymateRules }

export const createInitialAdminWorkspaceState = (): AdminWorkspaceState => ({
  activeView: "overview",
  campaigns: getSharedCampaigns().map((campaign) => ({
    ...campaign,
    recipients: [...campaign.recipients],
  })),
  reviews: getSharedReviews().map((review) => ({
    id: review.id,
    workerId: review.workerId,
    workerName: review.workerName,
    campaignId: review.campaignId,
    campaignName: review.campaignName,
    responseText: review.responseText,
    proofCount: review.proofCount,
    sentiment: review.sentiment,
    submittedAt: review.submittedAt,
    reward: review.reward,
    status: review.status,
  })),
  workers: getSharedWorkers().map((worker) => ({
    id: worker.id,
    name: worker.name,
    region: worker.region,
    payoutMethod: worker.payoutMethod,
    warnings: worker.warnings,
    stars: worker.stars,
    qualityStreak: worker.qualityStreak,
    approvedCount: worker.approvedCount,
    pendingReviews: worker.pendingReviews,
    status: worker.status,
  })),
  payouts: getSharedPayoutRows().map((row) => ({ ...row })),
  withdrawalRequests: getSharedWithdrawalRequests().map((request) => ({
    id: request.id,
    workerId: request.workerId,
    workerName: getSharedWorkerById(request.workerId)?.name ?? "Unknown worker",
    amount: request.amount,
    method: request.method,
    requestedAt: request.requestedAt,
    status: request.status,
  })),
})
