import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/lib/use-auth"
import { api } from "@/lib/api"

interface RegisterScreenProps {
  onSwitchToLogin: () => void
  onClose?: () => void
}

export function RegisterScreen({ onSwitchToLogin, onClose }: RegisterScreenProps) {
  const { login } = useAuth()
  const [email, setEmail] = useState("")
  const [nickname, setNickname] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (password !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다")
      return
    }

    if (password.length < 6) {
      setError("비밀번호는 6자 이상이어야 합니다")
      return
    }

    setLoading(true)

    try {
      const result = await api.register(email, nickname, password)
      login(result.access_token, result.user)
      if (onClose) onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "회원가입에 실패했습니다")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0B1020] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-display text-4xl font-bold text-[#F4F7FF] mb-2">VibeCoder</h1>
          <p className="text-[#B8C3E6]">새로운 바이브코더가 되어보세요</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
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
            <label className="block text-[#F4F7FF] font-medium mb-2">닉네임</label>
            <Input 
              type="text"
              placeholder="사용할 닉네임을 입력하세요"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              required
              className="bg-[#161F42] border-[#111936] text-[#F4F7FF] placeholder-[#B8C3E6]/50 focus:ring-[#23D5AB]"
            />
          </div>

          <div>
            <label className="block text-[#F4F7FF] font-medium mb-2">비밀번호</label>
            <Input 
              type="password"
              placeholder="비밀번호 (6자 이상)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-[#161F42] border-[#111936] text-[#F4F7FF] placeholder-[#B8C3E6]/50 focus:ring-[#23D5AB]"
            />
          </div>

          <div>
            <label className="block text-[#F4F7FF] font-medium mb-2">비밀번호 확인</label>
            <Input 
              type="password"
              placeholder="비밀번호를 다시 입력하세요"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
            {loading ? "회원가입 중..." : "회원가입"}
          </Button>
        </form>

        <p className="text-center text-[#B8C3E6] mt-6">
          이미 계정이 있으신가요?{" "}
          <button 
            onClick={onSwitchToLogin}
            className="text-[#23D5AB] hover:underline font-medium"
          >
            로그인
          </button>
        </p>
      </div>
    </div>
  )
}
