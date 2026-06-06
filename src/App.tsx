import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AuthProvider, useAuth } from './context/AuthContext'
import RequireAuth from './components/RequireAuth'
import InstallPrompt from './components/InstallPrompt'
import IntroTour from './components/IntroTour'
import TopBar from './components/TopBar'
import BottomNav from './components/BottomNav'
import GlobalLanding from './pages/GlobalLanding'

const Login = lazy(() => import('./pages/Login'))
const Signup = lazy(() => import('./pages/Signup'))
const AddWhisky = lazy(() => import('./pages/AddWhisky'))
const EditWhisky = lazy(() => import('./pages/EditWhisky'))
const WhiskyDetail = lazy(() => import('./pages/WhiskyDetail'))
const MemberProfile = lazy(() => import('./pages/MemberProfile'))
const Members = lazy(() => import('./pages/Members'))
const Groups = lazy(() => import('./pages/Groups'))
const JoinGroup = lazy(() => import('./pages/JoinGroup'))
const GroupHome = lazy(() => import('./pages/GroupHome'))
const Tasting = lazy(() => import('./pages/Tasting'))
const Profile = lazy(() => import('./pages/Profile'))
const Legal = lazy(() => import('./pages/Legal'))
const Compare = lazy(() => import('./pages/Compare'))

function AppShell() {
  const { user } = useAuth()
  const { t } = useTranslation()
  return (
    <>
      <InstallPrompt />
      <IntroTour />
      <TopBar />
      <main className={user ? 'pb-20' : ''}>
        <Suspense fallback={<div className="max-w-2xl mx-auto p-6 text-stone-500 text-sm">{t('common.loading')}</div>}>
          <Routes>
            {/* Öffentlich */}
            <Route path="/" element={<GlobalLanding />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/whisky/:id" element={<WhiskyDetail />} />
            <Route path="/user/:id" element={<MemberProfile />} />
            <Route path="/members" element={<Members />} />
            <Route path="/compare" element={<Compare />} />
            <Route path="/join/:code" element={<JoinGroup />} />
            <Route path="/impressum" element={<Legal doc="impressum" />} />
            <Route path="/datenschutz" element={<Legal doc="datenschutz" />} />
            <Route path="/agb" element={<Legal doc="agb" />} />

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
      </main>
      {user && <BottomNav />}
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </AuthProvider>
  )
}
