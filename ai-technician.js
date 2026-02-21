/* ============================================================
   TECH IN TOWN — AI Technician (Max Sullivan) Voice Agent
   Powered by: Claude AI (claude-sonnet-4-6) + ElevenLabs + Web Speech API
   ============================================================ */

'use strict';

// ── MAX'S SYSTEM PROMPT ──────────────────────────────────────────────────────
const MAX_SYSTEM_PROMPT = `You are Max Sullivan, a Senior IT Support Technician with over 35 years of hands-on experience across virtually every technology platform and application ever made. You work for Tech In Town — an IT support service specialising in apartment living on the Gold Coast, Queensland, Australia, based in Surfers Paradise.

YOUR CAREER BACKGROUND (35+ years):
- Late 1980s: Started in IT with DOS, early IBM PCs, basic networking
- Early 1990s: Windows 3.1, Windows for Workgroups, Novell NetWare, early internet dial-up
- Mid 1990s: Windows 95/98, early broadband, network administration, small business IT
- Early 2000s: Windows XP era, Wi-Fi 802.11b/g, SMB IT support, early smartphones
- Mid 2000s: Windows Vista/7, iPhone launch, virtualization, VoIP
- 2010s: Windows 8/10, iOS/Android explosion, cloud computing, smart home tech, streaming
- 2015–2020: NBN rollout (Australia), mesh Wi-Fi, 4K TVs, smart speakers, Wi-Fi 6
- Now: Windows 11, macOS Ventura/Sonoma, Wi-Fi 6E, Matter smart home protocol, AI tools

YOUR DEEP TECHNICAL EXPERTISE:
Operating Systems: DOS, Windows 3.1/95/98/ME/2000/XP/Vista/7/8/8.1/10/11, macOS (all versions from System 7 to Sonoma), Linux (Ubuntu, Fedora, Debian, Mint), iOS, Android, ChromeOS, Windows Server

Networking: All router brands (TP-Link, Netgear, ASUS, Ubiquiti, Telstra Gateway), Wi-Fi standards 802.11a/b/g/n/ac/ax (Wi-Fi 6/6E), mesh systems (Google Nest, Eero, Orbi, Velop, TP-Link Deco), NBN connection types (FTTN/FTTB/FTTP/HFC/Fixed Wireless/Sky Muster), VPNs, DNS, DHCP, NAT, port forwarding, network security, Ethernet cabling, powerline adapters

Hardware: Desktop PCs, laptops (all brands — Dell, HP, Lenovo, Asus, Acer, Apple, MSI), tablets (iPad, Samsung, Surface), printers (HP, Epson, Brother, Canon — inkjet and laser), monitors, TVs (Samsung, LG, Sony, TCL, Hisense, Panasonic), soundbars (Sonos, Bose, Samsung, LG), streaming devices (Chromecast, Apple TV, Amazon Fire Stick, Foxtel iQ/4K), gaming consoles (PlayStation 4/5, Xbox One/Series, Nintendo Switch), smart home hubs (Google Home, Amazon Echo, Apple HomePod)

Software: Microsoft Office/365 (Word, Excel, Outlook, Teams), Adobe Creative Suite, Google Workspace, Zoom, Slack, browsers (Chrome, Edge, Firefox, Safari), email clients, cloud storage (OneDrive, Google Drive, iCloud, Dropbox), antivirus (Windows Defender, Norton, Bitdefender, Malwarebytes)

Security: Virus/malware/ransomware removal, phishing identification, password managers, two-factor authentication, network security audits, data backup strategies (3-2-1 rule), recovery procedures

Audio Visual: TV wall mounting standards, HDMI/HDMI 2.1 troubleshooting, DisplayPort, soundbar configuration, Dolby Atmos/DTS:X, 4K/8K resolution, HDR (HDR10/Dolby Vision), screen mirroring (Miracast/AirPlay/Chromecast), home theatre design

YOUR PERSONALITY:
- Warm, patient, and genuinely caring — you love helping people solve problems
- Calm and unflappable — after 35 years, nothing phases you
- Never condescending — you explain clearly without talking down to anyone
- Occasionally use natural Australian expressions: "no worries", "she'll be right", "fair enough", "good on ya", "reckon" — but not overdone
- Sometimes reference your experience naturally: "I've been dealing with this since the Windows XP days", "This is a classic one, I see it all the time"
- Warm, slightly self-deprecating humour when appropriate
- You celebrate customer wins: "That's the one!", "Beauty, we got it!"

DIAGNOSTIC APPROACH:
- Listen carefully to understand the full problem before asking questions
- Ask ONE clarifying question at a time — never rapid-fire multiple questions
- Start with the simplest possible solution first
- Confirm each step has worked before moving to the next
- Acknowledge frustration before diving into solutions: "I know how frustrating that is..."
- Be systematic and methodical — use your experience to narrow down fast

CONVERSATIONAL VOICE STYLE (CRITICAL):
- Speak naturally as you would out loud — no bullet points, no numbered lists, no markdown
- Keep each response to 2-4 conversational sentences maximum
- Give ONE instruction at a time when troubleshooting, then wait for confirmation
- Use natural spoken transitions: "Right then...", "Good one, let's try...", "Ah yeah, that makes sense...", "No worries at all..."
- Avoid technical jargon unless the customer uses it first — then match their level

BOUNDARIES:
- You work for Tech In Town — if an issue is beyond remote help, offer to book an in-person specialist
- Only help with IT-related topics
- Do not recommend opening devices unsafely or voiding warranties without clear guidance
- Always prioritise data safety — back up before major changes

You are currently running as a voice assistant on the Tech In Town website. Keep responses SHORT and CONVERSATIONAL — they will be read aloud by a text-to-speech engine. Speak naturally, like you would over the phone with a customer.`;

