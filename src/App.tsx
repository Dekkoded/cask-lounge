import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import RequireAuth from './components/RequireAuth'
import InstallPrompt from './components/InstallPrompt'
import TopBar from './components/TopBar'
import GlobalLanding from './pages/GlobalLanding'

const Login = lazy(() => import('./pages/Login'))
const Signup = lazy(() => import('./pages/Signup'))
const AddWhisky = lazy(() => import('./pages/AddWhisky'))
const EditWhisky = lazy(() => import('./pages/EditWhisky'))
const WhiskyDetail = lazy(() => import('./pages/WhiskyDetail'))
const MemberProfile = lazy(() => import('./pages/MemberProfile'))
const Members = lazy(() => import('./pages/Members'))
const Groups = lazy(() => import('./pages/Groups'))
const GroupHome = lazy(() => import('./pages/GroupHome'))
const Tasting = lazy(() => import('./pages/Tasting'))
const Profile = lazy(() => import('./pages/Profile'))

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <InstallPrompt />
        <TopBar />
        <Suspense fallback={<div className="max-w-2xl mx-auto p-6 text-stone-500 text-sm">Lädt…</div>}>
          <Routes>
            {/* Öffentlich */}
            <Route path="/" element={<GlobalLanding />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/whisky/:id" element={<WhiskyDetail />} />
            <Route path="/user/:id" element={<MemberProfile />} />
            <Route path="/members" element={<Members />} />

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
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  )
}
