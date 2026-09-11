import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import DevStatus from './components/DevStatus'
import Navbar from './components/Navbar'
import Protected from './components/Protected'
import AdminOnly from './components/AdminOnly'
import Login from './pages/Login'
import RoleSelect from './pages/RoleSelect'
import PlayerHome from './pages/PlayerHome'
import History from './pages/History'
import Leaderboard from './pages/Leaderboard'
import AdminDashboard from './pages/AdminDashboard'
import NewQuestion from './pages/NewQuestion'
import GradeAnswers from './pages/GradeAnswers'

export default function App() {
  return (
    <AuthProvider>
      <Navbar />
      <main className="container">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/role" element={<RoleSelect />} />
          <Route element={<Protected />}>
            <Route path="/" element={<PlayerHome />} />
            <Route path="/history" element={<History />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route element={<AdminOnly />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/new" element={<NewQuestion />} />
              <Route path="/admin/grade" element={<GradeAnswers />} />
            </Route>
          </Route>
        </Routes>
      </main>
      <DevStatus />
    </AuthProvider>
  )
}