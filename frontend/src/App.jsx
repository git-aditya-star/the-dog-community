import { Navigate, Route, Routes } from 'react-router-dom'

import Shell from './components/Shell'
import Auth from './pages/Auth'
import { RequireAuth } from './auth'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Auth />} />
      <Route
        path="/c/:slug"
        element={
          <RequireAuth>
            <Shell />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/c/general" replace />} />
    </Routes>
  )
}
