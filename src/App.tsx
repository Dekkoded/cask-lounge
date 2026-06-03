import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import RequireAuth from './components/RequireAuth'
import InstallPrompt from './components/InstallPrompt'
import TopBar from './components/TopBar'
import GlobalLanding from './pages/GlobalLanding'
import Login from './pages/Login'
import Signup from './pages/Signup'
import AddWhisky from './pages/AddWhisky'
import EditWhisky from './pages/EditWhisky'
import WhiskyDetail from './pages/WhiskyDetail'
import Groups from './pages/Groups'
import GroupHome from './pages/GroupHome'
import Tasting from './pages/Tasting'
import Profile from './pages/Profile'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <InstallPrompt />
        <TopBar />
        <Routes>
          {/* Öffentlich */}
          <Route path="/" element={<GlobalLanding />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/whisky/:id" element={<WhiskyDetail />} />

          {/* Geschützt */}
          <Route path="/add-whisky" element={<RequireAuth><AddWhisky /></RequireAuth>} />
          <Route path="/whisky/:id/edit" element={<RequireAuth><EditWhisky /></RequireAuth>} />
          <Route path="/groups" element={<RequireAuth><Groups /></RequireAuth>} />
          <Route path="/groups/:id" element={<RequireAuth><GroupHome /></RequireAuth>} />
          <Route path="/groups/:id/tasting/:tid" element={<RequireAuth><Tasting /></RequireAuth>} />
          <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