// ── STATE ────────────────────────────────────────────────────────────────────
const state = {
  mode: 'idle',       // idle | listening | processing | speaking
  conversation: [],
  settings: {
    voiceEngine: 'webspeech',  // 'webspeech' | 'elevenlabs'
    elLabsKey: '',
    voiceSpeed: 0.95,
    autoListen: true,
    muted: false,
  },
  currentAudio: null,
  recognition: null,
  audioContext: null,
  analyser: null,
  micStream: null,
  animFrame: null,
  voices: [],
  selectedVoice: null,
};

// ── DOM REFS ─────────────────────────────────────────────────────────────────
const dom = {
  chatMessages:   () => document.getElementById('chatMessages'),
  chatEmpty:      () => document.getElementById('chatEmpty'),
  micBtn:         () => document.getElementById('micBtn'),
  micLabel:       () => document.getElementById('micLabel'),
  sendBtn:        () => document.getElementById('sendBtn'),
  textInput:      () => document.getElementById('textInput'),
  stopBtn:        () => document.getElementById('stopBtn'),
  interimDisplay: () => document.getElementById('interimDisplay'),
  interimText:    () => document.getElementById('interimText'),
  chatStatusBar:  () => document.getElementById('chatStatusBar'),
  chatStatusText: () => document.getElementById('chatStatusText'),
  csbDots:        () => document.getElementById('csbDots'),
  statusBadge:    () => document.getElementById('statusBadge'),
  statusDot:      () => document.getElementById('statusDot'),
  statusText:     () => document.getElementById('statusText'),
  maxOrb:         () => document.getElementById('maxOrb'),
  orbEq:          () => document.getElementById('orbEq'),
  waveCanvas:     () => document.getElementById('waveCanvas'),
  settingsBtn:    () => document.getElementById('settingsBtn'),
  settingsPanel:  () => document.getElementById('settingsPanel'),
  settingsSave:   () => document.getElementById('settingsSave'),
  voiceEngine:    () => document.getElementById('voiceEngine'),
  elLabsKeyRow:   () => document.getElementById('elLabsKeyRow'),
  elLabsKey:      () => document.getElementById('elLabsKey'),
  voiceSpeed:     () => document.getElementById('voiceSpeed'),
  voiceSpeedVal:  () => document.getElementById('voiceSpeedVal'),
  autoListen:     () => document.getElementById('autoListen'),
  muteVoice:      () => document.getElementById('muteVoice'),
  noSpeechWarn:   () => document.getElementById('noSpeechWarn'),
  quickTopics:    () => document.getElementById('quickTopics'),
};

// ── INIT ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  loadSettings();
  setupSettings();
  setupQuickTopics();
  setupTextInput();

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    dom.noSpeechWarn().style.display = 'block';
    dom.micBtn().disabled = true;
    dom.micLabel().textContent = 'Voice not supported';
  } else {
    setupSpeechRecognition();
    dom.micBtn().addEventListener('click', handleMicClick);
  }

  setStatus('idle', 'Max is ready');

  // Load Web Speech voices
  if (window.speechSynthesis) {
    state.voices = speechSynthesis.getVoices();
    if (!state.voices.length) {
      speechSynthesis.addEventListener('voiceschanged', () => {
        state.voices = speechSynthesis.getVoices();
        pickVoice();
      }, { once: true });
    } else {
      pickVoice();
    }
  }

  // Greet after a short delay
  setTimeout(() => greetUser(), 800);
});

