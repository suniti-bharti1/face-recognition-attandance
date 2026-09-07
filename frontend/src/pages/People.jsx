import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Trash2 } from 'lucide-react';

const API_URL = 'http://localhost:8000/api';

export default function People() {
  const [people, setPeople] = useState([]);

  useEffect(() => {
    fetchPeople();
  }, []);

  const fetchPeople = async () => {
    try {
      const res = await axios.get(`${API_URL}/people`);
      setPeople(res.data);
    } catch (err) {
      console.error("Error fetching people", err);
    }
  };

  const handleDelete = async (id) => {
    if(window.confirm("Are you sure you want to delete this person?")) {
      try {
        await axios.delete(`${API_URL}/people/${id}`);
        fetchPeople();
      } catch (err) {
        console.error("Error deleting", err);
      }
    }
  };

  return (
    <div>
      <h1 className="page-title">Registered People</h1>
      
      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Roll Number</th>
                <th>Department</th>
                <th>Registered On</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {people.map(person => (
                <tr key={person.id}>
                  <td>{person.id}</td>
                  <td style={{ fontWeight: 500 }}>{person.name}</td>
                  <td>{person.roll_number || '-'}</td>
                  <td>{person.class_or_department || '-'}</td>
                  <td>{new Date(person.created_at).toLocaleDateString()}</td>
                  <td>
                    <button onClick={() => handleDelete(person.id)} className="btn btn-danger" style={{ padding: '0.25rem 0.5rem' }}>
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {people.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                    No registered people found.
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
