class AttendanceSystem {
    constructor() {
        this.video = document.getElementById('video');
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.statusOverlay = document.getElementById('status-overlay');
        this.statusMessage = document.getElementById('status-message');
        this.studentName = document.getElementById('student-name');
        
        this.startBtn = document.getElementById('startBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.refreshBtn = document.getElementById('refreshBtn');
        this.attendanceBody = document.getElementById('attendanceBody');
        
        this.isRunning = false;
        
        this.init();
    }
    
    init() {
        this.startBtn.addEventListener('click', () => this.startCamera());
        this.stopBtn.addEventListener('click', () => this.stopCamera());
        this.refreshBtn.addEventListener('click', () => this.refreshAttendance());
        
        // Load initial attendance
        this.refreshAttendance();
        
        // Periodically refresh attendance
        setInterval(() => this.refreshAttendance(), 5000);
    }
    
    async startCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { width: 640, height: 480, facingMode: 'user' } 
            });
            this.video.srcObject = stream;
            
            // Start backend camera
            await fetch('/start_camera', { method: 'POST' });
            
            this.startBtn.disabled = true;
            this.stopBtn.disabled = false;
            this.statusOverlay.classList.remove('hidden');
            this.statusMessage.textContent = '🔍 Looking for students...';
            this.studentName.textContent = '';
            
            this.isRunning = true;
            
            // 🔥 THIS IS IMPORTANT (status updater)
            this.statusInterval = setInterval(() => {
                if (this.isRunning) {
                    this.updateStatus();
                }
            }, 1000);
            
        } catch (err) {
            console.error('Camera access denied:', err);
            this.showStatus('❌ Camera access denied. Please allow camera access.', 'error');
        }
    }
    
    stopCamera() {
        if (this.video.srcObject) {
            this.video.srcObject.getTracks().forEach(track => track.stop());
        }
        
        fetch('/stop_camera', { method: 'POST' });
        
        this.startBtn.disabled = false;
        this.stopBtn.disabled = true;
        this.statusOverlay.classList.add('hidden');
        this.isRunning = false;
        
        if (this.statusInterval) {
            clearInterval(this.statusInterval);
        }
    }
    
    // 🔥 UPDATED FUNCTION (MAIN FIX)
    async updateStatus() {
        try {
            const response = await fetch('/get_status');
            const data = await response.json();

            // Update message
            if (data.status) {
                this.statusMessage.textContent = data.status;
            }

            // Update name
            if (data.name) {
                this.studentName.textContent = data.name;
                this.studentName.className = 'student-name identified';
            } else {
                this.studentName.textContent = '';
                this.studentName.className = 'student-name';
            }

        } catch (err) {
            console.error('Status error:', err);
        }
    }
    
    showStatus(message, type = 'info') {
        this.statusMessage.textContent = message;
        this.statusOverlay.classList.remove('hidden');
        
        this.studentName.textContent = '';
        this.studentName.className = 'student-name';
        
        if (type === 'success') {
            this.studentName.classList.add('identified');
        } else if (type === 'error') {
            this.studentName.classList.add('not-identified');
        }
    }
    
    async refreshAttendance() {
        try {
            const response = await fetch('/get_attendance');
            const data = await response.json();
            
            this.updateAttendanceTable(data);
        } catch (err) {
            console.error('Error fetching attendance:', err);
        }
    }
    
    updateAttendanceTable(records) {
        if (!records || records.length === 0) {
            this.attendanceBody.innerHTML = `
                <tr>
                    <td colspan="3" class="no-data">No attendance records yet. Start the camera!</td>
                </tr>
            `;
            return;
        }
        
        this.attendanceBody.innerHTML = records.map(record => `
            <tr>
                <td><strong>${record.name}</strong></td>
                <td>${record.time}</td>
                <td><i class="fas fa-check-circle" style="color: #4CAF50;"></i> Present</td>
            </tr>
        `).join('');
    }
}

// Initialize system
document.addEventListener('DOMContentLoaded', () => {
    window.attendanceSystem = new AttendanceSystem();
});

// Handle tab switch
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        const system = window.attendanceSystem;
        if (system && system.isRunning) {
            system.stopCamera();
        }
    }
});

// Global error handler
window.addEventListener('error', (e) => {
    console.error('Global error:', e.error);
    const system = window.attendanceSystem;
    if (system) {
        system.showStatus('⚠️ System error occurred', 'error');
    }
});