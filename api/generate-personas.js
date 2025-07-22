// ========================
// api/generate-personas.js
// ========================
import Busboy from 'busboy';
import FormData from 'form-data';
import fetch from 'node-fetch';

export const config = {
  api: {
    bodyParser: false,
    maxDuration: 800,
  },
};

export default async function handler(req, res) {
  console.log('🚀 Persona Generation API called - Method:', req.method);
  
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    console.log('✅ OPTIONS handled');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    console.log('❌ Wrong method:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('📋 Setting up busboy for persona generation...');
    
    const busboy = Busboy({ 
      headers: req.headers,
      limits: {
        fileSize: 50 * 1024 * 1024,
        files: 13,
      }
    });
    
    const files = {};
    const fields = {};

    // Handle file uploads
    busboy.on('file', (fieldname, file, info) => {
      console.log('📄 File detected:', fieldname, info.filename);
      
      const chunks = [];
      
      file.on('data', (chunk) => {
        chunks.push(chunk);
      });
      
      file.on('end', () => {
        files[fieldname] = {
          buffer: Buffer.concat(chunks),
          filename: info.filename || `${fieldname}.csv`,
          contentType: info.mimeType || 'text/csv'
        };
        console.log('✅ File collected:', fieldname, files[fieldname].filename);
      });
    });

    // Handle form fields
    busboy.on('field', (fieldname, value) => {
      fields[fieldname] = value;
      console.log('📝 Field collected:', fieldname);
    });

    // Handle completion
    const uploadPromise = new Promise((resolve, reject) => {
      busboy.on('finish', () => {
        console.log('✅ Busboy finished');
        resolve();
      });
      
      busboy.on('error', (err) => {
        console.error('❌ Busboy error:', err);
        reject(err);
      });
      
      setTimeout(() => {
        reject(new Error('Upload timeout'));
      }, 60000);
    });

    req.pipe(busboy);
    await uploadPromise;

    console.log('📦 Creating FormData for n8n webhook...');
    
    const formData = new FormData();
    
    Object.keys(fields).forEach(key => {
      formData.append(key, fields[key]);
    });
    
    Object.keys(files).forEach(fieldname => {
      const file = files[fieldname];
      formData.append(fieldname, file.buffer, {
        filename: file.filename,
        contentType: file.contentType
      });
    });

    console.log('🌐 Sending to n8n webhook...');
    console.log('📊 Form fields:', Object.keys(fields));
    console.log('📁 Files:', Object.keys(files));

    const generatePersonasWebhookUrl = process.env.N8N_GENERATE_PERSONAS_WEBHOOK || 'https://your-n8n-instance.com/webhook/focus-group-trigger';
    
    const webhookResponse = await fetch(generatePersonasWebhookUrl, {
      method: 'POST',
      body: formData,
      headers: {
        ...formData.getHeaders(),
      },
    });

    console.log('📊 N8N Webhook response:', webhookResponse.status, webhookResponse.statusText);

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();
      console.error('❌ N8N Webhook failed:', webhookResponse.status, errorText);
      return res.status(500).json({ 
        error: 'Persona generation failed', 
        details: errorText,
        status: webhookResponse.status 
      });
    }

    const responseText = await webhookResponse.text();
    console.log('📥 N8N response received, length:', responseText.length);

    let responseData;
    try {
      responseData = JSON.parse(responseText);
      console.log('✅ JSON parsed successfully');
    } catch (parseError) {
      responseData = { 
        success: true, 
        message: responseText || 'Persona generation started successfully' 
      };
      console.log('✅ Non-JSON response treated as success');
    }

    console.log('✅ Success! Persona generation initiated');
    
    return res.status(200).json({
      success: true,
      message: 'Digital twins generation started successfully! You will receive the report via email.',
      data: responseData
    });

  } catch (error) {
    console.error('💥 Caught error:', error.message);
    console.error('💥 Error stack:', error.stack);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    });
  }
}
