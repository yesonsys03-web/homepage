import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom'
import { AuthProvider } from './lib/auth-context'
import { useAuth } from './lib/use-auth'
import { api } from './lib/api'
import { isAdminRole } from './lib/roles'

type Screen =
  | 'home'
  | 'detail'
  | 'submit'
  | 'profile'
  | 'admin'
  | 'login'
  | 'register'
  | 'explore'
  | 'challenges'
  | 'about'

type RouteState = {
  screen: Screen
  projectId: string | null
  editingProjectId: string | null
}

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

function getCanonicalPath(pathname: string, screen: Screen): string {
  if (screen === 'submit' && /^\/submit\/[^/]+\/edit$/.test(pathname)) {
    return '/submit'
  }
  return pathname || '/'
}

function parseRoute(pathname: string): RouteState {
  const detailMatch = pathname.match(/^\/project\/([^/]+)$/)
  if (detailMatch) {
    return {
      screen: 'detail',
      projectId: decodeURIComponent(detailMatch[1]),
      editingProjectId: null,
    }
  }

  const submitEditMatch = pathname.match(/^\/submit\/([^/]+)\/edit$/)
  if (submitEditMatch) {
    return {
      screen: 'submit',
      projectId: null,
      editingProjectId: decodeURIComponent(submitEditMatch[1]),
    }
  }

  if (pathname === '/submit') return { screen: 'submit', projectId: null, editingProjectId: null }
  if (pathname === '/profile') return { screen: 'profile', projectId: null, editingProjectId: null }
  if (pathname === '/admin') return { screen: 'admin', projectId: null, editingProjectId: null }
  if (pathname === '/login') return { screen: 'login', projectId: null, editingProjectId: null }
  if (pathname === '/register') return { screen: 'register', projectId: null, editingProjectId: null }
  if (pathname === '/explore') return { screen: 'explore', projectId: null, editingProjectId: null }
  if (pathname === '/challenges') return { screen: 'challenges', projectId: null, editingProjectId: null }
  if (pathname === '/about') return { screen: 'about', projectId: null, editingProjectId: null }
  return { screen: 'home', projectId: null, editingProjectId: null }
}

function getPathForScreen(screen: Screen, projectId: string | null): string {
  if (screen === 'home') return '/'
  if (screen === 'explore') return '/explore'
  if (screen === 'challenges') return '/challenges'
  if (screen === 'about') return '/about'
  if (screen === 'submit') return '/submit'
  if (screen === 'profile') return '/profile'
  if (screen === 'admin') return '/admin'
  if (screen === 'login') return '/login'
  if (screen === 'register') return '/register'
  if (screen === 'detail' && projectId) return `/project/${encodeURIComponent(projectId)}`
  return '/explore'
}

function isScreen(value: string | null): value is Screen {
  if (!value) {
    return false
  }
  return [
    'home',
    'detail',
    'submit',
    'profile',
    'admin',
    'login',
    'register',
    'explore',
    'challenges',
    'about',
  ].includes(value)
}

