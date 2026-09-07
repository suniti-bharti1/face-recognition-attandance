import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, UserCheck, UserX, UserMinus } from 'lucide-react';

const API_URL = 'http://localhost:8000/api';

export default function Dashboard() {
  const [stats, setStats] = useState({
    total_people: 0,
    present_today: 0,
    absent_today: 0,
    unknown: 0
  });

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API_URL}/dashboard/stats`);
      setStats(res.data);
    } catch (err) {
      console.error("Error fetching stats", err);
    }
  };

  const percentage = stats.total_people > 0 
    ? Math.round((stats.present_today / stats.total_people) * 100) 
    : 0;

  return (
    <div>
      <h1 className="page-title">Dashboard</h1>
      
      <div className="stats-grid">
        <div className="card stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#eff6ff', color: 'var(--accent-color)' }}>
            <Users size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">TOTAL PEOPLE</span>
            <span className="stat-value">{stats.total_people}</span>
          </div>
        </div>

        <div className="card stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#d1fae5', color: 'var(--success)' }}>
            <UserCheck size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">PRESENT TODAY</span>
            <span className="stat-value">{stats.present_today}</span>
          </div>
        </div>

        <div className="card stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#fef3c7', color: '#d97706' }}>
            <UserMinus size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">ABSENT TODAY</span>
            <span className="stat-value">{stats.absent_today}</span>
          </div>
        </div>

        <div className="card stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#fee2e2', color: 'var(--danger)' }}>
            <UserX size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">ATTENDANCE</span>
            <span className="stat-value">{percentage}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
