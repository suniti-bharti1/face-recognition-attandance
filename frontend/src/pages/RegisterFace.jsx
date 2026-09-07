import React, { useRef, useState, useEffect } from 'react';
import axios from 'axios';
import { Camera, UploadCloud, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API_URL = 'http://localhost:8000/api';

export default function RegisterFace() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({ name: '', roll_number: '', class_or_department: '' });
  const [capturedImage, setCapturedImage] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsCameraActive(true);
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'Camera access denied.' });
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    ctx.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
    
    // Convert to blob
    canvasRef.current.toBlob((blob) => {
      setCapturedImage(blob);
      stopCamera();
    }, 'image/jpeg', 0.9);
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    startCamera();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!capturedImage) {
      setStatus({ type: 'error', message: 'Please capture a photo first.' });
      return;
    }
    
    setLoading(true);
    setStatus({ type: '', message: '' });
    
    const data = new FormData();
    data.append('name', formData.name);
    data.append('roll_number', formData.roll_number);
    data.append('class_or_department', formData.class_or_department);
    data.append('image', capturedImage, 'face.jpg');

    try {
      await axios.post(`${API_URL}/people`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setStatus({ type: 'success', message: 'Face registered successfully!' });
      setTimeout(() => navigate('/people'), 2000);
    } catch (err) {
      setStatus({ 
        type: 'error', 
        message: err.response?.data?.detail || 'Failed to register face.' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="page-title">Register New Face</h1>
      
      <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
        {status.message && (
          <div style={{
            padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
            backgroundColor: status.type === 'success' ? '#d1fae5' : '#fee2e2',
            color: status.type === 'success' ? '#065f46' : '#991b1b'
          }}>
            {status.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            {status.message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input required type="text" className="form-input" placeholder="e.g. Himani" 
              value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
          </div>
          <div className="form-group">
            <label className="form-label">Roll Number / ID</label>
            <input type="text" className="form-input" placeholder="e.g. 240441"
              value={formData.roll_number} onChange={e => setFormData({...formData, roll_number: e.target.value})} />
          </div>

          <div className="form-group" style={{ marginTop: '2rem' }}>
            <label className="form-label">Face Photo *</label>
            
            <div style={{ 
              border: '2px dashed var(--border-color)', 
              borderRadius: 'var(--radius-lg)', 
              padding: '1rem',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem'
            }}>
              
              {!isCameraActive && !capturedImage && (
                <div style={{ padding: '2rem', textAlign: 'center' }}>
                  <button type="button" className="btn btn-primary" onClick={startCamera}>
                    <Camera size={20} /> Open Web Camera
                  </button>
                  <p style={{ marginTop: '1rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    Ensure the face is clearly visible and well-lit.
                  </p>
                </div>
              )}

              <div style={{ display: isCameraActive ? 'block' : 'none', width: '100%', maxWidth: '400px', borderRadius: '0.5rem', overflow: 'hidden' }}>
                <video ref={videoRef} style={{ width: '100%', display: 'block' }} muted playsInline />
                <button type="button" className="btn btn-primary" style={{ width: '100%', borderRadius: 0 }} onClick={capturePhoto}>
                  Capture Photo
                </button>
              </div>

              {capturedImage && (
                <div style={{ width: '100%', maxWidth: '400px', textAlign: 'center' }}>
                  <img src={URL.createObjectURL(capturedImage)} alt="Captured" style={{ width: '100%', borderRadius: '0.5rem' }} />
                  <button type="button" className="btn" style={{ marginTop: '1rem', backgroundColor: '#e2e8f0' }} onClick={retakePhoto}>
                    Retake Photo
                  </button>
                </div>
              )}
              
              <canvas ref={canvasRef} style={{ display: 'none' }} />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.75rem', marginTop: '1rem' }} disabled={loading}>
            {loading ? 'Registering...' : (
              <><UploadCloud size={20} /> Complete Registration</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
