// api/generate-personas-v2.js (Enhanced with Detailed Debugging)

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
    maxDuration: 780 // 13 minutes for Vercel Pro
  }
};

export default async function handler(req, res) {
  const sessionId = Math.random().toString(36).substring(2, 8);
  
  // CORS headers
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
    console.log(`🚀 [${sessionId}] === PERSONA GENERATION STARTED ===`);
    console.log(`📝 [${sessionId}] REQUEST DETAILS:`);
    console.log(`   - Method: ${req.method}`);
    console.log(`   - Headers: ${JSON.stringify(req.headers, null, 2)}`);
    console.log(`   - Body keys: ${Object.keys(req.body || {}).join(', ')}`);
    
    const { 
      matter, 
      keywords, 
      target_description, 
      persona_count,
      mri_file_url,
      targetsmart_file_url, 
      client_file_url,
      complaint_file_url,
      research_file_url
    } = req.body;
    
    console.log(`📋 [${sessionId}] FORM DATA RECEIVED:`);
    console.log(`   - Matter: ${matter}`);
    console.log(`   - Keywords: ${keywords}`);
    console.log(`   - Target: ${target_description}`);
    console.log(`   - Persona count: ${persona_count}`);
    
    console.log(`📎 [${sessionId}] FILE URLS RECEIVED:`);
    console.log(`   - MRI: ${mri_file_url ? '✅ ' + mri_file_url.substring(0, 50) + '...' : '❌ none'}`);
    console.log(`   - TargetSmart: ${targetsmart_file_url ? '✅ ' + targetsmart_file_url.substring(0, 50) + '...' : '❌ none'}`);
    console.log(`   - Client: ${client_file_url ? '✅ ' + client_file_url.substring(0, 50) + '...' : '❌ none'}`);
    console.log(`   - Complaint: ${complaint_file_url ? '✅ ' + complaint_file_url.substring(0, 50) + '...' : '❌ none'}`);
    console.log(`   - Research: ${research_file_url ? '✅ ' + research_file_url.substring(0, 50) + '...' : '❌ none'}`);
    
    // Count total files
    const fileUrls = [mri_file_url, targetsmart_file_url, client_file_url, complaint_file_url, research_file_url].filter(Boolean);
    console.log(`📊 [${sessionId}] TOTAL FILES TO PROCESS: ${fileUrls.length}`);
    
    // Basic validation
    if (!matter || !keywords || !target_description) {
      console.log(`❌ [${sessionId}] VALIDATION FAILED: Missing required fields`);
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Matter, keywords, and target description are required'
      });
    }
    
    console.log(`✅ [${sessionId}] VALIDATION PASSED`);

    // STEP 1: Process uploaded files
    console.log(`📁 [${sessionId}] === STEP 1: PROCESSING UPLOADED FILES ===`);
    let uploadedData = [];
    
    if (fileUrls.length > 0) {
      try {
        console.log(`📥 [${sessionId}] Importing document agent...`);
        const { default: DocumentAgent } = await import('../lib/documentAgent.js');
        console.log(`✅ [${sessionId}] Document agent imported successfully`);
        
        // Create file objects from URLs
        const fileObjects = [];
        
        if (mri_file_url) {
          console.log(`📄 [${sessionId}] Processing MRI file: ${mri_file_url}`);
          try {
            const response = await fetch(mri_file_url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const buffer = await response.arrayBuffer();
            fileObjects.push({
              filename: 'MRI_Data.xlsx',
              mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              buffer: Buffer.from(buffer)
            });
            console.log(`✅ [${sessionId}] MRI file downloaded: ${buffer.byteLength} bytes`);
          } catch (error) {
            console.log(`❌ [${sessionId}] MRI file download failed: ${error.message}`);
          }
        }
        
        if (targetsmart_file_url) {
          console.log(`📄 [${sessionId}] Processing TargetSmart file: ${targetsmart_file_url}`);
          try {
            const response = await fetch(targetsmart_file_url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const buffer = await response.arrayBuffer();
            fileObjects.push({
              filename: 'TargetSmart_Data.xlsx',
              mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              buffer: Buffer.from(buffer)
            });
            console.log(`✅ [${sessionId}] TargetSmart file downloaded: ${buffer.byteLength} bytes`);
          } catch (error) {
            console.log(`❌ [${sessionId}] TargetSmart file download failed: ${error.message}`);
          }
        }
        
        if (client_file_url) {
          console.log(`📄 [${sessionId}] Processing Client file: ${client_file_url}`);
          try {
            const response = await fetch(client_file_url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const buffer = await response.arrayBuffer();
            fileObjects.push({
              filename: 'Client_Data.xlsx',
              mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              buffer: Buffer.from(buffer)
            });
            console.log(`✅ [${sessionId}] Client file downloaded: ${buffer.byteLength} bytes`);
          } catch (error) {
            console.log(`❌ [${sessionId}] Client file download failed: ${error.message}`);
          }
        }
        
        if (complaint_file_url) {
          console.log(`📄 [${sessionId}] Processing Complaint file: ${complaint_file_url}`);
          try {
            const response = await fetch(complaint_file_url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const buffer = await response.arrayBuffer();
            fileObjects.push({
              filename: 'Complaint.pdf',
              mimeType: 'application/pdf',
              buffer: Buffer.from(buffer)
            });
            console.log(`✅ [${sessionId}] Complaint file downloaded: ${buffer.byteLength} bytes`);
          } catch (error) {
            console.log(`❌ [${sessionId}] Complaint file download failed: ${error.message}`);
          }
        }
        
        if (research_file_url) {
          console.log(`📄 [${sessionId}] Processing Research file: ${research_file_url}`);
          try {
            const response = await fetch(research_file_url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const buffer = await response.arrayBuffer();
            fileObjects.push({
              filename: 'Research.pdf',
              mimeType: 'application/pdf',
              buffer: Buffer.from(buffer)
            });
            console.log(`✅ [${sessionId}] Research file downloaded: ${buffer.byteLength} bytes`);
          } catch (error) {
            console.log(`❌ [${sessionId}] Research file download failed: ${error.message}`);
          }
        }
        
        console.log(`📊 [${sessionId}] FILES READY FOR PROCESSING: ${fileObjects.length}`);
        
        if (fileObjects.length > 0) {
          console.log(`🔄 [${sessionId}] Calling DocumentAgent.processFiles()...`);
          uploadedData = await DocumentAgent.processFiles(fileObjects);
          console.log(`✅ [${sessionId}] Document processing complete: ${uploadedData.length} processed`);
          
          // Log each processed file
          uploadedData.forEach((data, i) => {
            console.log(`📋 [${sessionId}] File ${i+1}: ${data.filename} (${data.type}) - ${data.content?.length || 0} chars`);
            if (data.insights) {
              console.log(`   📊 Insights: ${Object.keys(data.insights).join(', ')}`);
            }
          });
        } else {
          console.log(`⚠️ [${sessionId}] No files could be downloaded for processing`);
        }
        
      } catch (error) {
        console.log(`❌ [${sessionId}] Document processing error: ${error.message}`);
        console.log(`🔍 [${sessionId}] Error stack: ${error.stack}`);
      }
    } else {
      console.log(`ℹ️ [${sessionId}] No files uploaded - proceeding with research data only`);
    }

    // STEP 2: Research
    console.log(`🔬 [${sessionId}] === STEP 2: CONDUCTING RESEARCH ===`);
    let researchData = {};
    
    try {
      console.log(`📥 [${sessionId}] Importing research agent...`);
      const { default: ResearchAgent } = await import('../lib/researchAgent.js');
      console.log(`✅ [${sessionId}] Research agent imported successfully`);
      
      console.log(`🔍 [${sessionId}] Starting research for: ${matter} | ${keywords}`);
      researchData = await ResearchAgent.gatherInsights(matter, keywords, target_description);
      
      console.log(`✅ [${sessionId}] Research completed`);
      console.log(`📊 [${sessionId}] Research categories: ${Object.keys(researchData).join(', ')}`);
      
      // Log research data size
      Object.keys(researchData).forEach(key => {
        const data = researchData[key];
        if (Array.isArray(data)) {
          console.log(`   - ${key}: ${data.length} items`);
        } else if (typeof data === 'object' && data !== null) {
          console.log(`   - ${key}: object with ${Object.keys(data).length} keys`);
        } else {
          console.log(`   - ${key}: ${typeof data}`);
        }
      });
      
    } catch (error) {
      console.log(`❌ [${sessionId}] Research failed: ${error.message}`);
      console.log(`🔍 [${sessionId}] Error stack: ${error.stack}`);
      throw error;
    }

    // STEP 3: Generate Personas
    console.log(`🎭 [${sessionId}] === STEP 3: GENERATING PERSONAS ===`);
    
    try {
      console.log(`📥 [${sessionId}] Importing persona agent...`);
      const { default: PersonaAgent } = await import('../lib/personaAgent.js');
      console.log(`✅ [${sessionId}] Persona agent imported successfully`);
      
      console.log(`🔄 [${sessionId}] Calling PersonaAgent.generatePersonas()...`);
      console.log(`📊 [${sessionId}] Input data summary:`);
      console.log(`   - Research data: ${Object.keys(researchData).length} categories`);
      console.log(`   - Uploaded data: ${uploadedData.length} files`);
      console.log(`   - Persona count: ${persona_count}`);
      
      const personaResult = await PersonaAgent.generatePersonas(
        matter, keywords, target_description, researchData, uploadedData, [], parseInt(persona_count) || 5
      );

      if (!personaResult.success) {
        console.log(`❌ [${sessionId}] Persona generation failed: ${personaResult.error}`);
        console.log(`📋 [${sessionId}] Failure details: ${personaResult.message}`);
        return res.status(422).json(personaResult);
      }

      const personas = personaResult.personas;
      console.log(`✅ [${sessionId}] Persona generation successful: ${personas.length} personas created`);
      
      // Log each persona
      personas.forEach((persona, i) => {
        console.log(`🎭 [${sessionId}] Persona ${i+1}: ${persona.name} (age ${persona.age}) - confidence: ${persona.confidence_score}`);
      });

      console.log(`🎉 [${sessionId}] === WORKFLOW COMPLETED SUCCESSFULLY ===`);
      
      return res.status(200).json({
        success: true,
        sessionId: sessionId,
        personas: personas,
        dataAnalysis: {
          totalDataPoints: personaResult.sourceDataCount,
          confidence: personaResult.confidence,
          filesProcessed: uploadedData.length,
          researchCategories: Object.keys(researchData),
          hasMediaInsights: personaResult.hasMediaInsights
        },
        processingTime: new Date().toISOString()
      });

    } catch (error) {
      console.log(`❌ [${sessionId}] Persona generation error: ${error.message}`);
      console.log(`🔍 [${sessionId}] Error stack: ${error.stack}`);
      throw error;
    }

  } catch (error) {
    console.error(`💥 [${sessionId}] FATAL ERROR: ${error.message}`);
    console.error(`📍 [${sessionId}] Stack trace: ${error.stack}`);
    
    return res.status(500).json({
      error: 'PROCESSING_FAILED',
      message: error.message,
      sessionId: sessionId,
      timestamp: new Date().toISOString()
    });
  }
}
