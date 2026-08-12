import { useState, useCallback, useEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { SavedSearchAlertsProvider } from './context/SavedSearchAlertsContext'
import ErrorBoundary from './components/ErrorBoundary'
import TopNavbar from './components/TopNavbar'
import Footer from './components/Footer'

const ProfileDrawer = lazy(() => import('./components/ProfileDrawer'))
const HuniBot = lazy(() => import('./components/HuniBot'))

const ExplorePage = lazy(() => import('./components/ExplorePage'))
const MinimalistLogin = lazy(() => import('./components/MinimalistLogin'))
const RoleSelectionPage = lazy(() => import('./components/RoleSelectionPage'))
const AgentApplicationPage = lazy(() => import('./components/AgentApplicationPage'))
const AgentsPage = lazy(() => import('./components/AgentsPage'))
const AgentDetailPage = lazy(() => import('./components/AgentDetailPage'))
const AgentProfilePage = lazy(() => import('./components/AgentProfilePage'))
const SellPropertyPage = lazy(() => import('./components/SellPropertyPage'))
const MyListingsPage = lazy(() => import('./components/MyListingsPage'))
const ChatHubPage = lazy(() => import('./components/ChatHubPage'))
const ForumPage = lazy(() => import('./components/ForumPage'))
const ForumDetailPage = lazy(() => import('./components/ForumDetailPage'))
const PropertyDetailPage = lazy(() => import('./components/PropertyDetailPage'))
const SellerProfilePage = lazy(() => import('./pages/SellerProfilePage'))
const AdminDashboardPage = lazy(() => import('./components/AdminDashboardPage'))
const ComingSoonPage = lazy(() => import('./components/ComingSoonPage'))
const KprCalculatorPage = lazy(() => import('./components/KprCalculatorPage'))
const ComparePage = lazy(() => import('./components/ComparePage'))
const PriceDropPage = lazy(() => import('./components/PriceDropPage'))
const PriceTrendPage = lazy(() => import('./components/PriceTrendPage'))
const SavedSearchesPage = lazy(() => import('./components/SavedSearchesPage'))
const LegalPage = lazy(() => import('./components/LegalPage'))
const NotFoundPage = lazy(() => import('./components/NotFoundPage'))

function PageLoader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-brand-accent border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

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

  useEffect(() => {
    const openProfile = () => setIsProfileOpen(true)
    window.addEventListener('open-financial-profile', openProfile)
    return () => window.removeEventListener('open-financial-profile', openProfile)
  }, [])

  const isAuth = !!session?.user
  const userName = user?.user_metadata?.first_name || ''

  const onNavigate = (page) => navigate('/' + page)

  const onLogin = () => {
    const from = location.state?.from
    navigate(from && from !== '/login' ? from : '/')
  }

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
        <div key={location.pathname} className="pt-14 animate-page-in">
          <Suspense fallback={<PageLoader />}>
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<ExplorePage userName={userName} onNavigate={onNavigate} />} />
              <Route path="/explore" element={<ExplorePage userName={userName} onNavigate={onNavigate} />} />
              <Route path="/login" element={<MinimalistLogin onLoginSuccess={onLogin} />} />
              <Route path="/sell-role" element={<ProtectedRoute isAuth={isAuth} location={location}><RoleSelectionPage /></ProtectedRoute>} />
              <Route path="/agent-apply" element={<AgentApplicationPage />} />
              <Route path="/agents" element={<AgentsPage />} />
              <Route path="/agents/:id" element={<AgentDetailPage />} />
              <Route path="/seller/:id" element={<SellerProfilePage />} />
              <Route path="/agent-profile" element={<ProtectedRoute isAuth={isAuth} location={location}><AgentProfilePage /></ProtectedRoute>} />
              <Route path="/sell" element={<ProtectedRoute isAuth={isAuth} location={location}><SellPropertyPage /></ProtectedRoute>} />
              <Route path="/my-listings" element={<ProtectedRoute isAuth={isAuth} location={location}><MyListingsPage /></ProtectedRoute>} />
              <Route path="/chat" element={<ProtectedRoute isAuth={isAuth} location={location}><ChatHubPage onNavigate={onNavigate} /></ProtectedRoute>} />
              <Route path="/forum" element={<ForumPage />} />
              <Route path="/forum/:id" element={<ForumDetailPage />} />
              <Route path="/property/:id" element={<PropertyDetailPage />} />
              <Route path="/admin" element={<AdminRoute isAuth={isAuth} role={role} location={location}><AdminDashboardPage /></AdminRoute>} />
              <Route path="/coming-soon" element={<ComingSoonPage />} />
              <Route path="/kpr" element={<KprCalculatorPage />} />
              <Route path="/compare" element={<ComparePage />} />
              <Route path="/price-drop" element={<PriceDropPage />} />
              <Route path="/price-trends" element={<PriceTrendPage />} />
              <Route path="/saved-searches" element={<ProtectedRoute isAuth={isAuth} location={location}><SavedSearchesPage /></ProtectedRoute>} />
              <Route path="/terms" element={<LegalPage type="terms" />} />
              <Route path="/privacy" element={<LegalPage type="privacy" />} />
              <Route path="/404" element={<NotFoundPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </div>
        <Footer />
        <Suspense fallback={null}>
          <ProfileDrawer isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} userName={userName} />
          <HuniBot />
        </Suspense>
      </div>
    </ErrorBoundary>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SavedSearchAlertsProvider>
          <AppContent />
        </SavedSearchAlertsProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}