import { useState } from 'react'
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
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

function AppContent() {
  const navigate = useNavigate()
  const location = useLocation()
  const [userName, setUserName] = useState('')

  const onNavigate = (page) => {
    navigate('/' + page)
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
          <Route path="/login" element={<MinimalistLogin onLogin={(name) => { setUserName(name); navigate('/dashboard') }} />} />
          <Route path="/dashboard" element={<PersonalDashboard userName={userName} onNavigate={onNavigate} />} />
          <Route path="/saved" element={<SavedPropertiesPage onBack={() => navigate('/dashboard')} />} />
          <Route path="/explore" element={<ExplorePage userName={userName} onNavigate={onNavigate} />} />
          <Route path="/chat" element={<ChatHubPage onNavigate={onNavigate} />} />
          <Route path="/property/:id" element={<PropertyDetailPage />} />
          <Route path="/sell" element={<SellPropertyPage />} />
          <Route path="*" element={<Navigate to="/login" />} />
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
