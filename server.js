/* ============================================================
   TECH IN TOWN — Express Server
   API Proxy: Claude AI + ElevenLabs TTS + SendGrid Email
   ============================================================ */

'use strict';

const express  = require('express');
const cors     = require('cors');
const path     = require('path');
require('dotenv').config();

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Request logger — shows exactly what the browser asks for
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`${req.method} ${req.url} → ${res.statusCode} (${res.getHeader('content-type') || '-'}) ${Date.now() - start}ms`);
  });
  next();
});

app.use(express.static(path.join(__dirname)));

// ── MAX'S SYSTEM PROMPT ──────────────────────────────────────────────────────
const MAX_SYSTEM_PROMPT = `You are Max Sullivan, a Senior IT Support Technician with over 35 years of hands-on experience across virtually every technology platform and application ever made. You work for Tech In Town — an IT support service specialising in apartment living on the Gold Coast, Queensland, Australia, based in Surfers Paradise.

YOUR CAREER BACKGROUND (35+ years):
- Late 1980s: Started in IT with DOS, early IBM PCs, basic networking
- Early 1990s: Windows 3.1, Windows for Workgroups, Novell NetWare, early internet dial-up
- Mid 1990s: Windows 95/98, early broadband, network administration, small business IT
- Early 2000s: Windows XP era, Wi-Fi 802.11b/g, SMB IT support, early smartphones
- 2010s: NBN rollout (Australia), mesh Wi-Fi, 4K TVs, smart speakers, Wi-Fi 6
- Now: Windows 11, macOS Sonoma, Wi-Fi 6E, Matter smart home protocol, AI tools

TECHNICAL EXPERTISE:
- Operating Systems: DOS through Windows 11, all macOS versions, Linux (Ubuntu/Fedora/Debian), iOS, Android, ChromeOS
- Networking: All router brands, Wi-Fi standards (802.11a through Wi-Fi 6E), mesh systems (Google Nest, Eero, Orbi, Velop, TP-Link Deco), NBN types (FTTN/FTTB/FTTP/HFC/Fixed Wireless), VPNs, DNS, DHCP, network security
- Hardware: PCs, laptops (all brands), tablets, printers (all brands), TVs (Samsung, LG, Sony, TCL), soundbars, streaming devices (Chromecast, Apple TV, Fire Stick, Foxtel), gaming consoles (PlayStation, Xbox, Nintendo Switch), smart home devices
- Software: Microsoft Office/365, Adobe Suite, Google Workspace, Zoom, Teams, cloud services (OneDrive, Google Drive, iCloud, Dropbox)
- Security: Virus/malware removal, phishing, password management, 2FA, data backup and recovery
- Audio Visual: TV wall mounting, HDMI troubleshooting, soundbar setup, Dolby Atmos, 4K/HDR, screen mirroring, home theatre

YOUR PERSONALITY:
- Warm, patient, and genuinely caring — you love helping people
- Calm and unflappable after 35 years — nothing phases you
- Never condescending — always clear explanations without jargon
- Occasionally natural Australian expressions: "no worries", "she'll be right", "fair enough", "good on ya"
- Sometimes reference your experience: "I've been dealing with this since the Windows XP days"
- Celebrate wins: "That's the one!", "Beauty, we got it!"

DIAGNOSTIC APPROACH:
- Ask ONE clarifying question at a time — never rapid-fire multiple questions
- Start with the simplest possible solution first
- Confirm each step worked before moving to the next
- Acknowledge frustration before diving in

VOICE RESPONSE STYLE (CRITICAL):
- Speak naturally for voice output — NO bullet points, NO markdown, NO numbered lists
- Keep each response to 2-4 natural spoken sentences maximum
- Give ONE instruction at a time
- Use conversational transitions: "Right then...", "Let's try...", "Good one..."
- If an issue is beyond remote help, offer to book an in-person Tech In Town visit

Only help with IT-related topics. You are on the Tech In Town website as a voice assistant.`;

