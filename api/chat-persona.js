// ========================
// api/chat-persona.js
// ========================
import fetch from 'node-fetch';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
    maxDuration: 60,
  },
};

export default async function handler(req, res) {
  console.log('💬 Persona Chat API called - Method:', req.method);
  
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { persona_name, message, persona_attributes } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    console.log('💬 Chat request received');

    // REPLACE WITH YOUR ACTUAL N8N CHAT WEBHOOK URL
    const chatPersonaWebhookUrl = process.env.N8N_CHAT_PERSONA_WEBHOOK || 'https://your-n8n-instance.com/webhook/chat-with-persona';

    // Prepare the payload for n8n
    const payload = {
      message: message.trim(),
      timestamp: new Date().toISOString()
    };

    // If persona_attributes provided (custom persona), include them
    if (persona_attributes && persona_attributes.trim()) {
      payload.persona_attributes = persona_attributes.trim();
      payload.chat_type = 'custom_persona';
    }

    // If persona_name provided (existing persona), include it
    if (persona_name && persona_name.trim()) {
      payload.persona_name = persona_name.trim();
      payload.chat_type = 'existing_persona';
    }

    if (!payload.persona_attributes && !payload.persona_name) {
      return res.status(400).json({ 
        error: 'Either persona_name or persona_attributes is required' 
      });
    }

    console.log('🌐 Sending chat request to n8n webhook...');

    // Send request to n8n chat workflow
    const chatResponse = await fetch(chatPersonaWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      timeout: 30000 // 30 second timeout
    });

    if (!chatResponse.ok) {
      const errorText = await chatResponse.text();
      console.error('❌ N8N chat webhook failed:', chatResponse.status, errorText);
      throw new Error(`N8N chat webhook failed: ${chatResponse.status} - ${errorText}`);
    }

    const chatData = await chatResponse.json();
    console.log('✅ Chat response received from n8n');

    // Return the response from n8n
    return res.status(200).json({
      success: true,
      persona_name: chatData.persona_name || 'AI Persona',
      persona_response: chatData.persona_response || chatData.response || 'I understand your question, but I need more time to think about it.',
      timestamp: new Date().toISOString(),
      chat_type: payload.chat_type
    });

  } catch (error) {
    console.error('💥 Chat error:', error.message);
    
    // Return a graceful error response
    return res.status(500).json({ 
      success: false,
      error: 'Chat temporarily unavailable',
      message: 'I apologize, but I\'m having trouble responding right now. Please try again in a moment.',
      timestamp: new Date().toISOString()
    });
  }
}
