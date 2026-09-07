import React, { useRef, useEffect, useState } from 'react';
import { Camera, AlertCircle, Clock, CheckCircle } from 'lucide-react';

export default function LiveAttendance() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const wsRef = useRef(null);
  const isProcessingRef = useRef(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  const [liveList, setLiveList] = useState([]);
  const [timeLeft, setTimeLeft] = useState(900); // 15 mins
  const [sessionFinished, setSessionFinished] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (isStreaming && !sessionFinished && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            finalizeSession();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [isStreaming, sessionFinished]);

  const finalizeSession = async () => {
    stopCamera();
    try {
      await fetch('http://localhost:8000/api/attendance/finalize', { method: 'POST' });
      setSessionFinished(true);
    } catch (err) {
      setError("Failed to finalize session.");
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480 } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsStreaming(true);
        connectWebSocket();
      }
    } catch (err) {
      setError("Camera access is required for live attendance. Please allow camera access in your browser.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
    }
    if (wsRef.current) {
      wsRef.current.close();
    }
    setIsStreaming(false);
  };

  const connectWebSocket = () => {
    wsRef.current = new WebSocket('ws://localhost:8000/ws/recognize');
    
    wsRef.current.onopen = () => {
      console.log('WS Connected');
      requestAnimationFrame(sendFrame);
    };

    wsRef.current.onmessage = (event) => {
      isProcessingRef.current = false;
      const data = JSON.parse(event.data);
      if (data.results) {
        drawBoxes(data.results);
        updateLiveList(data.results);
      }
      
      // Request next frame immediately after processing the result
      if (videoRef.current && videoRef.current.srcObject) {
        requestAnimationFrame(sendFrame);
      }
    };
    
    wsRef.current.onclose = () => {
      console.log('WS Disconnected');
    };
  };

  const sendFrame = () => {
    if (!videoRef.current || !videoRef.current.srcObject || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    if (isProcessingRef.current) return;
    
    isProcessingRef.current = true;
    
    // Scale down image to make base64 extremely small and fast over websocket
    const canvas = document.createElement('canvas');
    const scale = 1.0; // Send at full resolution (640x480) for better detection
    canvas.width = videoRef.current.videoWidth * scale;
    canvas.height = videoRef.current.videoHeight * scale;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    
    const base64Frame = canvas.toDataURL('image/jpeg', 0.8);
    wsRef.current.send(base64Frame);
  };

  const drawBoxes = (results) => {
    if (!canvasRef.current || !videoRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    
    results.forEach(res => {
      // Results from backend are now full scale (1.0)
      const [x1, y1, x2, y2] = res.box;
      
      const isPresent = res.status === 'PRESENT';
      ctx.strokeStyle = isPresent ? '#10b981' : '#ef4444'; // green or red
      ctx.lineWidth = 3;
      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
      
      // Draw label background
      ctx.fillStyle = isPresent ? '#10b981' : '#ef4444';
      ctx.fillRect(x1, y1 - 30, x2 - x1, 30);
      
      // Draw label text
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px Inter, sans-serif';
      ctx.fillText(res.name, x1 + 5, y1 - 10);
    });
  };

  const updateLiveList = (results) => {
    if (results.length === 0) return;
    
    setLiveList(prev => {
      const now = new Date().toLocaleTimeString();
      const newItems = results.map(r => ({
        name: r.name,
        roll_number: r.roll_number,
        status: r.status,
        time: now,
        id: Math.random().toString(36).substr(2, 9)
      }));
      
      // Keep only last 10 entries and avoid immediate duplicates
      const filtered = [...newItems, ...prev].filter((v,i,a)=>a.findIndex(t=>(t.name===v.name && t.status===v.status))===i);
      return filtered.slice(0, 8);
    });
  };

  return (
    <div>
      <h1 className="page-title">Live Attendance</h1>
      
      {error && (
        <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
        <div style={{ flex: '1' }}>
          {sessionFinished && (
            <div style={{ backgroundColor: '#d1fae5', color: '#065f46', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle size={20} />
              Session Complete! All remaining students have been marked absent.
            </div>
          )}
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Camera View</h2>
            {!sessionFinished && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.2rem', fontWeight: 'bold', color: timeLeft <= 60 ? '#ef4444' : 'var(--text-primary)' }}>
                <Clock size={20} />
                {formatTime(timeLeft)}
              </div>
            )}
          </div>
          
          <div className="card camera-container" style={{ padding: 0 }}>
            <video 
              ref={videoRef} 
              className="camera-video" 
              muted 
              playsInline
            />
            <canvas ref={canvasRef} className="camera-canvas" />
          </div>
          <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center' }}>
            {!sessionFinished && (
              <button className={`btn ${isStreaming ? 'btn-danger' : 'btn-primary'}`} onClick={isStreaming ? stopCamera : startCamera}>
                <Camera size={18} />
                {isStreaming ? 'Stop Camera' : 'Start Camera'}
              </button>
            )}
            {isStreaming && (
              <button className="btn btn-primary" onClick={finalizeSession} style={{ marginLeft: '1rem' }}>
                End Session Now
              </button>
            )}
          </div>
        </div>

        <div className="card" style={{ width: '350px' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Live Detection Log</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {liveList.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem 0' }}>No faces detected yet</p>
            ) : (
              liveList.map((item) => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', backgroundColor: 'var(--bg-color)', borderRadius: '0.5rem' }}>
                  <div style={{ fontWeight: 500 }}>{item.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className={`badge ${item.status === 'PRESENT' ? 'badge-success' : 'badge-danger'}`}>
                      {item.status}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{item.time}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
