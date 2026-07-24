import { useState, useCallback } from 'react'
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { AuthProvider, useAuth } from './context/AuthContext'
import TopNavbar from './components/TopNavbar'
import ProfileDrawer from './components/ProfileDrawer'
import MinimalistLogin from './components/MinimalistLogin'
import ExplorePage from './components/ExplorePage'
import ChatHubPage from './components/ChatHubPage'
import PropertyDetailPage from './components/PropertyDetailPage'
import SellPropertyPage from './components/SellPropertyPage'
import RoleSelectionPage from './components/RoleSelectionPage'
import ForumPage from './components/ForumPage'
import ForumDetailPage from './components/ForumDetailPage'
import ComingSoonPage from './components/ComingSoonPage'

const pageTransition = {
  initial: { opacity: 0, scale: 0.97, y: 8 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.97, y: -8 },
}

const transitionConfig = {
  duration: 0.4,
  ease: [0.22, 1, 0.36, 1],
}

function ProtectedRoute({ isAuth, children, location }) {
  if (!isAuth) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }
  return children
}

function AppContent() {
  const navigate = useNavigate()
  const location = useLocation()
  const { session, user, loading } = useAuth()
  const [isProfileOpen, setIsProfileOpen] = useState(false)

  const isAuth = !!session?.user
  const userName = user?.user_metadata?.first_name || ''

  const onNavigate = (page) => {
    navigate('/' + page)
  }

  const onLogin = () => {
    navigate('/')
  }

  const handleLogout = useCallback(() => {
    navigate('/')
  }, [navigate])

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-bg text-brand-text flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text">
      <TopNavbar
        isAuth={isAuth}
        userName={userName}
        onProfileOpen={() => setIsProfileOpen(true)}
        onLogout={handleLogout}
      />
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          className="pt-14"
          variants={pageTransition}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={transitionConfig}
        >
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<ExplorePage userName={userName} onNavigate={onNavigate} />} />
            <Route path="/explore" element={<ExplorePage userName={userName} onNavigate={onNavigate} />} />
            <Route path="/login" element={<MinimalistLogin onLoginSuccess={onLogin} />} />
            <Route path="/sell-role" element={
              <ProtectedRoute isAuth={isAuth} location={location}>
                <RoleSelectionPage />
              </ProtectedRoute>
            } />
            <Route path="/sell" element={
              <ProtectedRoute isAuth={isAuth} location={location}>
                <SellPropertyPage />
              </ProtectedRoute>
            } />
            <Route path="/chat" element={<ChatHubPage onNavigate={onNavigate} />} />
            <Route path="/forum" element={<ForumPage />} />
            <Route path="/forum/:id" element={<ForumDetailPage />} />
            <Route path="/property/:id" element={<PropertyDetailPage />} />
            <Route path="/coming-soon" element={<ComingSoonPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
      <ProfileDrawer isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} userName={userName} />
    </div>
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