import { useEffect, useState } from 'react'
import { HomeScreen, ProjectDetailScreen, SubmitScreen, ProfileScreen, AdminScreen, ExploreScreen, ChallengesScreen, AboutScreen } from './components/screens'
import { LoginScreen } from './components/screens/LoginScreen'
import { RegisterScreen } from './components/screens/RegisterScreen'
import { AuthProvider } from './lib/auth-context'
import { useAuth } from './lib/use-auth'
import { api } from './lib/api'
import { isAdminRole } from './lib/roles'

type Screen = 'home' | 'detail' | 'submit' | 'profile' | 'admin' | 'login' | 'register' | 'explore' | 'challenges' | 'about'

function AppContent() {
  const initialUrl = new URL(window.location.href)
  const initialProjectId = initialUrl.searchParams.get('project')
  const initialOauthToken = initialUrl.searchParams.get('oauth_token')
  const initialOauthStatus = initialUrl.searchParams.get('oauth_status')
  const [currentScreen, setCurrentScreen] = useState<Screen>(
    initialOauthToken || initialOauthStatus ? 'login' : initialProjectId ? 'detail' : 'home'
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
    const oauthToken = url.searchParams.get('oauth_token')
    const oauthStatus = url.searchParams.get('oauth_status')
    if (!oauthToken && !oauthStatus) {
      return
    }

    const clearOAuthQuery = () => {
      const currentUrl = new URL(window.location.href)
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

    if (!oauthToken) {
      return
    }

    let cancelled = false
    const restoreOAuthSession = async () => {
      try {
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0B1020] flex items-center justify-center">
        <div className="text-[#23D5AB]">로딩 중...</div>
      </div>
    )
  }

  if (currentScreen === 'login') {
    return <LoginScreen onSwitchToRegister={handleRegisterSwitch} onClose={handleAuthSuccess} />
  }

  if (currentScreen === 'register') {
    return <RegisterScreen onSwitchToLogin={handleLoginSwitch} onClose={handleAuthSuccess} />
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

  return (
    <>
      <div className="fixed bottom-4 right-4 z-[100] flex gap-2 bg-[#161F42] p-2 rounded-lg shadow-lg">
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
          className={`px-3 py-1 rounded text-sm ${currentScreen === 'detail' ? 'bg-[#23D5AB] text-[#0B1020]' : 'text-[#B8C3E6]'}`}
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
      </div>
      
      {screens[currentScreen]}
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
