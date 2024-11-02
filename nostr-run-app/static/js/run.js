let activeRun = null;
let timer = null;
let seconds = 0;
let startTime = null;

const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const stopBtn = document.getElementById('stopBtn');
const timerDisplay = document.getElementById('timer');
const distanceDisplay = document.getElementById('distance');

function formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function updateTimer() {
    seconds++;
    timerDisplay.textContent = formatTime(seconds);
}

async function startRun() {
    const response = await fetch('/api/run/start', {
        method: 'POST'
    });
    const data = await response.json();
    activeRun = data.run_id;
    
    startTime = new Date();
    timer = setInterval(updateTimer, 1000);
    
    startBtn.disabled = true;
    pauseBtn.disabled = false;
    stopBtn.disabled = false;
}

async function pauseRun() {
    if (timer) {
        clearInterval(timer);
        timer = null;
        await updateRunStatus('paused');
        
        startBtn.disabled = false;
        pauseBtn.disabled = true;
    } else {
        timer = setInterval(updateTimer, 1000);
        await updateRunStatus('active');
        
        startBtn.disabled = true;
        pauseBtn.disabled = false;
    }
}

async function stopRun() {
    if (timer) {
        clearInterval(timer);
    }
    
    await updateRunStatus('completed', true);
    
    seconds = 0;
    timerDisplay.textContent = formatTime(0);
    distanceDisplay.textContent = '0.00';
    activeRun = null;
    
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    stopBtn.disabled = true;
    
    loadRunHistory();
}

async function updateRunStatus(status, isComplete = false) {
    const data = {
        status: status,
        distance: parseFloat(distanceDisplay.textContent)
    };
    
    if (isComplete) {
        data.end_time = new Date().toISOString();
    }
    
    await fetch(`/api/run/${activeRun}/update`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });
}

async function loadRunHistory() {
    const response = await fetch('/api/runs');
    const runs = await response.json();
    
    const historyContainer = document.getElementById('runHistory');
    historyContainer.innerHTML = '';
    
    runs.forEach(run => {
        const duration = run.duration ? formatTime(run.duration) : '--:--:--';
        const distance = run.distance ? run.distance.toFixed(2) : '0.00';
        
        const item = document.createElement('div');
        item.className = 'list-group-item';
        item.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <h6 class="mb-0">${new Date(run.start_time).toLocaleDateString()}</h6>
                    <small class="text-muted">${duration}</small>
                </div>
                <div>${distance} km</div>
            </div>
        `;
        historyContainer.appendChild(item);
    });
}

startBtn.addEventListener('click', startRun);
pauseBtn.addEventListener('click', pauseRun);
stopBtn.addEventListener('click', stopRun);

// Load run history on page load
loadRunHistory();

// Simulate distance updates (in a real app, this would use GPS)
setInterval(() => {
    if (timer) {
        const current = parseFloat(distanceDisplay.textContent);
        distanceDisplay.textContent = (current + 0.01).toFixed(2);
    }
}, 5000);