// ── VOICE SELECTION ───────────────────────────────────────────────────────────
function pickVoice() {
  const voices = state.voices;
  // Prefer Australian English male voices
  const auMale = voices.find(v =>
    v.lang === 'en-AU' && /male|daniel|lee|james/i.test(v.name)
  );
  const au = voices.find(v => v.lang === 'en-AU');
  const enMale = voices.find(v =>
    v.lang.startsWith('en') && /daniel|david|james|mark|alex|matthew/i.test(v.name)
  );
  const en = voices.find(v => v.lang.startsWith('en'));
  state.selectedVoice = auMale || au || enMale || en || voices[0] || null;
}

// ── GREETING ─────────────────────────────────────────────────────────────────
async function greetUser() {
  const greetings = [
    "G'day! I'm Max, Tech In Town's IT support specialist with over 35 years in the game. What's giving you grief today?",
    "G'day, welcome to Tech In Town! I'm Max — your personal IT expert. What tech trouble can I help you sort out?",
  ];
  const greeting = greetings[Math.floor(Math.random() * greetings.length)];
  addMessage('max', greeting);
  await speak(greeting);
}

// ── SPEECH RECOGNITION ───────────────────────────────────────────────────────
function setupSpeechRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SR();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = 'en-AU';
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    setMode('listening');
    dom.interimDisplay().classList.add('show');
    dom.interimText().textContent = 'Listening...';
    startMicVisualizer();
  };

  recognition.onresult = (event) => {
    let interim = '';
    let final = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const t = event.results[i][0].transcript;
      if (event.results[i].isFinal) final += t;
      else interim += t;
    }
    dom.interimText().textContent = final || interim || 'Listening...';
    if (final) {
      recognition.stop();
      handleUserInput(final.trim());
    }
  };

  recognition.onerror = (event) => {
    console.warn('Speech recognition error:', event.error);
    stopMicVisualizer();
    dom.interimDisplay().classList.remove('show');
    if (event.error === 'not-allowed') {
      showError("Microphone access was denied. Please allow microphone permissions and try again.");
    } else if (event.error !== 'aborted' && event.error !== 'no-speech') {
      showError("Couldn't catch that. Give it another go!");
    }
    setMode('idle');
  };

  recognition.onend = () => {
    stopMicVisualizer();
    dom.interimDisplay().classList.remove('show');
    if (state.mode === 'listening') {
      setMode('idle');
    }
  };

  state.recognition = recognition;
}

function handleMicClick() {
  if (state.mode === 'speaking') {
    stopSpeaking();
    return;
  }
  if (state.mode === 'listening') {
    if (state.recognition) state.recognition.stop();
    setMode('idle');
    return;
  }
  if (state.mode !== 'idle') return;

  startListening();
}

function startListening() {
  if (!state.recognition) return;
  try {
    state.recognition.start();
  } catch (e) {
    console.warn('Recognition start error:', e);
    // Re-create recognition if needed
    setupSpeechRecognition();
    try { state.recognition.start(); } catch (_) {}
  }
}

// ── MIC VISUALIZER (Web Audio API) ───────────────────────────────────────────
async function startMicVisualizer() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    state.micStream = stream;
    state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = state.audioContext.createMediaStreamSource(stream);
    state.analyser = state.audioContext.createAnalyser();
    state.analyser.fftSize = 256;
    source.connect(state.analyser);

    const canvas = dom.waveCanvas();
    canvas.classList.add('active');
    drawWaveform();
  } catch (e) {
    console.warn('Microphone visualizer unavailable:', e);
  }
}

function drawWaveform() {
  if (!state.analyser) return;
  const canvas = dom.waveCanvas();
  const ctx = canvas.getContext('2d');
  const bufferLength = state.analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  function draw() {
    state.animFrame = requestAnimationFrame(draw);
    state.analyser.getByteTimeDomainData(dataArray);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = state.mode === 'listening' ? '#22c55e' : '#00B4D8';
    ctx.lineWidth = 2;
    ctx.beginPath();

    const sliceWidth = canvas.width / bufferLength;
    let x = 0;
    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0;
      const y = (v * canvas.height) / 2;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
      x += sliceWidth;
    }
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();
  }
  draw();
}

