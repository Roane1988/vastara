import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { supabase } from './supabaseClient'
import MinimalistLogin from './components/MinimalistLogin'
import PersonalDashboard from './components/PersonalDashboard'
import SavedPropertiesPage from './components/SavedPropertiesPage'
import ExplorePage from './components/ExplorePage'
import ChatHubPage from './components/ChatHubPage'
import PropertyDetailPage from './components/PropertyDetailPage'
import SellPropertyPage from './components/SellPropertyPage'

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
  const [userName, setUserName] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const name = session?.user?.user_metadata?.full_name
      if (name) setUserName(name)
    })
  }, [])

  const isAuth = !!userName

  const onNavigate = (page) => {
    navigate('/' + page)
  }

  const onLogin = (name) => {
    setUserName(name)
    const from = location.state?.from
    navigate(from || '/dashboard')
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        variants={pageTransition}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={transitionConfig}
      >
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<ExplorePage userName={userName} onNavigate={onNavigate} />} />
          <Route path="/explore" element={<ExplorePage userName={userName} onNavigate={onNavigate} />} />
          <Route path="/login" element={<MinimalistLogin onLogin={onLogin} />} />
          <Route path="/dashboard" element={
            <ProtectedRoute isAuth={isAuth} location={location}>
              <PersonalDashboard userName={userName} onNavigate={onNavigate} />
            </ProtectedRoute>
          } />
          <Route path="/saved" element={
            <ProtectedRoute isAuth={isAuth} location={location}>
              <SavedPropertiesPage onBack={() => navigate('/dashboard')} />
            </ProtectedRoute>
          } />
          <Route path="/sell" element={
            <ProtectedRoute isAuth={isAuth} location={location}>
              <SellPropertyPage />
            </ProtectedRoute>
          } />
          <Route path="/chat" element={<ChatHubPage onNavigate={onNavigate} />} />
          <Route path="/property/:id" element={<PropertyDetailPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}
