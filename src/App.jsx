import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';

import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';

import HomePage from './views/HomePage';
import SearchPage from './views/SearchPage';
import VenueDetailPage from './views/VenueDetailPage';
import MyBookingsPage from './views/MyBookingsPage';
import LoginPage from './views/LoginPage';
import RegisterPage from './views/RegisterPage';

import OwnerDashboardPage from './views/OwnerDashboardPage';
import OwnerCalendarPage from './views/OwnerCalendarPage';
import AdminDashboardPage from './views/AdminDashboardPage';

import TournamentsPage from './views/TournamentsPage';
import TournamentDetailPage from './views/TournamentDetailPage';
import MatchDetailPage from './views/MatchDetailPage';
import CricketScorerPage from './views/CricketScorerPage';
import SignageDisplayPage from './views/SignageDisplayPage';
import TeamsPage from './views/TeamsPage';
import LiveAuctionPage from './views/LiveAuctionPage';
import LiveScoreViewerPage from './views/LiveScoreViewerPage';
import TeamJoinPage from './views/TeamJoinPage';

function TeamJoinRouteWrapper() {
  const { code } = useParams();
  return <TeamJoinPage code={code} />;
}

// Protected Route Wrapper for Owner/Admin
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, isAuthenticated } = useSelector((state) => state.auth);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && (!user || !allowedRoles.includes(user.role))) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function AppContent() {
  const location = useLocation();
  const isDisplayRoute = location.pathname.startsWith('/display') || (location.pathname.includes('/auction') && location.pathname.endsWith('/live'));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {!isDisplayRoute && <Navbar />}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/venue/:idOrSlug" element={<VenueDetailPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<LoginPage />} />
          <Route path="/reset-password" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Tournaments & Live Multi-Match Routes */}
          <Route path="/tournaments" element={<TournamentsPage />} />
          <Route path="/tournaments/:id" element={<TournamentDetailPage />} />
          <Route path="/tournaments/:id/live" element={<LiveScoreViewerPage />} />
          <Route path="/tournaments/:id/auction/live" element={<LiveAuctionPage />} />
          <Route path="/auctions/:auctionId/live" element={<LiveAuctionPage />} />
          <Route path="/matches/:id" element={<MatchDetailPage />} />
          <Route path="/matches/:id/live" element={<LiveScoreViewerPage />} />
          <Route path="/matches/:id/scorer" element={<CricketScorerPage />} />
          <Route path="/display/match/:id" element={<MatchDetailPage />} />
          <Route path="/display/tournament/:id" element={<SignageDisplayPage />} />
          <Route path="/teams" element={<TeamsPage />} />
          <Route path="/teams/join/:code" element={<TeamJoinRouteWrapper />} />

          {/* Authenticated Player Routes */}
          <Route
            path="/my-bookings"
            element={
              <ProtectedRoute>
                <MyBookingsPage />
              </ProtectedRoute>
            }
          />

          {/* Venue Owner Routes */}
          <Route
            path="/owner/dashboard"
            element={
              <ProtectedRoute allowedRoles={['VENUE_OWNER', 'ADMIN']}>
                <OwnerDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/owner/calendar"
            element={
              <ProtectedRoute allowedRoles={['VENUE_OWNER', 'ADMIN']}>
                <OwnerCalendarPage />
              </ProtectedRoute>
            }
          />

          {/* Super Admin Routes */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {!isDisplayRoute && <Footer />}
    </div>
  );
}

function App() {
  const { mode } = useSelector((state) => state.theme);

  // Sync data-theme attribute on the <html> element whenever mode changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', mode);
  }, [mode]);

  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