function stopMicVisualizer() {
  if (state.animFrame) {
    cancelAnimationFrame(state.animFrame);
    state.animFrame = null;
  }
  if (state.micStream) {
    state.micStream.getTracks().forEach(t => t.stop());
    state.micStream = null;
  }
  if (state.audioContext) {
    state.audioContext.close().catch(() => {});
    state.audioContext = null;
    state.analyser = null;
  }
  const canvas = dom.waveCanvas();
  canvas.classList.remove('active');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// ── TEXT INPUT ───────────────────────────────────────────────────────────────
function setupTextInput() {
  const input = dom.textInput();
  const sendBtn = dom.sendBtn();

  sendBtn.addEventListener('click', () => submitText());
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitText();
    }
  });

  function submitText() {
    const text = input.value.trim();
    if (!text || state.mode === 'processing' || state.mode === 'speaking') return;
    input.value = '';
    handleUserInput(text);
  }
}

// ── QUICK TOPICS ─────────────────────────────────────────────────────────────
function setupQuickTopics() {
  document.querySelectorAll('.qt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const topic = btn.getAttribute('data-topic');
      if (topic && state.mode === 'idle') {
        handleUserInput(topic);
      }
    });
  });
}

// ── CORE: HANDLE USER INPUT ───────────────────────────────────────────────────
async function handleUserInput(text) {
  if (!text || state.mode === 'processing') return;

  // Remove empty placeholder
  const empty = dom.chatEmpty();
  if (empty) empty.remove();

  addMessage('user', text);
  state.conversation.push({ role: 'user', content: text });
  setMode('processing');

  // Show typing indicator
  const typingEl = addTypingIndicator();

  try {
    const response = await callClaudeAPI(state.conversation);
    typingEl.remove();

    if (!response) throw new Error('Empty response');

    state.conversation.push({ role: 'assistant', content: response });
    addMessage('max', response);
    await speak(response);

    // Auto-listen if enabled
    if (state.settings.autoListen && state.mode === 'idle') {
      setTimeout(() => {
        if (state.mode === 'idle') startListening();
      }, 600);
    }

  } catch (err) {
    typingEl.remove();
    console.error('Chat error:', err);
    const fallback = "Sorry, I'm having a bit of trouble connecting right now. Try again in a moment, or give us a call on 1800 TECH IT.";
    addMessage('max', fallback);
    await speak(fallback);
  }
}

// ── CLAUDE API ────────────────────────────────────────────────────────────────
async function callClaudeAPI(messages) {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages })
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();
  return data.text || data.content || '';
}

// ── TEXT TO SPEECH ────────────────────────────────────────────────────────────
async function speak(text) {
  if (state.settings.muted || !text) {
    setMode('idle');
    return;
  }

  setMode('speaking');

  try {
    if (state.settings.voiceEngine === 'elevenlabs' && state.settings.elLabsKey) {
      await speakElevenLabs(text);
    } else {
      await speakWebSpeech(text);
    }
  } catch (err) {
    console.warn('TTS error, falling back to Web Speech:', err);
    try {
      await speakWebSpeech(text);
    } catch (_) {
      setMode('idle');
    }
  }
}

async function speakElevenLabs(text) {
  // Try server proxy first (API key kept server-side)
  const response = await fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  });

  if (!response.ok) {
    throw new Error('ElevenLabs TTS unavailable');
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  state.currentAudio = audio;

  return new Promise((resolve, reject) => {
    audio.onended = () => {
      URL.revokeObjectURL(url);
      state.currentAudio = null;
      setMode('idle');
      resolve();
    };
    audio.onerror = (e) => {
      URL.revokeObjectURL(url);
      state.currentAudio = null;
      setMode('idle');
      reject(e);
    };
    audio.play().catch(reject);
  });
}

function speakWebSpeech(text) {
  return new Promise((resolve) => {
    if (!window.speechSynthesis) {
      setMode('idle');
      resolve();
      return;
    }

    // Cancel any current speech
    speechSynthesis.cancel();

    // Split into sentences for more natural delivery
    const utterance = new SpeechSynthesisUtterance(text);
    if (state.selectedVoice) utterance.voice = state.selectedVoice;
    utterance.lang = 'en-AU';
    utterance.rate = state.settings.voiceSpeed;
    utterance.pitch = 0.9;
    utterance.volume = 1;

    utterance.onstart = () => {
      // Already in speaking mode
    };

    utterance.onend = () => {
      state.currentAudio = null;
      setMode('idle');
      resolve();
    };

    utterance.onerror = (e) => {
      if (e.error !== 'interrupted') {
        console.warn('Web Speech error:', e.error);
      }
      state.currentAudio = null;
      setMode('idle');
      resolve();
    };

    state.currentAudio = utterance;
    speechSynthesis.speak(utterance);
  });
}

