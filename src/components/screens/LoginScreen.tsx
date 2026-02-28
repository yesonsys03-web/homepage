import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/lib/use-auth"
import { api } from "@/lib/api"

interface LoginScreenProps {
  onSwitchToRegister: () => void
  onClose?: () => void
}

export function LoginScreen({ onSwitchToRegister, onClose }: LoginScreenProps) {
  const { login } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const result = await api.login(email, password)
      login(result.access_token, result.user)
      if (onClose) onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그인에 실패했습니다")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0B1020] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-display text-4xl font-bold text-[#F4F7FF] mb-2">VibeCoder</h1>
          <p className="text-[#B8C3E6]">바이브코더 커뮤니티에 오신 것을 환영합니다</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-[#F4F7FF] font-medium mb-2">이메일</label>
            <Input 
              type="email"
              placeholder="이메일을 입력하세요"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-[#161F42] border-[#111936] text-[#F4F7FF] placeholder-[#B8C3E6]/50 focus:ring-[#23D5AB]"
            />
          </div>

          <div>
            <label className="block text-[#F4F7FF] font-medium mb-2">비밀번호</label>
            <Input 
              type="password"
              placeholder="비밀번호를 입력하세요"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-[#161F42] border-[#111936] text-[#F4F7FF] placeholder-[#B8C3E6]/50 focus:ring-[#23D5AB]"
            />
          </div>

          {error && (
            <p className="text-[#FF6B6B] text-sm">{error}</p>
          )}

          <Button 
            type="submit"
            disabled={loading}
            className="w-full bg-[#23D5AB] hover:bg-[#23D5AB]/90 text-[#0B1020] text-lg py-6"
          >
            {loading ? "로그인 중..." : "로그인"}
          </Button>
        </form>

        <p className="text-center text-[#B8C3E6] mt-6">
          아직 계정이 없으신가요?{" "}
          <button 
            onClick={onSwitchToRegister}
            className="text-[#23D5AB] hover:underline font-medium"
          >
            회원가입
          </button>
        </p>
      </div>
    </div>
  )
}
