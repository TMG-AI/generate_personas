// lib/sheetsService.js - Vercel Serverless Compatible
import { google } from 'googleapis';

/**
 * Store personas in Google Sheets
 */
export async function storePersonas(personas, campaignData) {
  try {
    const sheets = await initializeSheets();
    const timestamp = new Date().toISOString();
    const rows = [];

    // Prepare rows for each persona
    for (const persona of personas) {
      rows.push([
        persona.name,
        persona.age,
        `${persona.gender || 'N/A'}, ${persona.location || 'N/A'}`,
        persona.bio,
        Array.isArray(persona.motivations) ? persona.motivations.join('; ') : persona.motivations,
        Array.isArray(persona.barriers) ? persona.barriers.join('; ') : persona.barriers,
        persona.communication_style,
        persona.example_quote,
        timestamp,
        campaignData.matter,
        JSON.stringify(persona.personality || {}),
        'ready_for_testing',
        campaignData.session_id,
        persona.confidence_score || 0,
        JSON.stringify(persona.source_citations || {}),
        persona.validation?.quality_score || 0
      ]);
    }

    // Append to Google Sheets
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
      range: 'Sheet1!A:P',
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: rows
      }
    });

    console.log(`Stored ${personas.length} personas in Google Sheets`);
    
    return {
      success: true,
      rows_added: rows.length,
      sheet_url: `https://docs.google.com/spreadsheets/d/${process.env.GOOGLE_SHEETS_ID}`,
      updated_range: response.data.updates.updatedRange
    };

  } catch (error) {
    console.error('Failed to store personas in Google Sheets:', error);
    throw error;
  }
}

/**
 * Get persona by name from Google Sheets
 */
export async function getPersonaByName(name) {
  try {
    const sheets = await initializeSheets();
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
      range: 'Sheet1!A:P'
    });

    const rows = response.data.values || [];
    
    if (rows.length <= 1) {
      throw new Error(`Persona not found: ${name}`);
    }

    // Find persona by name
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      
      if (row[0] && row[0].toLowerCase() === name.toLowerCase()) {
        return {
          name: row[0],
          age: parseInt(row[1]),
          demographics: row[2],
          bio: row[3],
          motivations: row[4] ? row[4].split('; ') : [],
          barriers: row[5] ? row[5].split('; ') : [],
          communication_style: row[6],
          example_quote: row[7],
          created_date: row[8],
          case_type: row[9],
          personality: safeJsonParse(row[10]),
          status: row[11],
          run_id: row[12],
          confidence_score: parseFloat(row[13]) || 0,
          source_citations: safeJsonParse(row[14]),
          validation_score: parseFloat(row[15]) || 0
        };
      }
    }

    throw new Error(`Persona not found: ${name}`);

  } catch (error) {
    console.error('Failed to get persona:', error);
    throw error;
  }
}

/**
 * Get all personas from Google Sheets
 */
export async function getAllPersonas() {
  try {
    const sheets = await initializeSheets();
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
      range: 'Sheet1!A:P'
    });

    const rows = response.data.values || [];
    
    if (rows.length <= 1) {
      return [];
    }

    const personas = [];
    
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      
      try {
        const persona = {
          name: row[0],
          age: parseInt(row[1]),
          demographics: row[2],
          bio: row[3],
          motivations: row[4] ? row[4].split('; ') : [],
          barriers: row[5] ? row[5].split('; ') : [],
          communication_style: row[6],
          example_quote: row[7],
          created_date: row[8],
          case_type: row[9],
          personality: safeJsonParse(row[10]),
          status: row[11],
          run_id: row[12],
          confidence_score: parseFloat(row[13]) || 0,
          source_citations: safeJsonParse(row[14]),
          validation_score: parseFloat(row[15]) || 0
        };

        personas.push(persona);

      } catch (parseError) {
        console.warn(`Failed to parse persona row ${i + 1}:`, parseError);
      }
    }

    console.log(`Retrieved ${personas.length} personas from Google Sheets`);
    return personas;

  } catch (error) {
    console.error('Failed to get personas from Google Sheets:', error);
    throw error;
  }
}

/**
 * Initialize Google Sheets API
 */
async function initializeSheets() {
  try {
    // For Vercel, credentials should be in environment variables
    const credentials = {
      type: 'service_account',
      project_id: process.env.GOOGLE_PROJECT_ID,
      private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      client_id: process.env.GOOGLE_CLIENT_ID,
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.GOOGLE_CLIENT_EMAIL}`
    };

    const auth = new google.auth.GoogleAuth({
      credentials: credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const sheets = google.sheets({ version: 'v4', auth });
    
    return sheets;

  } catch (error) {
    console.error('Failed to initialize Google Sheets API:', error);
    throw error;
  }
}

/**
 * Helper function to safely parse JSON
 */
function safeJsonParse(jsonString) {
  try {
    return jsonString ? JSON.parse(jsonString) : {};
  } catch (error) {
    return {};
  }
}
