import type { AdminView } from "@/lib/admin-workspace-data"

export const getAdminPath = (view: AdminView) => {
  switch (view) {
    case "overview":
      return "/overview"
    case "campaigns":
      return "/campaigns"
    case "reviews":
      return "/reviews"
    case "users":
      return "/users"
    case "payouts":
      return "/payouts"
    default:
      return "/overview"
  }
}

export const getAdminViewFromPath = (pathname: string): AdminView => {
  if (pathname.startsWith("/campaigns")) {
    return "campaigns"
  }

  if (pathname.startsWith("/reviews")) {
    return "reviews"
  }

  if (pathname.startsWith("/users")) {
    return "users"
  }

  if (pathname.startsWith("/payouts")) {
    return "payouts"
  }

  return "overview"
}
