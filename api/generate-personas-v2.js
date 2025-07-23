// api/generate-personas-v2.js (Enhanced Error Handling & Logging)

import Busboy from 'busboy';
import { v4 as uuidv4 } from 'uuid';

export const config = {
  api: {
    bodyParser: false,
    maxDuration: 300 // 5 minutes for complex processing
  }
};

export default async function handler(req, res) {
  const sessionId = uuidv4().substring(0, 8);
  console.log(`🚀 [${sessionId}] Multi-AI Persona Generation Started`);
  
  // Enhanced CORS
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
    // Step 1: Parse Form Data
    console.log(`📝 [${sessionId}] Step 1: Parsing form data...`);
    const formData = await parseMultipartForm(req);
    
    const { matter, keywords, target_description, persona_count } = formData.fields;
    const uploadedFiles = formData.files;

    console.log(`✅ [${sessionId}] Form parsed: ${uploadedFiles.length} files, matter: ${matter}`);

    // Step 2: Validate Required Data
    console.log(`🔍 [${sessionId}] Step 2: Validating inputs...`);
    if (!matter || !keywords || !target_description) {
      console.log(`❌ [${sessionId}] Missing required fields`);
      return res.status(400).json({
        error: 'MISSING_REQUIRED_FIELDS',
        message: 'Matter, keywords, and target description are required'
      });
    }

    // Step 3: Process Documents
    console.log(`📄 [${sessionId}] Step 3: Processing ${uploadedFiles.length} documents...`);
    let uploadedData = [];
    
    if (uploadedFiles.length > 0) {
      const { default: DocumentAgent } = await import('../lib/documentAgent.js');
      uploadedData = await DocumentAgent.processFiles(uploadedFiles);
      console.log(`✅ [${sessionId}] Documents processed: ${uploadedData.length} chunks extracted`);
    } else {
      console.log(`⚠️ [${sessionId}] No files uploaded - will rely on research data only`);
    }

    // Step 4: Research External Data
    console.log(`🔬 [${sessionId}] Step 4: Gathering research data...`);
    const { default: ResearchAgent } = await import('../lib/researchAgent.js');
    const researchData = await ResearchAgent.gatherInsights(matter, keywords, target_description);
    
    if (!researchData || Object.keys(researchData).length === 0) {
      console.log(`❌ [${sessionId}] Research failed - no external data gathered`);
      return res.status(500).json({
        error: 'RESEARCH_FAILED',
        message: 'Unable to gather sufficient research data for persona generation'
      });
    }
    
    console.log(`✅ [${sessionId}] Research completed: ${Object.keys(researchData).length} data categories`);

    // Step 5: Generate Evidence-Based Personas
    console.log(`🎭 [${sessionId}] Step 5: Generating evidence-based personas...`);
    const { default: PersonaAgent } = await import('../lib/personaAgent.js');
    const personaResult = await PersonaAgent.generatePersonas(
      matter, keywords, target_description, researchData, uploadedData, parseInt(persona_count) || 5
    );

    // Check if persona generation failed due to insufficient data
    if (!personaResult.success) {
      console.log(`❌ [${sessionId}] Persona generation failed: ${personaResult.error}`);
      return res.status(422).json({
        error: personaResult.error,
        message: personaResult.message,
        recommendations: personaResult.recommendations,
        dataAnalysis: {
          dataPointsFound: personaResult.dataPointCount,
          minimumRequired: personaResult.minimumRequired,
          researchCategories: Object.keys(researchData),
          uploadedFiles: uploadedFiles.length
        }
      });
    }

    const personas = personaResult.personas;
    console.log(`✅ [${sessionId}] Generated ${personas.length} valid personas`);

    // Step 6: Validation (Optional but Recommended)
    console.log(`✔️ [${sessionId}] Step 6: Validating persona quality...`);
    try {
      const { default: ValidationAgent } = await import('../lib/validationAgent.js');
      const validation = await ValidationAgent.validatePersonas(personas, researchData, uploadedData);
      console.log(`✅ [${sessionId}] Validation complete: ${validation.validPersonas} valid, ${validation.flaggedPersonas} flagged`);
    } catch (validationError) {
      console.log(`⚠️ [${sessionId}] Validation failed but continuing: ${validationError.message}`);
    }

    // Step 7: Store in Google Sheets
    console.log(`📊 [${sessionId}] Step 7: Storing personas in Google Sheets...`);
    try {
      const { default: SheetsService } = await import('../lib/sheetsService.js');
      await SheetsService.storePersonas(personas, matter, sessionId);
      console.log(`✅ [${sessionId}] Personas stored in Google Sheets`);
    } catch (sheetsError) {
      console.log(`⚠️ [${sessionId}] Google Sheets storage failed: ${sheetsError.message}`);
    }

    // Step 8: Generate Report
    console.log(`📋 [${sessionId}] Step 8: Generating final report...`);
    const { default: ReportAgent } = await import('../lib/reportAgent.js');
    const report = await ReportAgent.generateReport(personas, matter, researchData, sessionId);
    
    console.log(`🎉 [${sessionId}] Multi-AI Persona Generation COMPLETED SUCCESSFULLY`);
    console.log(`📊 [${sessionId}] Results: ${personas.length} personas, confidence: ${personaResult.confidence.toFixed(1)}%`);

    // Return Success Response
    return res.status(200).json({
      success: true,
      sessionId: sessionId,
      personas: personas,
      report: report,
      dataAnalysis: {
        totalDataPoints: personaResult.sourceDataCount,
        confidence: personaResult.confidence,
        researchCategories: Object.keys(researchData),
        uploadedFiles: uploadedFiles.length,
        validationPassed: true
      },
      processingTime: new Date().toISOString()
    });

  } catch (error) {
    console.error(`💥 [${sessionId}] FATAL ERROR:`, error.message);
    console.error(`📍 [${sessionId}] Stack trace:`, error.stack);
    
    return res.status(500).json({
      error: 'PROCESSING_FAILED',
      message: 'An unexpected error occurred during persona generation',
      sessionId: sessionId,
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
}

async function parseMultipartForm(req) {
  return new Promise((resolve, reject) => {
    const busboy = Busboy({ headers: req.headers });
    const fields = {};
    const files = [];

    busboy.on('field', (fieldname, value) => {
      fields[fieldname] = value;
    });

    busboy.on('file', (fieldname, file, { filename, mimeType }) => {
      const chunks = [];
      file.on('data', chunk => chunks.push(chunk));
      file.on('end', () => {
        files.push({
          fieldname,
          filename,
          mimeType,
          buffer: Buffer.concat(chunks)
        });
      });
    });

    busboy.on('finish', () => {
      resolve({ fields, files });
    });

    busboy.on('error', reject);
    req.pipe(busboy);
  });
}
