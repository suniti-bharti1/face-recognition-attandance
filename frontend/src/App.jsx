import React from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { LayoutDashboard, Video, Users, UserPlus, History, Settings } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import LiveAttendance from './pages/LiveAttendance';
import People from './pages/People';
import RegisterFace from './pages/RegisterFace';
import AttendanceHistory from './pages/AttendanceHistory';

function App() {
  return (
    <Router>
      <div className="app-container">
        {/* Sidebar */}
        <div className="sidebar">
          <div className="sidebar-logo">
            <Video size={28} color="var(--accent-color)" />
            <span>AI Attendance</span>
          </div>
          
          <div className="nav-links">
            <NavLink to="/" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
              <LayoutDashboard size={20} />
              Dashboard
            </NavLink>
            <NavLink to="/live" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
              <Video size={20} />
              Live Attendance
            </NavLink>
            <NavLink to="/people" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
              <Users size={20} />
              People
            </NavLink>
            <NavLink to="/register" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
              <UserPlus size={20} />
              Register Face
            </NavLink>
            <NavLink to="/history" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
              <History size={20} />
              History
            </NavLink>
          </div>
        </div>

        {/* Main Content */}
        <div className="main-content">
          <div className="topbar">
            <div style={{ fontWeight: 500 }}>System Status: <span style={{color: 'var(--success)'}}>Online</span></div>
            <div>Admin User</div>
          </div>
          
          <div className="page-content">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/live" element={<LiveAttendance />} />
              <Route path="/people" element={<People />} />
              <Route path="/register" element={<RegisterFace />} />
              <Route path="/history" element={<AttendanceHistory />} />
            </Routes>
          </div>
        </div>
      </div>
    </Router>
  );
}

export default App;
