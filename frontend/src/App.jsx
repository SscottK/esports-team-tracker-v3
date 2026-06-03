import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import { AuthProvider } from './context/AuthContext';
import { NavProvider } from './context/NavContext';
import AppNavBar from './components/AppNavBar';
import ProtectedRoute from './components/ProtectedRoute';
import Landing from './pages/Landing';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import Dashboard from './pages/Dashboard';
import JoinOrganization from './pages/JoinOrganization';
import SuggestGame from './pages/SuggestGame';
import OrgDetail from './pages/OrgDetail';
import OrgLeaderTools from './pages/OrgLeaderTools';
import TeamDetail from './pages/TeamDetail';
import TeamCoachTools from './pages/TeamCoachTools';
import TimesGrid from './pages/TimesGrid';
import AddTime from './pages/AddTime';
import AddTimeMenu from './pages/AddTimeMenu';
import RequestsInbox from './pages/RequestsInbox';
import SetBenchmarks from './pages/SetBenchmarks';
import CompareTimes from './pages/CompareTimes';
import TimeHistory from './pages/TimeHistory';
import UploadTimes from './pages/UploadTimes';
import ManageGameSuggestions from './pages/ManageGameSuggestions';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <NavProvider>
        <BrowserRouter>
          <AppNavBar />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/join-organization" element={<JoinOrganization />} />
              <Route path="/suggest-game" element={<SuggestGame />} />
              <Route path="/organizations/:orgId" element={<OrgDetail />} />
              <Route path="/organizations/:orgId/leader" element={<OrgLeaderTools />} />
              <Route path="/requests" element={<RequestsInbox />} />
              <Route path="/add-time" element={<AddTimeMenu />} />
              <Route path="/teams/:teamId" element={<TeamDetail />} />
              <Route path="/teams/:teamId/coach" element={<TeamCoachTools />} />
              <Route path="/teams/:teamId/games/:gameId" element={<TimesGrid />} />
              <Route path="/teams/:teamId/games/:gameId/compare" element={<CompareTimes />} />
              <Route path="/teams/:teamId/add-time" element={<AddTime />} />
              <Route path="/teams/:teamId/upload-times" element={<UploadTimes />} />
              <Route path="/teams/:teamId/time-history" element={<TimeHistory />} />
              <Route path="/teams/:teamId/benchmarks" element={<SetBenchmarks />} />
              <Route path="/admin/game-suggestions" element={<ManageGameSuggestions />} />
            </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      </NavProvider>
    </AuthProvider>
  );
}

export default App;
