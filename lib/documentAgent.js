// lib/documentAgent.js - Vercel Serverless Compatible
import fs from 'fs';
import path from 'path';

/**
 * Process uploaded files for Vercel environment
 */
export async function processFiles(files) {
  const results = {
    mri_data: null,
    targetsmart_data: null,
    client_data: null,
    processing_errors: []
  };

  try {
    for (const [fieldName, file] of Object.entries(files)) {
      if (!file || !file.buffer) continue;

      console.log(`Processing file: ${file.filename} (${fieldName})`);

      try {
        const extractedData = await extractFileData(file);
        const dataType = categorizeData(fieldName, extractedData);
        
        // Store in appropriate category
        if (fieldName.includes('mri') || dataType === 'mri') {
          results.mri_data = extractedData;
        } else if (fieldName.includes('targetsmart') || dataType === 'targetsmart') {
          results.targetsmart_data = extractedData;
        } else if (fieldName.includes('client') || dataType === 'client') {
          results.client_data = extractedData;
        }

      } catch (error) {
        console.error(`Error processing file ${file.filename}:`, error);
        results.processing_errors.push({
          file: file.filename,
          error: error.message
        });
      }
    }

    return results;
  } catch (error) {
    console.error('Document processing failed:', error);
    throw error;
  }
}

/**
 * Extract data from different file types (simplified for Vercel)
 */
async function extractFileData(file) {
  const ext = path.extname(file.filename).toLowerCase().slice(1);
  
  switch (ext) {
    case 'csv':
      return await extractCSV(file);
    case 'xlsx':
    case 'xls':
      return await extractExcel(file);
    default:
      return {
        type: 'text',
        text: file.buffer.toString('utf8'),
        chunks: chunkText(file.buffer.toString('utf8'))
      };
  }
}

/**
 * Extract data from CSV files
 */
async function extractCSV(file) {
  try {
    const csvText = file.buffer.toString('utf8');
    const lines = csvText.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      return { type: 'csv', data: [], headers: [], rowCount: 0 };
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      if (values.length === headers.length) {
        const row = {};
        headers.forEach((header, index) => {
          row[header] = values[index];
        });
        data.push(row);
      }
    }

    return {
      type: 'csv',
      data: data,
      headers: headers,
      rowCount: data.length,
      summary: analyzeCSVData(data)
    };
  } catch (error) {
    console.error('CSV extraction failed:', error);
    throw new Error(`Failed to extract CSV: ${error.message}`);
  }
}

/**
 * Extract data from Excel files (basic implementation)
 */
async function extractExcel(file) {
  // For Vercel, we'll treat Excel as CSV for simplicity
  // In production, you'd use xlsx library
  try {
    return {
      type: 'excel',
      text: `Excel file: ${file.filename}`,
      summary: { 
        message: 'Excel file detected - contains structured data',
        filename: file.filename,
        size: file.buffer.length
      }
    };
  } catch (error) {
    console.error('Excel extraction failed:', error);
    throw new Error(`Failed to extract Excel: ${error.message}`);
  }
}

/**
 * Analyze CSV data for insights
 */
function analyzeCSVData(data) {
  if (!data || data.length === 0) return {};

  const summary = {
    totalRows: data.length,
    columns: Object.keys(data[0] || {}),
    demographics: {},
    patterns: []
  };

  // Analyze demographic patterns
  const demographicFields = ['age', 'gender', 'income', 'location', 'education'];
  
  for (const field of demographicFields) {
    const matchingCols = summary.columns.filter(col => 
      col.toLowerCase().includes(field)
    );
    
    if (matchingCols.length > 0) {
      summary.demographics[field] = analyzeColumn(data, matchingCols[0]);
    }
  }

  return summary;
}

/**
 * Analyze a specific column for patterns
 */
function analyzeColumn(data, columnName) {
  const values = data.map(row => row[columnName]).filter(val => val != null);
  const unique = [...new Set(values)];
  
  return {
    totalValues: values.length,
    uniqueValues: unique.length,
    topValues: getTopValues(values),
    dataType: inferDataType(values)
  };
}

/**
 * Get most common values in array
 */
function getTopValues(values, limit = 10) {
  const counts = {};
  values.forEach(val => {
    counts[val] = (counts[val] || 0) + 1;
  });

  return Object.entries(counts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, limit)
    .map(([value, count]) => ({ value, count }));
}

/**
 * Infer data type of column values
 */
function inferDataType(values) {
  if (values.length === 0) return 'unknown';
  
  const sample = values.slice(0, 100);
  let numbers = 0;
  let dates = 0;
  let text = 0;

  sample.forEach(val => {
    if (!isNaN(val) && !isNaN(parseFloat(val))) {
      numbers++;
    } else if (Date.parse(val)) {
      dates++;
    } else {
      text++;
    }
  });

  if (numbers > sample.length * 0.8) return 'numeric';
  if (dates > sample.length * 0.5) return 'date';
  return 'text';
}

/**
 * Categorize data based on field name and content
 */
function categorizeData(fieldName, data) {
  const name = fieldName.toLowerCase();
  
  if (name.includes('mri') || name.includes('market')) return 'mri';
  if (name.includes('targetsmart') || name.includes('target')) return 'targetsmart';
  if (name.includes('client') || name.includes('claimant')) return 'client';
  
  return 'general';
}

/**
 * Chunk text for processing
 */
function chunkText(text, chunkSize = 1000, overlap = 200) {
  if (!text || text.length === 0) return [];
  
  const chunks = [];
  let start = 0;
  
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    const chunk = text.slice(start, end);
    
    // Try to break at sentence boundaries
    if (end < text.length) {
      const lastSentence = chunk.lastIndexOf('.');
      if (lastSentence > start + chunkSize * 0.5) {
        chunks.push(text.slice(start, lastSentence + 1));
        start = lastSentence + 1 - overlap;
      } else {
        chunks.push(chunk);
        start = end - overlap;
      }
    } else {
      chunks.push(chunk);
      break;
    }
  }
  
  return chunks.filter(chunk => chunk.trim().length > 0);
}