function AppContent() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, login, logout, isLoading } = useAuth()
  const [lastProjectId, setLastProjectId] = useState<string | null>(null)

  const routeState = useMemo(() => parseRoute(location.pathname), [location.pathname])
  const currentScreen = routeState.screen
  const selectedProjectId = routeState.projectId ?? lastProjectId

  useEffect(() => {
    if (location.pathname !== '/') {
      return
    }

    const params = new URLSearchParams(location.search)
    if (params.get('oauth_code') || params.get('oauth_token') || params.get('oauth_status')) {
      return
    }

    const legacyProjectId = params.get('project')
    if (legacyProjectId) {
      navigate(`/project/${encodeURIComponent(legacyProjectId)}`, { replace: true })
      return
    }

    const legacyScreen = params.get('screen')
    if (!isScreen(legacyScreen) || legacyScreen === 'home' || legacyScreen === 'detail') {
      return
    }

    navigate(getPathForScreen(legacyScreen, null), { replace: true })
  }, [location.pathname, location.search, navigate])

  useEffect(() => {
    if (routeState.projectId) {
      setLastProjectId(routeState.projectId)
    }
  }, [routeState.projectId])

  useEffect(() => {
    if (routeState.editingProjectId) {
      setLastProjectId(routeState.editingProjectId)
    }
  }, [routeState.editingProjectId])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const oauthCode = params.get('oauth_code')
    const oauthToken = params.get('oauth_token')
    const oauthStatus = params.get('oauth_status')
    if (!oauthCode && !oauthToken && !oauthStatus) {
      return
    }

    const clearOAuthQuery = () => {
      const currentParams = new URLSearchParams(location.search)
      currentParams.delete('oauth_code')
      currentParams.delete('oauth_token')
      currentParams.delete('oauth_status')
      const search = currentParams.toString()
      navigate(
        {
          pathname: location.pathname,
          search: search ? `?${search}` : '',
        },
        { replace: true },
      )
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
          navigate('/', { replace: true })
          return
        }

        if (!oauthToken) {
          throw new Error('OAuth 토큰이 누락되었습니다')
        }
        const me = await api.getMeWithToken(oauthToken)
        if (cancelled) return
        login(oauthToken, me)
        clearOAuthQuery()
        navigate('/', { replace: true })
      } catch (error) {
        console.error('Google OAuth session restore failed:', error)
        if (!cancelled) {
          clearOAuthQuery()
          navigate('/login', { replace: true })
          window.alert(error instanceof Error ? error.message : 'Google 로그인에 실패했습니다.')
        }
      }
    }

    void restoreOAuthSession()
    return () => {
      cancelled = true
    }
  }, [location.pathname, location.search, login, navigate])

  useEffect(() => {
    if (isLoading) {
      return
    }
    if (currentScreen === 'admin' && !isAdminRole(user?.role)) {
      navigate(user ? '/' : '/login', { replace: true })
    }
  }, [currentScreen, isLoading, navigate, user])

  const handleLogout = () => {
    logout()
    setLastProjectId(null)
    navigate('/', { replace: true })
  }

  const handleLoginSwitch = () => navigate('/login')
  const handleRegisterSwitch = () => navigate('/register')
  const handleAuthSuccess = () => navigate('/')

  const handleNavigate = (screen: Screen) => {
    if ((screen === 'submit' || screen === 'profile') && !user) {
      navigate('/login')
      return
    }

    if (screen === 'admin' && !isAdminRole(user?.role)) {
      navigate(user ? '/' : '/login')
      return
    }

    const targetPath = getPathForScreen(screen, selectedProjectId)
    navigate(targetPath)
  }

  const openProjectDetail = (projectId: string) => {
    setLastProjectId(projectId)
    navigate(`/project/${encodeURIComponent(projectId)}`)
  }

  const openProjectEdit = (projectId: string) => {
    if (!user) {
      navigate('/login')
      return
    }
    setLastProjectId(projectId)
    navigate(`/submit/${encodeURIComponent(projectId)}/edit`)
  }

  const screenMeta = useMemo(
    () => getScreenMeta(currentScreen, selectedProjectId),
    [currentScreen, selectedProjectId],
  )
  const canonicalPath = useMemo(
    () => getCanonicalPath(location.pathname, currentScreen),
    [currentScreen, location.pathname],
  )
  const canonicalUrl = useMemo(() => `${window.location.origin}${canonicalPath}`, [canonicalPath])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0B1020] flex items-center justify-center">
        <div className="text-[#23D5AB]">로딩 중...</div>
      </div>
    )
  }

  return (
    <>
      <Helmet prioritizeSeoTags>
        <title>{screenMeta.title}</title>
        <meta name="description" content={screenMeta.description} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={screenMeta.title} />
        <meta property="og:description" content={screenMeta.description} />
        <meta property="og:url" content={canonicalUrl} />
      </Helmet>
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
            onClick={() => navigate('/login')}
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
          <Routes>
            <Route path="/" element={<HomeScreen onNavigate={handleNavigate} onOpenProject={openProjectDetail} />} />
            <Route path="/explore" element={<ExploreScreen onNavigate={handleNavigate} onOpenProject={openProjectDetail} />} />
            <Route path="/challenges" element={<ChallengesScreen onNavigate={handleNavigate} />} />
            <Route path="/about" element={<AboutScreen onNavigate={handleNavigate} />} />
            <Route path="/submit" element={<SubmitScreen onNavigate={handleNavigate} />} />
            <Route path="/submit/:projectId/edit" element={<SubmitScreen onNavigate={handleNavigate} editingProjectId={routeState.editingProjectId ?? undefined} />} />
            <Route path="/profile" element={<ProfileScreen onNavigate={handleNavigate} />} />
            <Route path="/admin" element={<AdminScreen onNavigate={handleNavigate} />} />
            <Route path="/login" element={<LoginScreen onSwitchToRegister={handleRegisterSwitch} onClose={handleAuthSuccess} />} />
            <Route path="/register" element={<RegisterScreen onSwitchToLogin={handleLoginSwitch} onClose={handleAuthSuccess} />} />
            <Route path="/project/:projectId" element={<ProjectDetailScreen onNavigate={handleNavigate} projectId={routeState.projectId ?? undefined} onEditProject={openProjectEdit} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
    </>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
