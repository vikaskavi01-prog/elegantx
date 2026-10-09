// ELEGANTX - Advanced AI Dashboard Logic

let recognition = null;
let isRecording = false;

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    initSpeechRecognition();
    loadHistory();
    
    // Tab logic
    document.querySelectorAll('.nav-menu a').forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('.nav-menu a').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const view = tab.getAttribute('data-view');
            addChatMessage('system', `[SYS] Switching view to: ${view.toUpperCase()}`);
        });
    });
});

function authenticate() {
    const passcode = document.getElementById('passcode').value;
    if (passcode === 'Stormbreakers') {
        document.getElementById('auth-overlay').style.display = 'none';
        document.getElementById('app').style.display = 'flex';
        document.getElementById('chatInput').focus();
    } else {
        alert("ACCESS DENIED: Invalid Proof ID");
    }
}

function changeMethod() {
    const method = document.getElementById('methodSelect').value;
    const display = document.getElementById('currentModeDisplay');
    display.innerText = method.toUpperCase().replace('_', ' ');
    addChatMessage('system', `[SYS] Mode switched to: ${display.innerText}`);
}

function addChatMessage(sender, msg) {
    const chatLog = document.getElementById('chatLog');
    const msgDiv = document.createElement('div');
    msgDiv.className = `msg ${sender === 'user' ? 'user-msg' : 'ai-msg'}`;
    msgDiv.innerText = msg;
    chatLog.appendChild(msgDiv);
    
    // Fix auto-scroll
    const workspace = document.getElementById('workspaceArea');
    workspace.scrollTop = workspace.scrollHeight;

    // Save to local history
    if (sender === 'user') {
        saveToHistory(msg);
    }
}

function setCoreStatus(status, isActive = false) {
    document.getElementById('coreStatus').innerText = status;
    const ring = document.querySelector('.core-ring');
    const waveform = document.getElementById('waveform');

    if (isActive) {
        ring.style.borderColor = '#00f0ff';
        ring.style.animationDuration = '2s';
        waveform.classList.add('active');
        animateWaveform();
    } else {
        ring.style.borderColor = 'rgba(0, 240, 255, 0.5)';
        ring.style.animationDuration = '10s';
        waveform.classList.remove('active');
    }
}

let waveInterval;

function animateWaveform() {
    clearInterval(waveInterval);
    const bars = document.querySelectorAll('.waveform .bar');
    waveInterval = setInterval(() => {
        bars.forEach(bar => {
            bar.style.height = `${Math.random() * 20 + 4}px`;
        });
    }, 100);
}
setInterval(() => {
    if (!document.getElementById('waveform').classList.contains('active')) {
        clearInterval(waveInterval);
        document.querySelectorAll('.waveform .bar').forEach(b => b.style.height = '4px');
    }
}, 500);


async function handleCommand(cmd) {
    if (cmd === '/wipe') {
        wipeData();
        return;
    }

    setCoreStatus('THINKING...', true);

    try {
        const response = await fetch(`http://127.0.0.1:8000/api/chat?message=${encodeURIComponent(cmd)}`, {
            method: 'POST',
            headers: {
                'x-proof-id': 'Stormbreakers'
            }
        });
        if (!response.ok) throw new Error("Backend offline");

        const data = await response.json();
        setCoreStatus('SPEAKING...', true);
        addChatMessage('ai', data.response);
        speakText(data.response); // Text-to-speech output

    } catch (error) {
        addChatMessage('system', `[SYS ERROR]: ${error.message}. Ensure Python backend is running.`);
    }

    setTimeout(() => setCoreStatus('IDLE', false), 2000);
}

function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const msg = input.value.trim();
    if (msg) {
        addChatMessage('user', msg);
        handleCommand(msg);
        input.value = '';
    }
}

// Offline RAG Document Upload
async function uploadDocument() {
    const fileInput = document.getElementById('docUpload');
    if (!fileInput.files.length) return;

    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append("file", file);

    addChatMessage('system', `[SYS] Ingesting ${file.name} to local RAG store...`);
    setCoreStatus('INDEXING...', true);

    try {
        const response = await fetch('http://127.0.0.1:8000/api/upload', {
            method: 'POST',
            headers: {
                'x-proof-id': 'Stormbreakers'
            },
            body: formData
        });
        const data = await response.json();
        addChatMessage('system', `[SYS] ${data.status}`);

        // Update tech panel
        const countSpan = document.getElementById('docCount');
        countSpan.innerText = parseInt(countSpan.innerText) + 1;

    } catch (err) {
        addChatMessage('system', `[SYS ERROR] Document upload failed.`);
    }
    fileInput.value = '';
    setCoreStatus('IDLE', false);
}

async function wipeData() {
    try {
        await fetch('http://127.0.0.1:8000/api/wipe', {
            method: 'POST'
        });
    } catch (e) {}
    localStorage.removeItem('elegantx_history');
    document.getElementById('historyList').innerHTML = '';
    document.getElementById('workspaceArea').innerHTML = "<h2 style='color:#ff0055; text-align:center; margin-top:20%'>[ MEMORY PURGED ]</h2>";
}

// Voice Assistant (Web Speech API)
function initSpeechRecognition() {
    if ('webkitSpeechRecognition' in window) {
        recognition = new webkitSpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = function() {
            isRecording = true;
            document.getElementById('micBtn').classList.add('recording');
            document.getElementById('micStatusText').innerText = "Listening...";
            document.getElementById('micStatusText').className = "cyan-text";
            setCoreStatus('LISTENING...', true);
        };

        recognition.onresult = function(event) {
            const transcript = event.results[0][0].transcript;
            document.getElementById('chatInput').value = transcript;
            sendChatMessage();
        };

        recognition.onerror = function(event) {
            addChatMessage('system', `[SYS] Microphone error: ${event.error}`);
            stopRecording();
        };

        recognition.onend = function() {
            stopRecording();
        };

        document.getElementById('micBtn').addEventListener('click', () => {
            if (isRecording) {
                recognition.stop();
            } else {
                recognition.start();
            }
        });
    } else {
        document.getElementById('micBtn').title = "Voice Input not supported in this browser";
        document.getElementById('micBtn').style.opacity = "0.5";
    }
}

function stopRecording() {
    isRecording = false;
    document.getElementById('micBtn').classList.remove('recording');
    document.getElementById('micStatusText').innerText = "Inactive";
    document.getElementById('micStatusText').className = "";
    setCoreStatus('IDLE', false);
}

// Text to Speech
function speakText(text) {
    if ('speechSynthesis' in window && document.getElementById('methodSelect').value === 'voice') {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.1;
        utterance.pitch = 0.9;

        utterance.onend = () => {
            setCoreStatus('IDLE', false);
        };
        window.speechSynthesis.speak(utterance);
    }
}

// Local History Management
function saveToHistory(msg) {
    let history = JSON.parse(localStorage.getItem('elegantx_history') || '[]');
    const title = msg.length > 25 ? msg.substring(0, 25) + '...' : msg;
    history.unshift(title);
    if (history.length > 15) history.pop();
    localStorage.setItem('elegantx_history', JSON.stringify(history));
    renderHistory();
}

function renderHistory() {
    const list = document.getElementById('historyList');
    const history = JSON.parse(localStorage.getItem('elegantx_history') || '[]');
    list.innerHTML = '';
    history.forEach(item => {
        const li = document.createElement('li');
        li.innerText = `> ${item}`;
        li.onclick = () => {
            document.getElementById('chatInput').value = item;
        };
        list.appendChild(li);
    });
}

function loadHistory() {
    renderHistory();
}