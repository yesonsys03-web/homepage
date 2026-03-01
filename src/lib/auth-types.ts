export interface User {
  id: string
  email: string
  nickname: string
  role: string
  status?: "pending" | "active" | "rejected" | string
  avatar_url?: string | null
  bio?: string | null
}
