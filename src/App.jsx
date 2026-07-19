import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import MinimalistLogin from './components/MinimalistLogin'
import PersonalDashboard from './components/PersonalDashboard'
import SavedPropertiesPage from './components/SavedPropertiesPage'

const pageTransition = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
}

function App() {
  const [page, setPage] = useState('login')

  return (
    <AnimatePresence mode="wait">
      {page === 'login' && (
        <motion.div
          key="login"
          variants={pageTransition}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
          <MinimalistLogin onLogin={() => setPage('dashboard')} />
        </motion.div>
      )}
      {page === 'dashboard' && (
        <motion.div
          key="dashboard"
          variants={pageTransition}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
          <PersonalDashboard onNavigate={(p) => setPage(p)} />
        </motion.div>
      )}
      {page === 'saved' && (
        <SavedPropertiesPage onBack={() => setPage('dashboard')} />
      )}
    </AnimatePresence>
  )
}

export default App