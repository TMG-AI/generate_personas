// api/generate-personas-v2.js
// Handles both direct files AND blob URLs from large file uploads

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb', // For form data, large files use blob URLs
    },
    maxDuration: 300
  }
};

export default async function handler(req, res) {
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
    console.log('🚀 Persona generation started');
    
    const { 
      matter, 
      keywords, 
      target_description, 
      persona_count,
      mri_file_url,
      targetsmart_file_url, 
      client_file_url 
    } = req.body;
    
    console.log('📝 Form data received:', { 
      matter, 
      keywords, 
      target_description,
      fileUrls: {
        mri: mri_file_url ? 'provided' : 'none',
        targetsmart: targetsmart_file_url ? 'provided' : 'none', 
        client: client_file_url ? 'provided' : 'none'
      }
    });
    
    // Basic validation
    if (!matter || !keywords || !target_description) {
      console.log('❌ Missing required fields');
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Matter, keywords, and target description are required'
      });
    }
    
    console.log('✅ Validation passed');
    
    // Process blob URLs if provided
    const fileData = [];
    
    if (mri_file_url) {
      console.log('📁 Processing MRI file from blob URL');
      const fileContent = await downloadBlobFile(mri_file_url);
      fileData.push({ type: 'mri', content: fileContent, url: mri_file_url });
    }
    
    if (targetsmart_file_url) {
      console.log('📁 Processing TargetSmart file from blob URL');
      const fileContent = await downloadBlobFile(targetsmart_file_url);
      fileData.push({ type: 'targetsmart', content: fileContent, url: targetsmart_file_url });
    }
    
    if (client_file_url) {
      console.log('📁 Processing client file from blob URL');
      const fileContent = await downloadBlobFile(client_file_url);
      fileData.push({ type: 'client', content: fileContent, url: client_file_url });
    }
    
    console.log(`📊 Processed ${fileData.length} uploaded files`);
    
    // For testing - return success with file info
    const testPersona = {
      name: "Test Persona",
      age: "35-45",
      location: "Test Location", 
      demographics: `Demographics for ${matter} case`,
      pain_points: ["Legal concerns", "Financial stress"],
      media_consumption: ["Social media", "Local news"],
      confidence_score: 85,
      source_citations: fileData.length > 0 ? [`Data from ${fileData.length} uploaded files`] : ["Research data only"]
    };
    
    console.log('✅ Test persona created with blob file support');
    
    return res.status(200).json({
      success: true,
      message: 'API working with blob file uploads!',
      personas: [testPersona],
      formData: {
        matter,
        keywords,
        target_description,
        persona_count
      },
      fileInfo: fileData.map(f => ({
        type: f.type,
        url: f.url,
        contentLength: f.content.length
      })),
      timestamp: new Date().toISOString(),
      note: 'Large files are being processed via blob URLs - AI agents will be added back next'
    });

  } catch (error) {
    console.error('💥 Error:', error.message);
    
    return res.status(500).json({
      error: 'Processing failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

// Download and process file from blob URL
async function downloadBlobFile(blobUrl) {
  try {
    console.log('⬇️ Downloading file from blob URL:', blobUrl);
    
    const response = await fetch(blobUrl);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.status}`);
    }
    
    const content = await response.text();
    console.log(`✅ Downloaded ${content.length} characters from blob`);
    
    return content;
    
  } catch (error) {
    console.error('❌ Blob download failed:', error);
    throw new Error(`Failed to process uploaded file: ${error.message}`);
  }
}