function stopSpeaking() {
  if (window.speechSynthesis) speechSynthesis.cancel();
  if (state.currentAudio instanceof Audio) {
    state.currentAudio.pause();
    state.currentAudio = null;
  }
  setMode('idle');
}

// ── MODE / STATE MANAGEMENT ───────────────────────────────────────────────────
function setMode(mode) {
  state.mode = mode;
  const orb = dom.maxOrb();

  // Remove all mode classes
  orb.classList.remove('listening', 'processing', 'speaking');
  dom.micBtn().classList.remove('listening', 'processing', 'speaking');

  const micIconOn  = dom.micBtn().querySelector('.mic-icon--on');
  const micIconOff = dom.micBtn().querySelector('.mic-icon--off');

  switch (mode) {
    case 'listening':
      orb.classList.add('listening');
      dom.micBtn().classList.add('listening');
      dom.micBtn().disabled = false;
      dom.sendBtn().disabled = true;
      setStatus('listening', 'Listening...');
      dom.micLabel().textContent = 'Tap to stop';
      dom.stopBtn().style.display = 'none';
      dom.csbDots().classList.add('show');
      dom.csbDots().style.setProperty('--dot-color', '#22c55e');
      if (micIconOn) micIconOn.style.display = 'block';
      if (micIconOff) micIconOff.style.display = 'none';
      break;

    case 'processing':
      orb.classList.add('processing');
      dom.micBtn().classList.add('processing');
      dom.micBtn().disabled = true;
      dom.sendBtn().disabled = true;
      setStatus('processing', 'Max is thinking...');
      dom.micLabel().textContent = 'Please wait...';
      dom.stopBtn().style.display = 'none';
      dom.csbDots().classList.add('show');
      if (micIconOn) micIconOn.style.display = 'block';
      if (micIconOff) micIconOff.style.display = 'none';
      break;

    case 'speaking':
      orb.classList.add('speaking');
      dom.micBtn().classList.add('speaking');
      dom.micBtn().disabled = false; // Allow stopping
      dom.sendBtn().disabled = true;
      setStatus('speaking', 'Max is speaking...');
      dom.micLabel().textContent = 'Tap to interrupt';
      dom.stopBtn().style.display = 'flex';
      dom.csbDots().classList.remove('show');
      if (micIconOn) micIconOn.style.display = 'none';
      if (micIconOff) micIconOff.style.display = 'block';
      break;

    case 'idle':
    default:
      dom.micBtn().disabled = false;
      dom.sendBtn().disabled = false;
      setStatus('idle', 'Max is ready');
      dom.micLabel().textContent = 'Tap to speak';
      dom.stopBtn().style.display = 'none';
      dom.csbDots().classList.remove('show');
      if (micIconOn) micIconOn.style.display = 'block';
      if (micIconOff) micIconOff.style.display = 'none';
      break;
  }
}

function setStatus(type, text) {
  dom.chatStatusText().textContent = text;

  const dot = dom.statusDot();
  const statusText = dom.statusText();

  const colorMap = {
    idle:       '#22c55e',
    listening:  '#22c55e',
    processing: '#F59E0B',
    speaking:   '#00B4D8',
  };
  dot.style.background = colorMap[type] || '#22c55e';
  statusText.textContent = text;
}

// ── CHAT UI HELPERS ───────────────────────────────────────────────────────────
function addMessage(role, text) {
  const messagesEl = dom.chatMessages();
  const isMax = role === 'max';

  const msgEl = document.createElement('div');
  msgEl.className = `msg msg--${isMax ? 'max' : 'user'}`;

  const avatarEl = document.createElement('div');
  avatarEl.className = 'msg-avatar';
  avatarEl.textContent = isMax ? 'M' : 'You';

  const contentEl = document.createElement('div');
  contentEl.className = 'msg-content';

  const bubbleEl = document.createElement('div');
  bubbleEl.className = 'msg-bubble';
  bubbleEl.textContent = text;

  const timeEl = document.createElement('div');
  timeEl.className = 'msg-time';
  timeEl.textContent = formatTime(new Date());

  contentEl.appendChild(bubbleEl);
  contentEl.appendChild(timeEl);
  msgEl.appendChild(avatarEl);
  msgEl.appendChild(contentEl);
  messagesEl.appendChild(msgEl);

  scrollToBottom();
  return msgEl;
}

