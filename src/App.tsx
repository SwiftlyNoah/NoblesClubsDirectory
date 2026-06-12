import { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthProvider';
import { TopBar } from './components/TopBar';
import { Spinner } from './components/Spinner';
import { HomePage } from './pages/HomePage';
import { MyClubsPage } from './pages/MyClubsPage';
import { AdminPage } from './pages/AdminPage';

// FullCalendar is heavy — keep it out of the initial bundle.
const CalendarPage = lazy(() =>
  import('./pages/CalendarPage').then((module) => ({ default: module.CalendarPage }))
);

function Layout() {
  return (
    <>
      <TopBar />
      <Outlet />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename="/clubs">
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/club/:clubId" element={<HomePage />} />
            <Route path="/my-clubs" element={<MyClubsPage />} />
            <Route
              path="/calendar"
              element={
                <Suspense fallback={<Spinner label="Loading calendar…" />}>
                  <CalendarPage />
                </Suspense>
              }
            />
            <Route path="/admin" element={<AdminPage />} />
            {/* Old Vue-site paths */}
            <Route path="/home" element={<Navigate to="/" replace />} />
            <Route path="/myclubs" element={<Navigate to="/my-clubs" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
