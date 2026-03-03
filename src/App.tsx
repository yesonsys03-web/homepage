import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { AuthProvider } from './lib/auth-context'
import { useAuth } from './lib/use-auth'
import { api } from './lib/api'
import { isAdminRole } from './lib/roles'

type Screen = 'home' | 'detail' | 'submit' | 'profile' | 'admin' | 'login' | 'register' | 'explore' | 'challenges' | 'about'

const HomeScreen = lazy(async () => {
  const module = await import('./components/screens/HomeScreen')
  return { default: module.HomeScreen }
})

const ProjectDetailScreen = lazy(async () => {
  const module = await import('./components/screens/ProjectDetailScreen')
  return { default: module.ProjectDetailScreen }
})

const SubmitScreen = lazy(async () => {
  const module = await import('./components/screens/SubmitScreen')
  return { default: module.SubmitScreen }
})

const ProfileScreen = lazy(async () => {
  const module = await import('./components/screens/ProfileScreen')
  return { default: module.ProfileScreen }
})

const AdminScreen = lazy(async () => {
  const module = await import('./components/screens/AdminScreen')
  return { default: module.AdminScreen }
})

const ExploreScreen = lazy(async () => {
  const module = await import('./components/screens/ExploreScreen')
  return { default: module.ExploreScreen }
})

const ChallengesScreen = lazy(async () => {
  const module = await import('./components/screens/ChallengesScreen')
  return { default: module.ChallengesScreen }
})

const AboutScreen = lazy(async () => {
  const module = await import('./components/screens/AboutScreen')
  return { default: module.AboutScreen }
})

const LoginScreen = lazy(async () => {
  const module = await import('./components/screens/LoginScreen')
  return { default: module.LoginScreen }
})

const RegisterScreen = lazy(async () => {
  const module = await import('./components/screens/RegisterScreen')
  return { default: module.RegisterScreen }
})

function getScreenMeta(screen: Screen, projectId: string | null): { title: string; description: string } {
  const metaByScreen: Record<Screen, { title: string; description: string }> = {
    home: {
      title: 'VibeCoder Playground - AI 바이브코딩 프로젝트 쇼케이스',
      description: 'AI와 함께 만든 사이드 프로젝트를 공유하고 발견하세요. 바이브코딩 커뮤니티의 창작물을 탐색해보세요.',
    },
    detail: {
      title: projectId ? `프로젝트 상세 - ${projectId} | VibeCoder Playground` : '프로젝트 상세 | VibeCoder Playground',
      description: '프로젝트 상세 정보, 기술 스택, 데모 링크와 피드백을 확인할 수 있습니다.',
    },
    submit: {
      title: '작품 올리기 | VibeCoder Playground',
      description: '당신의 프로젝트를 커뮤니티에 공유하고 반응을 확인해보세요.',
    },
    profile: {
      title: '내 프로필 | VibeCoder Playground',
      description: '내가 올린 프로젝트와 활동 기록을 관리합니다.',
    },
    admin: {
      title: '관리자 대시보드 | VibeCoder Playground',
      description: '콘텐츠/사용자 정책을 운영하고 커뮤니티 품질을 관리합니다.',
    },
    login: {
      title: '로그인 | VibeCoder Playground',
      description: '로그인하고 프로젝트를 공유하거나 피드백에 참여하세요.',
    },
    register: {
      title: '회원가입 | VibeCoder Playground',
      description: '바이브코딩 커뮤니티에 가입하고 창작물을 공유해보세요.',
    },
    explore: {
      title: '탐색 | VibeCoder Playground',
      description: '다양한 바이브코딩 프로젝트를 탐색하고 영감을 얻어보세요.',
    },
    challenges: {
      title: '챌린지 | VibeCoder Playground',
      description: '커뮤니티 챌린지에 참여하고 새로운 실험을 시작해보세요.',
    },
    about: {
      title: '소개 | VibeCoder Playground',
      description: 'VibeCoder Playground의 비전과 팀, 커뮤니티 문화를 소개합니다.',
    },
  }

  return metaByScreen[screen]
}

