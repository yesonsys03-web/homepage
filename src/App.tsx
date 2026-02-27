import { useState } from 'react'
import { HomeScreen, ProjectDetailScreen, SubmitScreen, ProfileScreen, AdminScreen, ExploreScreen, ChallengesScreen, AboutScreen } from './components/screens'
import { LoginScreen } from './components/screens/LoginScreen'
import { RegisterScreen } from './components/screens/RegisterScreen'
import { AuthProvider, useAuth } from './lib/auth-context'

type Screen = 'home' | 'detail' | 'submit' | 'profile' | 'admin' | 'login' | 'register' | 'explore' | 'challenges' | 'about'

function AppContent() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home')
  const { user, logout, isLoading } = useAuth()

  const handleLoginSwitch = () => setCurrentScreen('login')
  const handleRegisterSwitch = () => setCurrentScreen('register')
  const handleAuthSuccess = () => setCurrentScreen('home')

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
    home: <HomeScreen onNavigate={setCurrentScreen} />,
    detail: <ProjectDetailScreen />,
    submit: <SubmitScreen />,
    profile: <ProfileScreen />,
    admin: <AdminScreen />,
    explore: <ExploreScreen onNavigate={setCurrentScreen} />,
    challenges: <ChallengesScreen onNavigate={setCurrentScreen} />,
    about: <AboutScreen onNavigate={setCurrentScreen} />,
    login: <LoginScreen onSwitchToRegister={handleRegisterSwitch} onClose={handleAuthSuccess} />,
    register: <RegisterScreen onSwitchToLogin={handleLoginSwitch} onClose={handleAuthSuccess} />,
  }

  return (
    <>
      <div className="fixed bottom-4 right-4 z-[100] flex gap-2 bg-[#161F42] p-2 rounded-lg shadow-lg">
        <button
          onClick={() => setCurrentScreen('home')}
          className={`px-3 py-1 rounded text-sm ${currentScreen === 'home' ? 'bg-[#23D5AB] text-[#0B1020]' : 'text-[#B8C3E6]'}`}
        >
          Home
        </button>
        <button
          onClick={() => setCurrentScreen('explore')}
          className={`px-3 py-1 rounded text-sm ${currentScreen === 'explore' ? 'bg-[#23D5AB] text-[#0B1020]' : 'text-[#B8C3E6]'}`}
        >
          Explore
        </button>
        <button
          onClick={() => setCurrentScreen('challenges')}
          className={`px-3 py-1 rounded text-sm ${currentScreen === 'challenges' ? 'bg-[#23D5AB] text-[#0B1020]' : 'text-[#B8C3E6]'}`}
        >
          Challenges
        </button>
        <button
          onClick={() => setCurrentScreen('about')}
          className={`px-3 py-1 rounded text-sm ${currentScreen === 'about' ? 'bg-[#23D5AB] text-[#0B1020]' : 'text-[#B8C3E6]'}`}
        >
          About
        </button>
        <button
          onClick={() => setCurrentScreen('detail')}
          className={`px-3 py-1 rounded text-sm ${currentScreen === 'detail' ? 'bg-[#23D5AB] text-[#0B1020]' : 'text-[#B8C3E6]'}`}
        >
          Detail
        </button>
        <button
          onClick={() => setCurrentScreen('submit')}
          className={`px-3 py-1 rounded text-sm ${currentScreen === 'submit' ? 'bg-[#23D5AB] text-[#0B1020]' : 'text-[#B8C3E6]'}`}
        >
          Submit
        </button>
        <button
          onClick={() => setCurrentScreen('profile')}
          className={`px-3 py-1 rounded text-sm ${currentScreen === 'profile' ? 'bg-[#23D5AB] text-[#0B1020]' : 'text-[#B8C3E6]'}`}
        >
          Profile
        </button>
        <button
          onClick={() => setCurrentScreen('admin')}
          className={`px-3 py-1 rounded text-sm ${currentScreen === 'admin' ? 'bg-[#FF5D8F] text-white' : 'text-[#B8C3E6]'}`}
        >
          Admin
        </button>
        
        {user ? (
          <button
            onClick={logout}
            className="px-3 py-1 rounded text-sm bg-[#FF6B6B] text-white"
          >
            Logout ({user.nickname})
          </button>
        ) : (
          <button
            onClick={() => setCurrentScreen('login')}
            className="px-3 py-1 rounded text-sm bg-[#23D5AB] text-[#0B1020]"
          >
            Login
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
