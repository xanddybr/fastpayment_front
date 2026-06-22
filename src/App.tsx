import { useEffect, type ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import PublicFlow from './components/public/PublicFlow';
import LoginPage from './pages/LoginPage';
import AdminLayout from './components/admin/AdminLayout';
import OtpForm from './components/public/OtpForm';

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { adminName } = useAuth();
  if (!adminName) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const location = useLocation();

  // Reiki watermark only shows behind the public schedule flow, not on /login or /admin.
  useEffect(() => {
    const isAdminArea = location.pathname.startsWith('/login') || location.pathname.startsWith('/admin');
    document.body.classList.toggle('bg-reiki', !isAdminArea);
  }, [location.pathname]);

  return (
    <Routes>
      <Route path="/" element={<PublicFlow />} />
      <Route
        path="/__preview-otp"
        element={
          <main className="w-full max-w-6xl mx-auto p-4 md:p-8 min-h-screen flex items-center">
            <OtpForm
              schedule={{
                id: 1,
                schedule_id: 1,
                event_id: 1,
                event_name: 'Baralho Cigano',
                event_price: 50,
                type_name: 'Curso',
                event_type_id: 1,
                unit_name: 'Curicica',
                unit_id: 1,
                scheduled_at: '2026-07-01 00:30:00',
                duration_minutes: 60,
                vacancies: 5,
              }}
              name="Maria Silva"
              phone="(21) 99999-9999"
              email="maria@example.com"
              onVerified={() => {}}
            />
          </main>
        }
      />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
