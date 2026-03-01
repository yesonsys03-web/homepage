export interface User {
  id: string
  email: string
  nickname: string
  role: string
  avatar_url?: string | null
  bio?: string | null
}
