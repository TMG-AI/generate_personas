// ========================
// api/generate-personas.js
// ========================
import Busboy from 'busboy';
import FormData from 'form-data';
import fetch from 'node-fetch';

export const config = {
  api: {
    bodyParser: false,
    maxDuration: 800, // 13+ minutes for persona generation
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
        fileSize: 50 * 1024 * 1024, // Increased to 50MB
        files: 13, // up to 13 files (3 data files + 10 images)
      }
    });
    
    const files = {};
    const fields = {};

    // Handle file uploads
    busboy.on('file', (fieldname, file, info) => {
      console.log('📄 File detected:', fieldname, info.filename, info.mimeType);
      
      const chunks = [];
      
      file.on('data', (chunk) => {
        chunks.push(chunk);
      });
      
      file.on('end', () => {
        const buffer = Buffer.concat(chunks);
        files[fieldname] = {
          buffer: buffer,
          filename: info.filename || `${fieldname}.csv`,
          contentType: info.mimeType || 'text/csv',
          size: buffer.length
        };
        console.log('✅ File collected:', fieldname, files[fieldname].filename, `${files[fieldname].size} bytes`);
      });
    });

    // Handle form fields
    busboy.on('field', (fieldname, value) => {
      fields[fieldname] = value;
      console.log('📝 Field collected:', fieldname, typeof value === 'string' ? value.substring(0, 50) + '...' : value);
    });

    // Handle completion
    const uploadPromise = new Promise((resolve, reject) => {
      busboy.on('finish', () => {
        console.log('✅ Busboy finished processing');
        resolve();
      });
      
      busboy.on('error', (err) => {
        console.error('❌ Busboy error:', err);
        reject(err);
      });
      
      // Timeout after 60 seconds
      setTimeout(() => {
        reject(new Error('Upload timeout'));
      }, 60000);
    });

    // Pipe the request to busboy
    req.pipe(busboy);
    
    // Wait for upload to complete
    await uploadPromise;

    console.log('📦 Creating FormData for n8n webhook...');
    console.log('📊 Form fields:', Object.keys(fields));
    console.log('📁 Files received:', Object.keys(files));
    
    // Create form data to send to n8n webhook
    const formData = new FormData();
    
    // Add all form fields first
    Object.keys(fields).forEach(key => {
      formData.append(key, fields[key]);
      console.log(`📝 Added field: ${key}`);
    });
    
    // Add all files with proper options
    Object.keys(files).forEach(fieldname => {
      const file = files[fieldname];
      formData.append(fieldname, file.buffer, {
        filename: file.filename,
        contentType: file.contentType,
        knownLength: file.size
      });
      console.log(`📁 Added file: ${fieldname} (${file.filename}, ${file.size} bytes)`);
    });

    // REPLACE WITH YOUR ACTUAL N8N WEBHOOK URL
    const generatePersonasWebhookUrl = process.env.N8N_GENERATE_PERSONAS_WEBHOOK || 'https://your-n8n-instance.com/webhook/focus-group-trigger';
    
    console.log('🌐 Sending to n8n webhook:', generatePersonasWebhookUrl);

    const webhookResponse = await fetch(generatePersonasWebhookUrl, {
      method: 'POST',
      body: formData,
      headers: {
        ...formData.getHeaders(),
      },
      timeout: 120000 // 2 minute timeout
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

    // Get the response from n8n
    const responseText = await webhookResponse.text();
    console.log('📥 N8N response received, length:', responseText.length);

    // N8N might return JSON or just a success message
    let responseData;
    try {
      responseData = JSON.parse(responseText);
      console.log('✅ JSON parsed successfully');
    } catch (parseError) {
      // If not JSON, treat as success message
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
      files_processed: Object.keys(files).length,
      fields_processed: Object.keys(fields).length,
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
