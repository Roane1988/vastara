import { useState, useCallback, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { AuthProvider, useAuth } from './context/AuthContext'
import ErrorBoundary from './components/ErrorBoundary'
import TopNavbar from './components/TopNavbar'
import Footer from './components/Footer'
import ProfileDrawer from './components/ProfileDrawer'
import HuniBot from './components/HuniBot'

const ExplorePage = lazy(() => import('./components/ExplorePage'))
const MinimalistLogin = lazy(() => import('./components/MinimalistLogin'))
const RoleSelectionPage = lazy(() => import('./components/RoleSelectionPage'))
const SellPropertyPage = lazy(() => import('./components/SellPropertyPage'))
const MyListingsPage = lazy(() => import('./components/MyListingsPage'))
const ChatHubPage = lazy(() => import('./components/ChatHubPage'))
const ForumPage = lazy(() => import('./components/ForumPage'))
const ForumDetailPage = lazy(() => import('./components/ForumDetailPage'))
const PropertyDetailPage = lazy(() => import('./components/PropertyDetailPage'))
const AdminDashboardPage = lazy(() => import('./components/AdminDashboardPage'))
const ComingSoonPage = lazy(() => import('./components/ComingSoonPage'))
const KprCalculatorPage = lazy(() => import('./components/KprCalculatorPage'))
const NotFoundPage = lazy(() => import('./components/NotFoundPage'))

function PageLoader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-brand-accent border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

const pageTransition = {
  initial: { opacity: 0, scale: 0.97, y: 8 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.97, y: -8 },
}

const transitionConfig = { duration: 0.4, ease: [0.22, 1, 0.36, 1] }

function ProtectedRoute({ isAuth, children, location }) {
  if (!isAuth) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  return children
}

function AdminRoute({ isAuth, role, children, location }) {
  if (!isAuth) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  if (role !== 'admin') return <Navigate to="/" replace />
  return children
}

function AppContent() {
  const navigate = useNavigate()
  const location = useLocation()
  const { session, user, role, loading, signOut } = useAuth()
  const [isProfileOpen, setIsProfileOpen] = useState(false)

  const isAuth = !!session?.user
  const userName = user?.user_metadata?.first_name || ''

  const onNavigate = (page) => navigate('/' + page)

  const onLogin = () => navigate('/')

  const handleLogout = useCallback(async () => {
    try { await signOut() } catch { /* force-clear */ }
    navigate('/')
  }, [navigate, signOut])

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-bg text-brand-text flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-brand-bg text-brand-text">
        <TopNavbar isAuth={isAuth} userName={userName} onProfileOpen={() => setIsProfileOpen(true)} onLogout={handleLogout} />
        <AnimatePresence mode="wait">
          <motion.div key={location.pathname} className="pt-14" variants={pageTransition} initial="initial" animate="animate" exit="exit" transition={transitionConfig}>
            <Suspense fallback={<PageLoader />}>
              <Routes location={location} key={location.pathname}>
                <Route path="/" element={<ExplorePage userName={userName} onNavigate={onNavigate} />} />
                <Route path="/explore" element={<ExplorePage userName={userName} onNavigate={onNavigate} />} />
                <Route path="/login" element={<MinimalistLogin onLoginSuccess={onLogin} />} />
                <Route path="/sell-role" element={<ProtectedRoute isAuth={isAuth} location={location}><RoleSelectionPage /></ProtectedRoute>} />
                <Route path="/sell" element={<ProtectedRoute isAuth={isAuth} location={location}><SellPropertyPage /></ProtectedRoute>} />
                <Route path="/my-listings" element={<ProtectedRoute isAuth={isAuth} location={location}><MyListingsPage /></ProtectedRoute>} />
                <Route path="/chat" element={<ProtectedRoute isAuth={isAuth} location={location}><ChatHubPage onNavigate={onNavigate} /></ProtectedRoute>} />
                <Route path="/forum" element={<ForumPage />} />
                <Route path="/forum/:id" element={<ForumDetailPage />} />
                <Route path="/property/:id" element={<PropertyDetailPage />} />
                <Route path="/admin" element={<AdminRoute isAuth={isAuth} role={role} location={location}><AdminDashboardPage /></AdminRoute>} />
                <Route path="/coming-soon" element={<ComingSoonPage />} />
                <Route path="/kpr" element={<KprCalculatorPage />} />
                <Route path="/404" element={<NotFoundPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          </motion.div>
        </AnimatePresence>
        <Footer />
        <ProfileDrawer isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} userName={userName} />
        <HuniBot />
      </div>
    </ErrorBoundary>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  )
}