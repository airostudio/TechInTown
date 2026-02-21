/* ============================================================
   TECH IN TOWN — Max Sullivan AI Technician
   Voice + Text Chat | Claude AI | ElevenLabs TTS
   ============================================================ */

(function () {
  'use strict';

  /* ============================================================
     CONSTANTS & STATE
     ============================================================ */
  const MAX_SYSTEM_PROMPT = `You are Max Sullivan, an IT technician with 35+ years of experience, now working as an AI support agent for Tech In Town — a specialist IT company serving apartment residents on the Gold Coast, Australia.

Your background spans everything from DOS and Windows 3.1 to Windows 11, macOS, Linux, iOS, Android, and ChromeOS. You're an expert in home networking (all router brands, Wi-Fi standards, mesh systems, NBN types — FTTP, FTTN, FTTC, HFC), hardware (PCs, laptops, tablets, printers, smart TVs, soundbars, streaming devices, gaming consoles), software (Office 365, Adobe, Google Workspace, Zoom, Teams), cybersecurity (malware removal, phishing, 2FA, password managers, data backup), and AV setups (TV mounting, HDMI, soundbars, 4K/HDR).

Your personality: warm, patient, calm, and genuinely helpful. You use plain English — no jargon unless explaining it. You occasionally use natural Australian expressions. You ask one diagnostic question at a time, always try the simplest solution first, and never make the user feel stupid.

CRITICAL RULES:
- Keep EVERY response to 2-4 sentences maximum. Concise and conversational.
- No markdown, no bullet points, no numbered lists. Plain conversational sentences only.
- No headings or bold text. Just natural speech.
- If the problem is complex, guide step-by-step one question at a time.
- Only discuss IT and technology topics.
- If someone needs an in-person visit, say "I'd recommend booking one of our technicians to come out and sort this for you in person."
- Never reveal that you are an AI language model. You are Max Sullivan.`;

  let state = {
    mode: 'idle',       // idle | listening | processing | speaking
    conversation: [],
    settings: {
      voiceEngine: 'browser',
      elevenLabsKey: '',
      speechRate: 1.0,
      autoListen: false,
      muteVoice: false,
    },
    recognition: null,
    synthesis: window.speechSynthesis,
    currentUtterance: null,
    audioContext: null,
    analyser: null,
    micStream: null,
    elevenLabsAudio: null,
    autoTimer: null,
  };

  /* ============================================================
     DOM REFS
     ============================================================ */
  const els = {
    messages:       document.getElementById('messages'),
    micBtn:         document.getElementById('mic-btn'),
    textInput:      document.getElementById('text-input'),
    sendBtn:        document.getElementById('send-btn'),
    stopBtn:        document.getElementById('stop-btn'),
    statusMsg:      document.getElementById('status-msg'),
    statusDots:     document.getElementById('status-dots'),
    interimBar:     document.getElementById('interim-bar'),
    interimText:    document.getElementById('interim-text'),
    quickTopics:    document.querySelectorAll('.qt-btn'),
    settingsToggle: document.getElementById('settings-toggle'),
    settingsPanel:  document.getElementById('settings-panel'),
    saveSettings:   document.getElementById('save-settings'),
    voiceBrowser:   document.getElementById('voice-browser'),
    voiceElevenLabs:document.getElementById('voice-elevenlabs'),
    elKeyRow:       document.getElementById('el-key-row'),
    elApiKey:       document.getElementById('el-api-key'),
    speechSpeed:    document.getElementById('speech-speed'),
    speedVal:       document.getElementById('speed-val'),
    autoListen:     document.getElementById('auto-listen'),
    muteVoice:      document.getElementById('mute-voice'),
    porbCore:       document.getElementById('porb-core'),
    micVisualizer:  document.getElementById('mic-visualizer'),
    noSpeechWarn:   document.getElementById('no-speech-warning'),
  };

  /* ============================================================
     SETTINGS
     ============================================================ */
  function loadSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem('max-settings') || '{}');
      state.settings = { ...state.settings, ...saved };
    } catch {}
    applySettingsToUI();
  }

  function applySettingsToUI() {
    const s = state.settings;
    if (els.voiceBrowser) els.voiceBrowser.classList.toggle('active', s.voiceEngine === 'browser');
    if (els.voiceElevenLabs) els.voiceElevenLabs.classList.toggle('active', s.voiceEngine === 'elevenlabs');
    if (els.elKeyRow) els.elKeyRow.style.display = s.voiceEngine === 'elevenlabs' ? 'flex' : 'none';
    if (els.elApiKey) els.elApiKey.value = s.elevenLabsKey;
    if (els.speechSpeed) els.speechSpeed.value = s.speechRate;
    if (els.speedVal) els.speedVal.textContent = s.speechRate.toFixed(1) + 'x';
    if (els.autoListen) els.autoListen.checked = s.autoListen;
    if (els.muteVoice) els.muteVoice.checked = s.muteVoice;
  }

  function saveSettings() {
    localStorage.setItem('max-settings', JSON.stringify(state.settings));
  }

  function initSettingsUI() {
    // Voice engine toggle
    els.voiceBrowser?.addEventListener('click', () => {
      state.settings.voiceEngine = 'browser';
      applySettingsToUI();
    });
    els.voiceElevenLabs?.addEventListener('click', () => {
      state.settings.voiceEngine = 'elevenlabs';
      applySettingsToUI();
    });

    // Speed slider
    els.speechSpeed?.addEventListener('input', () => {
      const val = parseFloat(els.speechSpeed.value);
      state.settings.speechRate = val;
      if (els.speedVal) els.speedVal.textContent = val.toFixed(1) + 'x';
    });

    // Save button
    els.saveSettings?.addEventListener('click', () => {
      state.settings.elevenLabsKey = els.elApiKey?.value?.trim() || '';
      state.settings.autoListen = els.autoListen?.checked || false;
      state.settings.muteVoice = els.muteVoice?.checked || false;
      saveSettings();
      setStatus('Settings saved');
      setTimeout(() => setStatus('Ask Max anything about your tech'), 1500);
    });

    // Settings panel toggle
    els.settingsToggle?.addEventListener('click', () => {
      els.settingsPanel?.classList.toggle('visible');
    });
  }

  /* ============================================================
     STATUS & UI
     ============================================================ */
  function setStatus(msg, showDots) {
    if (els.statusMsg) els.statusMsg.textContent = msg;
    if (els.statusDots) els.statusDots.style.display = showDots ? 'flex' : 'none';
  }

  function setMode(mode) {
    state.mode = mode;
    document.body.setAttribute('data-mode', mode);

    // Mic button state
    if (els.micBtn) {
      els.micBtn.classList.toggle('listening', mode === 'listening');
    }

    // Stop button
    if (els.stopBtn) {
      els.stopBtn.style.display = mode === 'speaking' ? 'flex' : 'none';
    }

    // Send button
    if (els.sendBtn) {
      els.sendBtn.disabled = mode === 'processing';
    }

    // Orb glow
    if (els.porbCore) {
      els.porbCore.classList.toggle('speaking', mode === 'speaking');
    }

    switch (mode) {
      case 'idle':
        setStatus('Ask Max anything about your tech');
        if (els.interimBar) els.interimBar.style.display = 'none';
        stopMicVisualizer();
        break;
      case 'listening':
        setStatus('Listening...');
        if (els.interimBar) els.interimBar.style.display = 'flex';
        break;
      case 'processing':
        setStatus('Max is thinking...', true);
        if (els.interimBar) els.interimBar.style.display = 'none';
        stopMicVisualizer();
        break;
      case 'speaking':
        setStatus('Max is speaking...');
        break;
    }
  }

  /* ============================================================
     MESSAGES
     ============================================================ */
  function addMessage(role, text) {
    if (!els.messages) return;

    const msg = document.createElement('div');
    msg.className = `msg msg-${role === 'user' ? 'user' : 'max'}`;

    const avatar = document.createElement('div');
    avatar.className = 'msg-avatar';
    avatar.textContent = role === 'user' ? 'YOU' : 'MS';

    const bubble = document.createElement('div');
    bubble.className = 'msg-bubble';
    bubble.textContent = text;

    msg.appendChild(avatar);
    msg.appendChild(bubble);
    els.messages.appendChild(msg);
    scrollToBottom();
  }

  function showTypingIndicator() {
    if (!els.messages) return;
    const div = document.createElement('div');
    div.className = 'msg msg-max';
    div.id = 'typing-indicator';

    const avatar = document.createElement('div');
    avatar.className = 'msg-avatar';
    avatar.textContent = 'MS';

    const bubble = document.createElement('div');
    bubble.className = 'msg-bubble';
    bubble.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';

    div.appendChild(avatar);
    div.appendChild(bubble);
    els.messages.appendChild(div);
    scrollToBottom();
  }

  function removeTypingIndicator() {
    document.getElementById('typing-indicator')?.remove();
  }

  function scrollToBottom() {
    if (els.messages) {
      els.messages.scrollTop = els.messages.scrollHeight;
    }
  }

  /* ============================================================
     SPEECH RECOGNITION
     ============================================================ */
  function initSpeechRecognition() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      if (els.noSpeechWarn) els.noSpeechWarn.style.display = 'flex';
      if (els.micBtn) els.micBtn.disabled = true;
      return;
    }

    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-AU';
    state.recognition = recognition;

    recognition.onstart = () => {
      setMode('listening');
      startMicVisualizer();
    };

    recognition.onresult = (event) => {
      let interim = '';
      let final = '';
      for (const result of event.results) {
        if (result.isFinal) final += result[0].transcript;
        else interim += result[0].transcript;
      }
      if (els.interimText) els.interimText.textContent = interim || final || 'Listening...';
      if (final) handleInput(final.trim());
    };

    recognition.onerror = (event) => {
      if (event.error === 'no-speech') {
        setMode('idle');
        return;
      }
      setMode('idle');
      setStatus('Mic error: ' + event.error);
    };

    recognition.onend = () => {
      if (state.mode === 'listening') setMode('idle');
    };
  }

  function toggleMic() {
    if (!state.recognition) return;
    if (state.mode === 'listening') {
      state.recognition.stop();
      setMode('idle');
    } else if (state.mode === 'idle') {
      try {
        state.recognition.start();
      } catch {}
    }
  }

  /* ============================================================
     MIC VISUALIZER
     ============================================================ */
  function startMicVisualizer() {
    const canvas = els.micVisualizer;
    if (!canvas) return;

    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      .then(stream => {
        state.micStream = stream;
        state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        state.analyser = state.audioContext.createAnalyser();
        const source = state.audioContext.createMediaStreamSource(stream);
        source.connect(state.analyser);
        state.analyser.fftSize = 128;

        canvas.classList.add('active');
        drawVisualizer();
      })
      .catch(() => { /* no mic permission — ignore */ });
  }

  function drawVisualizer() {
    const canvas = els.micVisualizer;
    if (!canvas || !state.analyser) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;

    function draw() {
      if (state.mode !== 'listening') return;
      const data = new Uint8Array(state.analyser.frequencyBinCount);
      state.analyser.getByteFrequencyData(data);

      ctx.clearRect(0, 0, W, H);

      const barW = W / data.length * 2.5;
      let x = 0;
      for (let i = 0; i < data.length; i++) {
        const barH = (data[i] / 255) * H * 0.9;
        const alpha = 0.4 + (data[i] / 255) * 0.6;
        ctx.fillStyle = `rgba(0,212,255,${alpha})`;
        ctx.fillRect(x, H - barH, barW - 1, barH);
        x += barW + 1;
        if (x > W) break;
      }
      requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
  }

  function stopMicVisualizer() {
    if (state.micStream) {
      state.micStream.getTracks().forEach(t => t.stop());
      state.micStream = null;
    }
    if (state.audioContext) {
      state.audioContext.close().catch(() => {});
      state.audioContext = null;
      state.analyser = null;
    }
    const canvas = els.micVisualizer;
    if (canvas) {
      canvas.classList.remove('active');
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  /* ============================================================
     CHAT API
     ============================================================ */
  async function handleInput(text) {
    if (!text || state.mode === 'processing') return;

    // Stop any ongoing speech
    stopSpeaking();

    addMessage('user', text);
    state.conversation.push({ role: 'user', content: text });

    setMode('processing');
    showTypingIndicator();

    // Input field UX
    if (els.textInput) els.textInput.value = '';

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          systemPrompt: MAX_SYSTEM_PROMPT,
          conversationHistory: state.conversation.slice(-18),
        }),
      });

      if (!res.ok) throw new Error('API error: ' + res.status);
      const data = await res.json();
      const reply = data.response || data.message || 'Sorry, I had a bit of trouble with that. Could you try asking again?';

      removeTypingIndicator();
      addMessage('assistant', reply);
      state.conversation.push({ role: 'assistant', content: reply });

      // Keep conversation manageable
      if (state.conversation.length > 40) {
        state.conversation = state.conversation.slice(-30);
      }

      if (!state.settings.muteVoice) {
        await speak(reply);
      } else {
        setMode('idle');
        scheduleAutoListen();
      }
    } catch (err) {
      removeTypingIndicator();
      const errMsg = "Sorry mate, I'm having a bit of trouble connecting right now. Try again in a moment.";
      addMessage('assistant', errMsg);
      setMode('idle');
      if (!state.settings.muteVoice) speak(errMsg);
    }
  }

  /* ============================================================
     SPEECH SYNTHESIS
     ============================================================ */
  async function speak(text) {
    if (state.settings.voiceEngine === 'elevenlabs' && state.settings.elevenLabsKey) {
      await speakElevenLabs(text);
    } else {
      speakBrowser(text);
    }
  }

  function speakBrowser(text) {
    if (!state.synthesis) {
      setMode('idle');
      return;
    }
    state.synthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = state.settings.speechRate;
    utterance.lang = 'en-AU';

    // Pick an appropriate voice
    const voices = state.synthesis.getVoices();
    const preferred = voices.find(v =>
      v.lang.startsWith('en-AU') ||
      v.lang.startsWith('en-GB') ||
      v.name.toLowerCase().includes('australian') ||
      v.name.toLowerCase().includes('daniel') ||
      v.name.toLowerCase().includes('oliver')
    ) || voices.find(v => v.lang.startsWith('en')) || null;
    if (preferred) utterance.voice = preferred;

    utterance.onstart = () => setMode('speaking');
    utterance.onend = () => {
      setMode('idle');
      scheduleAutoListen();
    };
    utterance.onerror = () => setMode('idle');

    state.currentUtterance = utterance;
    setMode('speaking');
    state.synthesis.speak(utterance);
  }

  async function speakElevenLabs(text) {
    setMode('speaking');
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          apiKey: state.settings.elevenLabsKey,
        }),
      });
      if (!res.ok) throw new Error('ElevenLabs error');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.playbackRate = state.settings.speechRate;
      state.elevenLabsAudio = audio;

      audio.onended = () => {
        URL.revokeObjectURL(url);
        state.elevenLabsAudio = null;
        setMode('idle');
        scheduleAutoListen();
      };
      audio.onerror = () => {
        setMode('idle');
        speakBrowser(text); // fallback
      };
      await audio.play();
    } catch {
      speakBrowser(text); // fallback to browser
    }
  }

  function stopSpeaking() {
    if (state.synthesis) state.synthesis.cancel();
    if (state.elevenLabsAudio) {
      state.elevenLabsAudio.pause();
      state.elevenLabsAudio = null;
    }
    clearTimeout(state.autoTimer);
    if (state.mode === 'speaking') setMode('idle');
  }

  function scheduleAutoListen() {
    if (!state.settings.autoListen || !state.recognition) return;
    clearTimeout(state.autoTimer);
    state.autoTimer = setTimeout(() => {
      if (state.mode === 'idle') {
        try { state.recognition.start(); } catch {}
      }
    }, 1000);
  }

  /* ============================================================
     GREETING
     ============================================================ */
  function greet() {
    const greetings = [
      "G'day! I'm Max Sullivan. What tech problem can I help you sort out today?",
      "Hey there, Max Sullivan here. What's giving you grief with your tech today?",
      "Hi! Max here — your personal IT tech. What can I help you with today?",
    ];
    const greeting = greetings[Math.floor(Math.random() * greetings.length)];
    addMessage('assistant', greeting);
    state.conversation.push({ role: 'assistant', content: greeting });

    if (!state.settings.muteVoice) {
      setTimeout(() => speak(greeting), 600);
    }
  }

  /* ============================================================
     EVENT LISTENERS
     ============================================================ */
  function initEvents() {
    // Mic button
    els.micBtn?.addEventListener('click', toggleMic);

    // Send button
    els.sendBtn?.addEventListener('click', () => {
      const text = els.textInput?.value?.trim();
      if (text) handleInput(text);
    });

    // Enter key in text input
    els.textInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const text = els.textInput.value.trim();
        if (text) handleInput(text);
      }
    });

    // Stop button
    els.stopBtn?.addEventListener('click', () => {
      stopSpeaking();
      setMode('idle');
    });

    // Quick topic buttons
    els.quickTopics?.forEach(btn => {
      btn.addEventListener('click', () => {
        const msg = btn.getAttribute('data-msg');
        if (msg && state.mode === 'idle') handleInput(msg);
      });
    });
  }

  /* ============================================================
     INIT
     ============================================================ */
  function init() {
    loadSettings();
    initSettingsUI();
    initSpeechRecognition();
    initEvents();

    // Load voices async (some browsers need this)
    if (window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }

    setMode('idle');
    greet();
  }

  document.addEventListener('DOMContentLoaded', init);

})();
