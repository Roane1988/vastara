import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import MinimalistLogin from './components/MinimalistLogin'
import PersonalDashboard from './components/PersonalDashboard'
import SavedPropertiesPage from './components/SavedPropertiesPage'
import ExplorePage from './components/ExplorePage'
import ChatHubPage from './components/ChatHubPage'

const pageTransition = {
  initial: { opacity: 0, scale: 0.97, y: 8 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.97, y: -8 },
}

const transitionConfig = {
  duration: 0.4,
  ease: [0.22, 1, 0.36, 1],
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
          transition={transitionConfig}
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
          transition={transitionConfig}
        >
          <PersonalDashboard onNavigate={(p) => setPage(p)} />
        </motion.div>
      )}
      {page === 'saved' && (
        <motion.div
          key="saved"
          variants={pageTransition}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={transitionConfig}
        >
          <SavedPropertiesPage onBack={() => setPage('dashboard')} />
        </motion.div>
      )}
      {page === 'explore' && (
        <motion.div
          key="explore"
          variants={pageTransition}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={transitionConfig}
        >
          <ExplorePage onNavigate={(p) => setPage(p)} />
        </motion.div>
      )}
      {page === 'chat' && (
        <motion.div
          key="chat"
          variants={pageTransition}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={transitionConfig}
        >
          <ChatHubPage onNavigate={(p) => setPage(p)} />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default App