// ── CLAUDE API PROXY ──────────────────────────────────────────────────────────
app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid messages format' });
    }

    // Trim conversation to last 20 messages to manage context
    const recentMessages = messages.slice(-20);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 400,
        system: MAX_SYSTEM_PROMPT,
        messages: recentMessages,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Claude API error:', response.status, errText);
      return res.status(502).json({ error: 'AI service unavailable' });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '';
    res.json({ text });

  } catch (err) {
    console.error('Chat endpoint error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── ELEVENLABS TTS PROXY ──────────────────────────────────────────────────────
app.post('/api/tts', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'No text provided' });
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: 'ElevenLabs not configured' });
    }

    // Voice ID: 'pNInz6obpgDQGcFmaJgB' = Adam (warm, professional male)
    // Alternative: 'TxGEqnHWrfWFTfGW9XjX' = Josh
    const voiceId = process.env.ELEVENLABS_VOICE_ID || 'pNInz6obpgDQGcFmaJgB';

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_turbo_v2_5',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.3,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error('ElevenLabs error:', response.status, err);
      return res.status(502).json({ error: 'TTS service unavailable' });
    }

    const audioBuffer = await response.arrayBuffer();
    res.set('Content-Type', 'audio/mpeg');
    res.set('Cache-Control', 'no-store');
    res.send(Buffer.from(audioBuffer));

  } catch (err) {
    console.error('TTS endpoint error:', err);
    res.status(500).json({ error: 'TTS internal error' });
  }
});

// ── CONTACT / BOOKING FORM HANDLER ────────────────────────────────────────────
app.post('/api/contact', async (req, res) => {
  try {
    const {
      firstName, lastName, email, phone,
      service, address, message, urgency, moveDate, type
    } = req.body;

    if (!email || !firstName) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    // ── Option 1: SendGrid (preferred) ────────────────────────────────────
    if (process.env.SENDGRID_API_KEY) {
      await sendViaSendGrid({
        firstName, lastName, email, phone,
        service, address, message, urgency, moveDate, type
      });

    // ── Option 2: Nodemailer / SMTP fallback ──────────────────────────────
    } else if (process.env.SMTP_HOST) {
      await sendViaNodemailer({
        firstName, lastName, email, phone,
        service, address, message, urgency, moveDate, type
      });

    } else {
      // Log submission if no email service configured
      console.log('📬 New booking/contact submission:', {
        name: `${firstName} ${lastName}`,
        email, phone, service, urgency,
        message: message?.substring(0, 100)
      });
    }

    res.json({ success: true, message: 'Booking request received!' });

  } catch (err) {
    console.error('Contact endpoint error:', err);
    // Still return success to client — we logged it
    res.json({ success: true, message: 'Request received!' });
  }
});

