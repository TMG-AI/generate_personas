// ========================
// api/generate-personas-v2.js
// ========================
import Busboy from 'busboy';
import { v4 as uuidv4 } from 'uuid';

// Import your AI agents (we'll need to adapt these for Vercel)
import { processFiles } from '../lib/documentAgent.js';
import { conductResearch } from '../lib/researchAgent.js';
import { generatePersonas } from '../lib/personaAgent.js';
import { validatePersonas } from '../lib/validationAgent.js';
import { storePersonas } from '../lib/sheetsService.js';
import { generateReport } from '../lib/reportAgent.js';

export const config = {
  api: {
    bodyParser: false,
    maxDuration: 800, // 13+ minutes for persona generation
  },
};

export default async function handler(req, res) {
  console.log('🚀 Multi-AI Persona Generation API called - Method:', req.method);
  
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

  const sessionId = uuidv4();
  console.log('🔑 Session ID:', sessionId);

  try {
    console.log('📋 Setting up busboy for persona generation...');
    
    const busboy = Busboy({ 
      headers: req.headers,
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit per file
        files: 13, // up to 13 files (3 data files + 10 images)
      }
    });
    
    const files = {};
    const fields = {};

    // Handle file uploads (keep your existing logic)
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
          contentType: info.mimeType || 'text/csv',
          path: `/tmp/${fieldname}-${Date.now()}`, // Vercel temp path
        };
        console.log('✅ File collected:', fieldname, files[fieldname].filename);
      });
    });

    // Handle form fields (keep your existing logic)
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
      
      // Timeout after 60 seconds
      setTimeout(() => {
        reject(new Error('Upload timeout'));
      }, 60000);
    });

    // Pipe the request to busboy
    req.pipe(busboy);
    
    // Wait for upload to complete
    await uploadPromise;

    // ====================================
    // NEW: Multi-AI Processing Pipeline
    // ====================================
    
    console.log('🤖 Starting Multi-AI Processing Pipeline...');

    // Extract campaign data
    const campaignData = {
      matter: fields.matter,
      keywords: fields.keywords,
      target_description: fields.target_description,
      persona_count: parseInt(fields.persona_count || '10'),
      email: fields.email,
      session_id: sessionId
    };

    // Validate required fields
    if (!campaignData.matter || !campaignData.keywords || !campaignData.target_description) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['matter', 'keywords', 'target_description']
      });
    }

    console.log('📊 Campaign Data:', campaignData);

    // Send immediate response
    res.status(202).json({
      success: true,
      message: 'Multi-AI persona generation started! Processing with 7 specialized agents.',
      session_id: sessionId,
      estimated_time: '3-5 minutes',
      pipeline: [
        'Document Processing Agent',
        'Research Agent (Perplexity)',
        'RAG Vector Search',
        'Persona Generation Agent (Claude)',
        'Validation Agent (GPT-4)', 
        'Google Sheets Storage',
        'Report Generation'
      ]
    });

    // Continue processing in background
    processPersonaGeneration(campaignData, files, sessionId);

  } catch (error) {
    console.error('💥 Setup error:', error.message);
    console.error('💥 Error stack:', error.stack);
    return res.status(500).json({ 
      error: 'Setup failed',
      message: error.message,
      session_id: sessionId
    });
  }
}

/**
 * Background processing function with all 7 AI agents
 */
async function processPersonaGeneration(campaignData, files, sessionId) {
  const startTime = Date.now();
  console.log(`🔄 [${sessionId}] Background processing started`);

  try {
    // Step 1: Document Processing Agent
    console.log(`📄 [${sessionId}] Step 1: Processing uploaded files`);
    const uploadedData = await processFiles(files);
    console.log(`✅ [${sessionId}] Document processing complete`);

    // Step 2: Research Agent (Perplexity)
    console.log(`🔍 [${sessionId}] Step 2: Conducting external research`);
    const researchData = await conductResearch(
      campaignData.matter,
      campaignData.keywords, 
      campaignData.target_description
    );
    console.log(`✅ [${sessionId}] Research complete`);

    // Step 3: Persona Generation Agent (Claude with RAG)
    console.log(`🧠 [${sessionId}] Step 3: Generating personas with Claude + RAG`);
    const personaResult = await generatePersonas(
      campaignData,
      uploadedData,
      researchData
    );
    console.log(`✅ [${sessionId}] Generated ${personaResult.personas.length} personas`);

    // Step 4: Validation Agent (GPT-4)
    console.log(`✔️ [${sessionId}] Step 4: Validating with GPT-4`);
    const validation = await validatePersonas(
      personaResult.personas,
      uploadedData,
      researchData
    );
    console.log(`✅ [${sessionId}] Validation complete: ${validation.validated.length} validated`);

    // Step 5: Google Sheets Storage
    console.log(`📊 [${sessionId}] Step 5: Storing in Google Sheets`);
    const storageResult = await storePersonas(
      validation.validated,
      campaignData
    );
    console.log(`✅ [${sessionId}] Stored in Google Sheets`);

    // Step 6: Report Generation
    console.log(`📋 [${sessionId}] Step 6: Generating HTML report`);
    const report = await generateReport({
      personas: validation.validated,
      campaign_data: campaignData,
      research_data: researchData,
      validation_details: validation,
      session_id: sessionId
    });
    console.log(`✅ [${sessionId}] Report generated`);

    // Step 7: Email Report (if email provided)
    if (campaignData.email) {
      console.log(`📧 [${sessionId}] Step 7: Emailing report`);
      try {
        await emailReport(campaignData.email, report, campaignData);
        console.log(`✅ [${sessionId}] Report emailed successfully`);
      } catch (emailError) {
        console.error(`❌ [${sessionId}] Email failed:`, emailError.message);
      }
    }

    const processingTime = Date.now() - startTime;
    console.log(`🎉 [${sessionId}] Processing complete in ${processingTime}ms`);

    // Store results for status checking
    await storeSessionResults(sessionId, {
      success: true,
      personas: validation.validated,
      report: report,
      processing_time: processingTime,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`💥 [${sessionId}] Processing failed:`, error.message);

    // Store error results
    await storeSessionResults(sessionId, {
      success: false,
      error: error.message,
      processing_time: processingTime,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Store session results (implement based on your preferred storage)
 */
async function storeSessionResults(sessionId, results) {
  // You can implement this to store in a database, file system, or just log
  console.log(`💾 [${sessionId}] Results stored:`, {
    success: results.success,
    personas: results.personas?.length || 0,
    error: results.error || null
  });
}
