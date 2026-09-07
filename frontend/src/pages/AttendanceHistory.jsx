import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar } from 'lucide-react';

const API_URL = 'http://localhost:8000/api';

export default function AttendanceHistory() {
  const [history, setHistory] = useState([]);
  const [filterDate, setFilterDate] = useState('');

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await axios.get(`${API_URL}/attendance/history`);
      setHistory(res.data);
    } catch (err) {
      console.error("Error fetching history", err);
    }
  };

  const filteredHistory = filterDate 
    ? history.filter(h => h.date === filterDate)
    : history;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Attendance History</h1>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Calendar size={20} color="var(--text-secondary)" />
          <input 
            type="date" 
            className="form-input" 
            style={{ width: 'auto' }}
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
          />
          {filterDate && (
            <button className="btn" style={{ backgroundColor: '#e2e8f0' }} onClick={() => setFilterDate('')}>
              Clear
            </button>
          )}
        </div>
      </div>
      
      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Time</th>
                <th>Name</th>
                <th>Roll Number</th>
                <th>Status</th>
                <th>Confidence</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.map(record => (
                <tr key={record.id}>
                  <td>{record.date}</td>
                  <td>{record.time}</td>
                  <td style={{ fontWeight: 500 }}>{record.person_name}</td>
                  <td>{record.roll_number || '-'}</td>
                  <td>
                    <span className={`badge ${record.status === 'Present' ? 'badge-success' : 'badge-danger'}`}>
                      {record.status}
                    </span>
                  </td>
                  <td>{record.confidence ? `${Math.round(record.confidence)}%` : '-'}</td>
                </tr>
              ))}
              {filteredHistory.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                    No attendance records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
