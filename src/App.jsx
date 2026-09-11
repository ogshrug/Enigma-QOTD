import { Routes, Route, useLocation } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import DevStatus from './components/DevStatus'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Protected from './components/Protected'
import AdminOnly from './components/AdminOnly'
import Login from './pages/Login'
import RoleSelect from './pages/RoleSelect'
import PlayerHome from './pages/PlayerHome'
import Archive from './pages/Archive'
import History from './pages/History'
import Leaderboard from './pages/Leaderboard'
import Profile from './pages/Profile'
import AdminDashboard from './pages/AdminDashboard'
import NewQuestion from './pages/NewQuestion'
import GradeAnswers from './pages/GradeAnswers'

function Shell() {
  const location = useLocation()
  const isLanding = location.pathname === '/login' || location.pathname === '/role'
  return (
    <div className="app-shell">
      <Navbar />
      <main className={`container${isLanding ? ' container--wide' : ''}`}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/role" element={<RoleSelect />} />
          <Route element={<Protected />}>
            <Route path="/" element={<PlayerHome />} />
            <Route path="/archive" element={<Archive />} />
            <Route path="/history" element={<History />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route element={<AdminOnly />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/new" element={<NewQuestion />} />
              <Route path="/admin/grade" element={<GradeAnswers />} />
            </Route>
          </Route>
        </Routes>
      </main>
      <Footer />
      <DevStatus />
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  )
}