function AppContent() {
  const initialUrl = new URL(window.location.href)
  const initialProjectId = initialUrl.searchParams.get('project')
  const initialOauthCode = initialUrl.searchParams.get('oauth_code')
  const initialOauthToken = initialUrl.searchParams.get('oauth_token')
  const initialOauthStatus = initialUrl.searchParams.get('oauth_status')
  const [currentScreen, setCurrentScreen] = useState<Screen>(
    initialOauthCode || initialOauthToken || initialOauthStatus ? 'login' : initialProjectId ? 'detail' : 'home'
  )
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(initialProjectId)
  const [submitEditingProjectId, setSubmitEditingProjectId] = useState<string | null>(null)
  const { user, login, logout, isLoading } = useAuth()

  const syncProjectQuery = (projectId: string | null) => {
    const url = new URL(window.location.href)
    if (projectId) {
      url.searchParams.set('project', projectId)
    } else {
      url.searchParams.delete('project')
    }
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
  }

  useEffect(() => {
    const url = new URL(window.location.href)
    const oauthCode = url.searchParams.get('oauth_code')
    const oauthToken = url.searchParams.get('oauth_token')
    const oauthStatus = url.searchParams.get('oauth_status')
    if (!oauthCode && !oauthToken && !oauthStatus) {
      return
    }

    const clearOAuthQuery = () => {
      const currentUrl = new URL(window.location.href)
      currentUrl.searchParams.delete('oauth_code')
      currentUrl.searchParams.delete('oauth_token')
      currentUrl.searchParams.delete('oauth_status')
      window.history.replaceState({}, '', `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`)
    }

    if (oauthStatus === 'pending') {
      clearOAuthQuery()
      window.alert('Google 가입이 접수되었습니다. 관리자 승인 후 로그인할 수 있습니다.')
      return
    }
    if (oauthStatus === 'rejected') {
      clearOAuthQuery()
      window.alert('가입이 반려된 계정입니다. 관리자에게 문의해 주세요.')
      return
    }

    if (!oauthCode && !oauthToken) {
      return
    }

    let cancelled = false
    const restoreOAuthSession = async () => {
      try {
        if (oauthCode) {
          const result = await api.exchangeGoogleOAuthCode(oauthCode)
          if (cancelled) return
          login(result.access_token, result.user)
          clearOAuthQuery()
          setCurrentScreen('home')
          return
        }

        if (!oauthToken) {
          throw new Error('OAuth 토큰이 누락되었습니다')
        }
        const me = await api.getMeWithToken(oauthToken)
        if (cancelled) return
        login(oauthToken, me)
        clearOAuthQuery()
        setCurrentScreen('home')
      } catch (error) {
        console.error('Google OAuth session restore failed:', error)
        if (!cancelled) {
          clearOAuthQuery()
          setCurrentScreen('login')
          window.alert(error instanceof Error ? error.message : 'Google 로그인에 실패했습니다.')
        }
      }
    }

    void restoreOAuthSession()
    return () => {
      cancelled = true
    }
  }, [login])

  useEffect(() => {
    if (isLoading) {
      return
    }

    if (currentScreen === 'admin' && !isAdminRole(user?.role)) {
      setCurrentScreen('home')
    }
  }, [currentScreen, isLoading, user])

  const handleLogout = () => {
    logout()
    syncProjectQuery(null)
    setCurrentScreen('home')
  }

  const handleLoginSwitch = () => setCurrentScreen('login')
  const handleRegisterSwitch = () => setCurrentScreen('register')
  const handleAuthSuccess = () => setCurrentScreen('home')

  const handleNavigate = (screen: Screen) => {
    if ((screen === 'submit' || screen === 'profile') && !user) {
      setCurrentScreen('login')
      return
    }

    if (screen === 'admin' && !isAdminRole(user?.role)) {
      setCurrentScreen(user ? 'home' : 'login')
      return
    }

    if (screen === 'submit') {
      setSubmitEditingProjectId(null)
    }

    if (screen === 'detail' && !selectedProjectId) {
      setCurrentScreen('explore')
      return
    }

    if (screen !== 'detail') {
      syncProjectQuery(null)
    }

    setCurrentScreen(screen)
  }

  const openProjectDetail = (projectId: string) => {
    setSelectedProjectId(projectId)
    syncProjectQuery(projectId)
    setCurrentScreen('detail')
  }

  const openProjectEdit = (projectId: string) => {
    if (!user) {
      setCurrentScreen('login')
      return
    }
    setSubmitEditingProjectId(projectId)
    syncProjectQuery(projectId)
    setCurrentScreen('submit')
  }

  const screens = {
    home: <HomeScreen onNavigate={handleNavigate} onOpenProject={openProjectDetail} />,
    detail: <ProjectDetailScreen onNavigate={handleNavigate} projectId={selectedProjectId ?? undefined} onEditProject={openProjectEdit} />,
    submit: <SubmitScreen onNavigate={handleNavigate} editingProjectId={submitEditingProjectId ?? undefined} />,
    profile: <ProfileScreen onNavigate={handleNavigate} />,
    admin: <AdminScreen onNavigate={handleNavigate} />,
    explore: <ExploreScreen onNavigate={handleNavigate} onOpenProject={openProjectDetail} />,
    challenges: <ChallengesScreen onNavigate={handleNavigate} />,
    about: <AboutScreen onNavigate={handleNavigate} />,
    login: <LoginScreen onSwitchToRegister={handleRegisterSwitch} onClose={handleAuthSuccess} />,
    register: <RegisterScreen onSwitchToLogin={handleLoginSwitch} onClose={handleAuthSuccess} />,
  }

  const screenMeta = useMemo(
    () => getScreenMeta(currentScreen, selectedProjectId),
    [currentScreen, selectedProjectId]
  )

  useEffect(() => {
    document.title = screenMeta.title

    const selector = 'meta[name="description"]'
    const existing = document.head.querySelector(selector)
    if (existing) {
      existing.setAttribute('content', screenMeta.description)
      return
    }

    const meta = document.createElement('meta')
    meta.setAttribute('name', 'description')
    meta.setAttribute('content', screenMeta.description)
    document.head.appendChild(meta)
  }, [screenMeta])

  useEffect(() => {
    if (currentScreen === 'detail' && !selectedProjectId) {
      setCurrentScreen('explore')
    }
  }, [currentScreen, selectedProjectId])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0B1020] flex items-center justify-center">
        <div className="text-[#23D5AB]">로딩 중...</div>
      </div>
    )
  }

  return (
    <>
      <nav className="fixed bottom-4 right-4 z-[100] flex gap-2 bg-[#161F42] p-2 rounded-lg shadow-lg" aria-label="Quick navigation menu">
        <button
          onClick={() => handleNavigate('home')}
          className={`px-3 py-1 rounded text-sm ${currentScreen === 'home' ? 'bg-[#23D5AB] text-[#0B1020]' : 'text-[#B8C3E6]'}`}
        >
          Home
        </button>
        <button
          onClick={() => handleNavigate('explore')}
          className={`px-3 py-1 rounded text-sm ${currentScreen === 'explore' ? 'bg-[#23D5AB] text-[#0B1020]' : 'text-[#B8C3E6]'}`}
        >
          Explore
        </button>
        <button
          onClick={() => handleNavigate('challenges')}
          className={`px-3 py-1 rounded text-sm ${currentScreen === 'challenges' ? 'bg-[#23D5AB] text-[#0B1020]' : 'text-[#B8C3E6]'}`}
        >
          Challenges
        </button>
        <button
          onClick={() => handleNavigate('about')}
          className={`px-3 py-1 rounded text-sm ${currentScreen === 'about' ? 'bg-[#23D5AB] text-[#0B1020]' : 'text-[#B8C3E6]'}`}
        >
          About
        </button>
        <button
          onClick={() => handleNavigate('detail')}
          className={`px-3 py-1 rounded text-sm ${currentScreen === 'detail' ? 'bg-[#23D5AB] text-[#0B1020]' : selectedProjectId ? 'text-[#B8C3E6]' : 'text-[#6474A8] cursor-not-allowed'}`}
          disabled={!selectedProjectId}
          title={selectedProjectId ? '선택한 프로젝트 상세로 이동' : '프로젝트를 먼저 선택해 주세요'}
        >
          Detail
        </button>
        <button
          onClick={() => handleNavigate('submit')}
          className={`px-3 py-1 rounded text-sm ${currentScreen === 'submit' ? 'bg-[#23D5AB] text-[#0B1020]' : 'text-[#B8C3E6]'}`}
        >
          Submit
        </button>
        <button
          onClick={() => handleNavigate('profile')}
          className={`px-3 py-1 rounded text-sm ${currentScreen === 'profile' ? 'bg-[#23D5AB] text-[#0B1020]' : 'text-[#B8C3E6]'}`}
        >
          Profile
        </button>
        <button
          onClick={() => handleNavigate('admin')}
          className={`px-3 py-1 rounded text-sm ${currentScreen === 'admin' ? 'bg-[#FF5D8F] text-white' : 'text-[#B8C3E6]'}`}
        >
          Admin
        </button>
        
        {user ? (
          <button
            onClick={handleLogout}
            className="px-3 py-1 rounded text-sm bg-[#FF6B6B] text-white"
          >
            로그아웃 ({user.nickname})
          </button>
        ) : (
          <button
            onClick={() => setCurrentScreen('login')}
            className="px-3 py-1 rounded text-sm bg-[#23D5AB] text-[#0B1020]"
          >
            로그인
          </button>
        )}
      </nav>
      
      <main id="main-content">
        <Suspense
          fallback={
            <div className="min-h-screen bg-[#0B1020] flex items-center justify-center">
              <div className="text-[#23D5AB]">화면을 불러오는 중...</div>
            </div>
          }
        >
          {screens[currentScreen]}
        </Suspense>
      </main>
    </>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
