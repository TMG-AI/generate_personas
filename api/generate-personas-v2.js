// api/generate-personas-v2.js (With Status Updates)
// This version sends status updates back to the user

import Busboy from 'busboy';
import { v4 as uuidv4 } from 'uuid';

export const config = {
  api: {
    bodyParser: false,
    maxDuration: 300
  }
};

export default async function handler(req, res) {
  const sessionId = uuidv4().substring(0, 8);
  
  // Set up Server-Sent Events for real-time updates
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  // Helper function to send status updates
  const sendStatus = (status, message, data = {}) => {
    const statusUpdate = {
      sessionId,
      status,
      message,
      timestamp: new Date().toISOString(),
      ...data
    };
    
    // Log for debugging
    console.log(`[${sessionId}] ${status}: ${message}`);
    
    // Send to client (if not already ended)
    if (!res.headersSent) {
      try {
        res.write(`STATUS: ${JSON.stringify(statusUpdate)}\n`);
      } catch (e) {
        console.error('Failed to write status:', e);
      }
    }
  };

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    sendStatus('error', 'Method not allowed');
    return res.status(405).end();
  }

  try {
    sendStatus('started', 'Multi-AI persona generation initiated');

    // Step 1: Parse Form Data
    sendStatus('processing', 'Parsing form data...');
    const formData = await parseMultipartForm(req);
    
    const { matter, keywords, target_description, persona_count } = formData.fields;
    const uploadedFiles = formData.files;

    sendStatus('success', `Form parsed: ${uploadedFiles.length} files uploaded`, {
      matter: matter?.substring(0, 50),
      fileCount: uploadedFiles.length
    });

    // Step 2: Validate Required Data
    sendStatus('processing', 'Validating required fields...');
    if (!matter || !keywords || !target_description) {
      sendStatus('error', 'Missing required fields: matter, keywords, or target description');
      return res.status(400).end();
    }
    sendStatus('success', 'All required fields validated');

    // Step 3: Process Documents
    sendStatus('processing', `Processing ${uploadedFiles.length} documents...`);
    let uploadedData = [];
    
    if (uploadedFiles.length > 0) {
      try {
        const { default: DocumentAgent } = await import('../lib/documentAgent.js');
        uploadedData = await DocumentAgent.processFiles(uploadedFiles);
        sendStatus('success', `Documents processed: ${uploadedData.length} chunks extracted`);
      } catch (docError) {
        sendStatus('warning', `Document processing failed: ${docError.message}`);
        uploadedData = [];
      }
    } else {
      sendStatus('info', 'No files uploaded - proceeding with research data only');
    }

    // Step 4: Research External Data
    sendStatus('processing', 'Gathering external research data...');
    let researchData = {};
    
    try {
      const { default: ResearchAgent } = await import('../lib/researchAgent.js');
      researchData = await ResearchAgent.gatherInsights(matter, keywords, target_description);
      
      const dataCategories = Object.keys(researchData).length;
      if (dataCategories === 0) {
        throw new Error('No research data gathered');
      }
      
      sendStatus('success', `Research completed: ${dataCategories} data categories found`);
    } catch (researchError) {
      sendStatus('error', `Research failed: ${researchError.message}`);
      return res.status(500).end();
    }

    // Step 5: Validate Data Sufficiency
    sendStatus('processing', 'Validating data sufficiency for persona generation...');
    const totalData = uploadedData.length + Object.keys(researchData).length;
    
    if (totalData < 3) {
      sendStatus('error', `Insufficient data: only ${totalData} sources found, need minimum 3`, {
        uploadedChunks: uploadedData.length,
        researchCategories: Object.keys(researchData).length,
        recommendations: [
          'Upload more demographic or survey files',
          'Provide more specific target description',
          'Try different keywords for better research results'
        ]
      });
      return res.status(422).end();
    }

    sendStatus('success', `Data validation passed: ${totalData} data sources available`);

    // Step 6: Generate Personas
    sendStatus('processing', 'Generating evidence-based personas...');
    let personas = [];
    
    try {
      const { default: PersonaAgent } = await import('../lib/personaAgent.js');
      const personaResult = await PersonaAgent.generatePersonas(
        matter, keywords, target_description, researchData, uploadedData, parseInt(persona_count) || 5
      );

      if (!personaResult.success) {
        sendStatus('error', personaResult.message, {
          error: personaResult.error,
          recommendations: personaResult.recommendations
        });
        return res.status(422).end();
      }

      personas = personaResult.personas;
      sendStatus('success', `Generated ${personas.length} evidence-based personas`, {
        personaCount: personas.length,
        confidence: personaResult.confidence
      });

    } catch (personaError) {
      sendStatus('error', `Persona generation failed: ${personaError.message}`);
      return res.status(500).end();
    }

    // Step 7: Store Results
    sendStatus('processing', 'Storing personas in Google Sheets...');
    try {
      const { default: SheetsService } = await import('../lib/sheetsService.js');
      await SheetsService.storePersonas(personas, matter, sessionId);
      sendStatus('success', 'Personas stored in Google Sheets successfully');
    } catch (sheetsError) {
      sendStatus('warning', `Google Sheets storage failed: ${sheetsError.message}`);
    }

    // Final Success
    sendStatus('completed', 'Multi-AI persona generation completed successfully!', {
      personas: personas.map(p => ({
        name: p.name,
        age: p.age,
        confidence: p.confidence_score
      })),
      sessionId: sessionId,
      totalProcessingTime: 'Complete'
    });

    return res.status(200).end();

  } catch (error) {
    sendStatus('error', `Fatal error: ${error.message}`, {
      stack: error.stack?.substring(0, 500)
    });
    return res.status(500).end();
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
