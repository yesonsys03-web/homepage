import { useState } from 'react'
import { HomeScreen, ProjectDetailScreen, SubmitScreen, ProfileScreen, AdminScreen } from './components/screens'

type Screen = 'home' | 'detail' | 'submit' | 'profile' | 'admin'

function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home')

  const screens = {
    home: <HomeScreen />,
    detail: <ProjectDetailScreen />,
    submit: <SubmitScreen />,
    profile: <ProfileScreen />,
    admin: <AdminScreen />,
  }

  return (
    <>
      {/* Development Navigation */}
      <div className="fixed bottom-4 right-4 z-[100] flex gap-2 bg-[#161F42] p-2 rounded-lg shadow-lg">
        <button
          onClick={() => setCurrentScreen('home')}
          className={`px-3 py-1 rounded text-sm ${currentScreen === 'home' ? 'bg-[#23D5AB] text-[#0B1020]' : 'text-[#B8C3E6]'}`}
        >
          Home
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
      </div>
      
      {screens[currentScreen]}
    </>
  )
}

export default App