// ── SENDGRID HELPER ───────────────────────────────────────────────────────────
async function sendViaSendGrid(data) {
  const { firstName, lastName, email, phone, service, address, message, urgency, moveDate } = data;

  const toEmail = process.env.CONTACT_EMAIL || 'hello@techintown.com.au';

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #03045E; padding: 24px; border-radius: 12px 12px 0 0;">
        <h1 style="color: #00B4D8; margin: 0; font-size: 24px;">⚡ New Tech In Town Booking</h1>
      </div>
      <div style="background: #f8f9fa; padding: 24px; border-radius: 0 0 12px 12px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; color: #666; width: 140px;">Name</td><td style="padding: 8px 0; font-weight: bold;">${firstName} ${lastName}</td></tr>
          <tr><td style="padding: 8px 0; color: #666;">Email</td><td style="padding: 8px 0;"><a href="mailto:${email}">${email}</a></td></tr>
          <tr><td style="padding: 8px 0; color: #666;">Phone</td><td style="padding: 8px 0;">${phone || 'Not provided'}</td></tr>
          <tr><td style="padding: 8px 0; color: #666;">Service</td><td style="padding: 8px 0; font-weight: bold; color: #0096C7;">${service}</td></tr>
          <tr><td style="padding: 8px 0; color: #666;">Urgency</td><td style="padding: 8px 0;">${urgency || 'Flexible'}</td></tr>
          ${moveDate ? `<tr><td style="padding: 8px 0; color: #666;">Move Date</td><td style="padding: 8px 0;">${moveDate}</td></tr>` : ''}
          <tr><td style="padding: 8px 0; color: #666;">Address</td><td style="padding: 8px 0;">${address || 'Not provided'}</td></tr>
          <tr><td style="padding: 8px 0; color: #666; vertical-align: top;">Message</td><td style="padding: 8px 0;">${message || 'No message provided'}</td></tr>
        </table>
        <div style="margin-top: 20px; padding: 16px; background: #00B4D8; border-radius: 8px; color: white;">
          <strong>Reply within 30 minutes to: <a href="mailto:${email}" style="color: white;">${email}</a></strong>
        </div>
      </div>
    </div>
  `;

  const payload = {
    personalizations: [{ to: [{ email: toEmail }] }],
    from: { email: 'noreply@techintown.com.au', name: 'Tech In Town' },
    reply_to: { email, name: `${firstName} ${lastName}` },
    subject: `🔧 New Booking: ${service} — ${urgency || 'Flexible'} — ${firstName} ${lastName}`,
    content: [{ type: 'text/html', value: htmlBody }],
  };

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok && response.status !== 202) {
    const err = await response.text();
    throw new Error(`SendGrid error: ${response.status} ${err}`);
  }
}

// ── NODEMAILER HELPER ─────────────────────────────────────────────────────────
async function sendViaNodemailer(data) {
  // Dynamic import to avoid crash if nodemailer not installed
  const nodemailer = require('nodemailer');
  const { firstName, lastName, email, phone, service, address, message, urgency, moveDate } = data;

  const transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from:    `"Tech In Town" <${process.env.SMTP_USER}>`,
    to:      process.env.CONTACT_EMAIL || 'hello@techintown.com.au',
    replyTo: email,
    subject: `New Booking: ${service} — ${firstName} ${lastName}`,
    text: `
Name: ${firstName} ${lastName}
Email: ${email}
Phone: ${phone || 'N/A'}
Service: ${service}
Urgency: ${urgency || 'Flexible'}
Move Date: ${moveDate || 'N/A'}
Address: ${address || 'N/A'}
Message: ${message || 'N/A'}
    `.trim(),
  });
}

// ── HEALTH CHECK ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    services: {
      claude:      !!process.env.ANTHROPIC_API_KEY,
      elevenlabs:  !!process.env.ELEVENLABS_API_KEY,
      sendgrid:    !!process.env.SENDGRID_API_KEY,
      smtp:        !!process.env.SMTP_HOST,
    },
    timestamp: new Date().toISOString(),
  });
});

// ── CATCH-ALL: SERVE INDEX.HTML ───────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ── START (local dev only — Vercel uses the exported app) ─────────────────────
if (require.main === module) {
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════╗
║  ⚡ Tech In Town Server Running              ║
║  http://localhost:${PORT}                      ║
╠══════════════════════════════════════════════╣
║  Claude AI:     ${process.env.ANTHROPIC_API_KEY    ? '✅ Connected' : '⚠️  Missing ANTHROPIC_API_KEY'}
║  ElevenLabs:    ${process.env.ELEVENLABS_API_KEY   ? '✅ Connected' : '⚠️  Missing (using Web Speech)'}
║  SendGrid:      ${process.env.SENDGRID_API_KEY     ? '✅ Connected' : '⚠️  Missing (email disabled)'}
╚══════════════════════════════════════════════╝
  `.trim());
});
}

module.exports = app;