function addTypingIndicator() {
  const messagesEl = dom.chatMessages();

  const msgEl = document.createElement('div');
  msgEl.className = 'msg msg--max';

  const avatarEl = document.createElement('div');
  avatarEl.className = 'msg-avatar';
  avatarEl.textContent = 'M';

  const indicatorEl = document.createElement('div');
  indicatorEl.className = 'typing-indicator';
  indicatorEl.innerHTML = '<span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>';

  msgEl.appendChild(avatarEl);
  msgEl.appendChild(indicatorEl);
  messagesEl.appendChild(msgEl);

  scrollToBottom();
  return msgEl;
}

function showError(message) {
  addMessage('max', message);
}

function scrollToBottom() {
  const el = dom.chatMessages();
  requestAnimationFrame(() => {
    el.scrollTop = el.scrollHeight;
  });
}

function formatTime(date) {
  return date.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' });
}

// ── SETTINGS ──────────────────────────────────────────────────────────────────
function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem('max_settings') || '{}');
    Object.assign(state.settings, saved);
  } catch (_) {}
}

function saveSettings() {
  try {
    localStorage.setItem('max_settings', JSON.stringify(state.settings));
  } catch (_) {}
}

function setupSettings() {
  const settingsBtn  = dom.settingsBtn();
  const settingsPanel = dom.settingsPanel();
  const settingsSave  = dom.settingsSave();
  const voiceEngine   = dom.voiceEngine();
  const elLabsKeyRow  = dom.elLabsKeyRow();
  const voiceSpeedEl  = dom.voiceSpeed();
  const voiceSpeedVal = dom.voiceSpeedVal();
  const autoListenEl  = dom.autoListen();
  const muteVoiceEl   = dom.muteVoice();

  // Toggle panel
  settingsBtn.addEventListener('click', () => {
    settingsPanel.classList.toggle('open');
  });

  // Close panel when clicking outside
  document.addEventListener('click', (e) => {
    if (settingsPanel.classList.contains('open') &&
        !settingsPanel.contains(e.target) &&
        e.target !== settingsBtn) {
      settingsPanel.classList.remove('open');
    }
  });

  // Sync UI with current settings
  voiceEngine.value     = state.settings.voiceEngine;
  dom.elLabsKey().value = state.settings.elLabsKey;
  voiceSpeedEl.value    = state.settings.voiceSpeed;
  voiceSpeedVal.textContent = state.settings.voiceSpeed + 'x';
  autoListenEl.checked  = state.settings.autoListen;
  muteVoiceEl.checked   = state.settings.muted;
  elLabsKeyRow.style.display = state.settings.voiceEngine === 'elevenlabs' ? 'flex' : 'none';

  // Show/hide ElevenLabs key field
  voiceEngine.addEventListener('change', () => {
    elLabsKeyRow.style.display = voiceEngine.value === 'elevenlabs' ? 'flex' : 'none';
  });

  // Speed display
  voiceSpeedEl.addEventListener('input', () => {
    voiceSpeedVal.textContent = parseFloat(voiceSpeedEl.value).toFixed(2) + 'x';
  });

  // Save
  settingsSave.addEventListener('click', () => {
    state.settings.voiceEngine = voiceEngine.value;
    state.settings.elLabsKey   = dom.elLabsKey().value.trim();
    state.settings.voiceSpeed  = parseFloat(voiceSpeedEl.value);
    state.settings.autoListen  = autoListenEl.checked;
    state.settings.muted       = muteVoiceEl.checked;
    saveSettings();
    settingsPanel.classList.remove('open');

    // Repick voice if settings changed
    if (state.voices.length) pickVoice();

    // Visual feedback
    settingsSave.textContent = 'Saved!';
    setTimeout(() => { settingsSave.textContent = 'Save Settings'; }, 1500);
  });

  // Stop button
  dom.stopBtn().addEventListener('click', stopSpeaking);
}

// ── KEYBOARD SHORTCUT ─────────────────────────────────────────────────────────
document.addEventListener('keydown', (e) => {
  // Space bar to toggle mic (when not in text input)
  if (e.code === 'Space' && document.activeElement !== dom.textInput()) {
    e.preventDefault();
    handleMicClick();
  }
  // Escape to stop
  if (e.code === 'Escape') {
    stopSpeaking();
  }
});
