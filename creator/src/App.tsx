import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { CreatorLayout } from './layouts/CreatorLayout'
import { AccountPage } from './pages/AccountPage'
import { AssetLibraryPage } from './pages/AssetLibraryPage'
import { BrandPage } from './pages/BrandPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { LoginPage } from './pages/LoginPage'
import { PlaygroundPage } from './pages/PlaygroundPage'
import { ProjectDetailPage } from './pages/ProjectDetailPage'
import { ProjectsPage } from './pages/ProjectsPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'

export default function App() {
  return (
    <BrowserRouter basename="/creator">
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<CreatorLayout />}>
              <Route index element={<ProjectsPage />} />
              <Route path="playground" element={<PlaygroundPage />} />
              <Route path="projects/:id" element={<ProjectDetailPage />} />
              <Route path="assets" element={<AssetLibraryPage />} />
              <Route path="brand" element={<BrandPage />} />
              <Route path="account" element={<AccountPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
