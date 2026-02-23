/* ================================================================
   TECH IN TOWN — Max Sullivan AI Technician
   Chat, Voice Input, TTS Output
   ================================================================ */

(function () {
  'use strict';

  /* ---------------------------------------------------------------
     MAX'S SYSTEM PROMPT
     --------------------------------------------------------------- */
  const SYSTEM = `You are Max Sullivan, a friendly and experienced IT technician with 35+ years of hands-on IT support experience specialising in Gold Coast apartment living. You work for Tech In Town.

Personality:
- Warm, direct, no-nonsense Gold Coast local
- Speak plain English — never use jargon without explaining it
- Short sentences, practical advice, real solutions
- Occasionally use Australian expressions naturally (mate, arvo, no worries)
- If a problem needs a physical technician, say so clearly and recommend booking via Tech In Town

Your expertise covers:
- Wi-Fi, NBN, networking, mesh networks, signal issues
- Windows, macOS, Linux PCs and laptops
- iOS and Android phones and tablets
- Smart home devices, Alexa, Google Home, HomeKit
- TV mounting, soundbars, AV setup, streaming devices
- Virus removal, malware, security, antivirus
- Data backup, recovery, cloud storage
- Move-in tech setup for apartments
- Cable management, wall mounting, body corporate infrastructure

Response format:
- Keep responses concise and scannable
- Use numbered steps for procedures
- Use bullet points for lists of items
- Be honest when something requires a physical visit
- Always end with an offer to help further or suggest booking a tech if needed

Remember: You represent Tech In Town. Be professional, helpful, and make the resident feel supported.`;

  /* ---------------------------------------------------------------
     STATE
     --------------------------------------------------------------- */
  const state = {
    conversation: [],   // { role: 'user'|'assistant', content: string }[]
    busy: false,
    speaking: false,
    audioCtx: null,
    recognition: null,
    recording: false,
  };

  /* ---------------------------------------------------------------
     DOM REFS
     --------------------------------------------------------------- */
  const $ = id => document.getElementById(id);

  const chatMsgs   = $('chat-msgs');
  const chatInput  = $('chat-input');
  const sendBtn    = $('send-btn');
  const micBtn     = $('mic-btn');
  const clearBtn   = $('clear-btn');
  const typingRow  = $('typing-row');
  const voiceBar   = $('voice-bar');
  const voiceLabel = $('voice-label');
  const vbStop     = $('vb-stop');
  const statusTxt  = $('status-txt');
  const orbEl      = $('orb');
  const orbEq      = $('orb-eq');
  const quickTopics = $('quick-topics');

  /* ---------------------------------------------------------------
     HELPERS — MESSAGE RENDERING
     --------------------------------------------------------------- */
  function appendMsg(role, text, extraClass) {
    const row = document.createElement('div');
    row.className = `msg msg-${role}${extraClass ? ' ' + extraClass : ''}`;

    if (role === 'ai') {
      const avatar = document.createElement('div');
      avatar.className = 'msg-avatar';
      avatar.textContent = 'MS';
      row.appendChild(avatar);
    }

    const bubble = document.createElement('div');
    bubble.className = 'msg-bubble';
    bubble.innerHTML = formatText(text);
    row.appendChild(bubble);

    chatMsgs.appendChild(row);
    scrollBottom();
    return row;
  }

  function appendUserMsg(text) {
    return appendMsg('user', escapeHtml(text));
  }

  function appendAiMsg(text) {
    return appendMsg('ai', text);
  }

  function scrollBottom() {
    chatMsgs.scrollTop = chatMsgs.scrollHeight;
  }

  // Basic markdown-ish formatter (no library needed)
  function formatText(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      // Code blocks  ```...```
      .replace(/```([\s\S]*?)```/g, (_, code) =>
        `<pre><code>${code.trim()}</code></pre>`)
      // Inline code
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // Bold **text**
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      // Numbered lists
      .replace(/^(\d+)\.\s(.+)$/gm, '<div class="list-item">$1. $2</div>')
      // Bullet lists
      .replace(/^[-*]\s(.+)$/gm, '<div class="list-item">• $1</div>')
      // Line breaks
      .replace(/\n{2,}/g, '<br><br>')
      .replace(/\n/g, '<br>');
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /* ---------------------------------------------------------------
     HELPERS — UI STATE
     --------------------------------------------------------------- */
  function setTyping(on) {
    typingRow.style.display = on ? 'flex' : 'none';
    if (on) scrollBottom();
  }

  function setBusy(on) {
    state.busy = on;
    sendBtn.disabled = on;
    chatInput.disabled = on;
    statusTxt.textContent = on ? 'Max is thinking...' : 'Max is online';
    if (orbEl) orbEl.style.opacity = on ? '.7' : '1';
  }

  function setSpeaking(on) {
    state.speaking = on;
    if (orbEq) orbEq.classList.toggle('active', on);
    statusTxt.textContent = on ? 'Max is speaking...' : 'Max is online';
  }

  /* ---------------------------------------------------------------
     SEND MESSAGE
     --------------------------------------------------------------- */
  async function sendMessage(text) {
    text = text.trim();
    if (!text || state.busy) return;

    // Clear input
    chatInput.value = '';
    chatInput.style.height = 'auto';

    // Show user message
    appendUserMsg(text);

    // Add to conversation history (user message first)
    state.conversation.push({ role: 'user', content: text });

    // Trim history to last 20 messages to stay within token limits
    if (state.conversation.length > 20) {
      state.conversation = state.conversation.slice(-20);
    }

    setBusy(true);
    setTyping(true);

    try {
      // POST to /api/chat — server.js expects { messages: Array<{role, content}> }
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: state.conversation.slice(-20),
        }),
      });

      setTyping(false);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();

      // server.js returns { text } — that is the field we read
      const reply = data.text || "Sorry mate, I hit a snag there. Could you try asking that again?";

      // Add assistant reply to history
      state.conversation.push({ role: 'assistant', content: reply });

      appendAiMsg(reply);

      // Attempt TTS
      speakText(reply);

    } catch (err) {
      setTyping(false);
      console.warn('Chat error:', err);
      const fallback = "Sorry, I had a bit of trouble connecting. Give it another go or give us a call on 1800 832 448.";
      appendMsg('ai', fallback, 'msg-error');
      state.conversation.push({ role: 'assistant', content: fallback });
    } finally {
      setBusy(false);
    }
  }

  /* ---------------------------------------------------------------
     TEXT-TO-SPEECH (ElevenLabs via /api/tts, fallback to Web Speech)
     --------------------------------------------------------------- */
  async function speakText(text) {
    // Strip markdown/HTML for TTS
    const plain = text
      .replace(/<[^>]+>/g, '')
      .replace(/\*\*/g, '')
      .replace(/`/g, '')
      .replace(/#{1,6}\s/g, '')
      .slice(0, 600); // cap length for TTS

    setSpeaking(true);

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: plain }),
      });

      if (!res.ok) throw new Error('TTS API error');

      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const audio = new Audio(url);

      audio.onended = () => {
        setSpeaking(false);
        URL.revokeObjectURL(url);
      };
      audio.onerror = () => {
        setSpeaking(false);
        fallbackTTS(plain);
      };

      await audio.play();

    } catch {
      setSpeaking(false);
      fallbackTTS(plain);
    }
  }

  function fallbackTTS(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 0.95;
    utt.pitch = 1;

    // Try to find an Australian or English voice
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => /en-AU|en_AU/i.test(v.lang))
      || voices.find(v => /en-US|en_US/i.test(v.lang))
      || voices.find(v => /en/i.test(v.lang));
    if (preferred) utt.voice = preferred;

    setSpeaking(true);
    utt.onend = () => setSpeaking(false);
    utt.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utt);
  }

  /* ---------------------------------------------------------------
     VOICE INPUT (Web Speech API)
     --------------------------------------------------------------- */
  function initVoice() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      micBtn.title = 'Voice not supported in this browser';
      micBtn.style.opacity = '.4';
      micBtn.disabled = true;
      return;
    }

    const rec = new SpeechRecognition();
    rec.lang = 'en-AU';
    rec.continuous = false;
    rec.interimResults = true;

    rec.onstart = () => {
      state.recording = true;
      micBtn.classList.add('recording');
      voiceBar.style.display = 'block';
      voiceLabel.textContent = 'Listening...';
    };

    rec.onresult = e => {
      let interim = '', final = '';
      for (const r of e.results) {
        if (r.isFinal) final += r[0].transcript;
        else           interim += r[0].transcript;
      }
      chatInput.value = final || interim;
      autoResize(chatInput);
      voiceLabel.textContent = final ? 'Got it!' : `Hearing: "${interim}"`;
    };

    rec.onend = () => {
      state.recording = false;
      micBtn.classList.remove('recording');
      voiceBar.style.display = 'none';
      voiceLabel.textContent = 'Listening...';

      const txt = chatInput.value.trim();
      if (txt) sendMessage(txt);
    };

    rec.onerror = e => {
      state.recording = false;
      micBtn.classList.remove('recording');
      voiceBar.style.display = 'none';
      if (e.error !== 'no-speech') {
        console.warn('Speech error:', e.error);
      }
    };

    state.recognition = rec;

    micBtn.addEventListener('click', () => {
      if (state.recording) {
        rec.stop();
      } else if (!state.busy) {
        try { rec.start(); } catch { /* already running */ }
      }
    });

    if (vbStop) {
      vbStop.addEventListener('click', () => { rec.stop(); });
    }
  }

  /* ---------------------------------------------------------------
     INPUT HANDLING
     --------------------------------------------------------------- */
  function autoResize(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 140) + 'px';
  }

  function initInputHandlers() {
    chatInput.addEventListener('input', () => autoResize(chatInput));

    chatInput.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage(chatInput.value);
      }
    });

    sendBtn.addEventListener('click', () => sendMessage(chatInput.value));

    clearBtn.addEventListener('click', () => {
      state.conversation = [];

      // Remove all messages except the welcome one
      const all = chatMsgs.querySelectorAll('.msg');
      all.forEach(m => {
        if (m.id !== 'msg-welcome') m.remove();
      });

      chatInput.value = '';
      autoResize(chatInput);
    });

    // Quick topic buttons
    if (quickTopics) {
      quickTopics.querySelectorAll('.qtopic').forEach(btn => {
        btn.addEventListener('click', () => {
          const msg = btn.getAttribute('data-msg');
          if (msg) sendMessage(msg);
        });
      });
    }
  }

  /* ---------------------------------------------------------------
     BOOT
     --------------------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', () => {
    initInputHandlers();
    initVoice();

    // Focus input on load
    setTimeout(() => chatInput.focus(), 300);

    // Voices can load async
    if (window.speechSynthesis) {
      window.speechSynthesis.addEventListener('voiceschanged', () => {});
    }
  });

})();
