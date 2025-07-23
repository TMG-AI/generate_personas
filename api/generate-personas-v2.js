// api/generate-personas-v2.js
// Clean version without complex imports

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
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
    
    // For now, let's just test the basic functionality
    const { matter, keywords, target_description, persona_count } = req.body;
    
    console.log('📝 Form data received:', { matter, keywords, target_description });
    
    // Basic validation
    if (!matter || !keywords || !target_description) {
      console.log('❌ Missing required fields');
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Matter, keywords, and target description are required'
      });
    }
    
    console.log('✅ Validation passed');
    
    // For testing - return a simple success response
    // We'll add the AI agents back step by step once this works
    const testPersona = {
      name: "Test Persona",
      age: "35-45",
      location: "Test Location", 
      demographics: `Demographics for ${matter} case`,
      pain_points: ["Legal concerns", "Financial stress"],
      media_consumption: ["Social media", "Local news"],
      confidence_score: 85,
      source_citations: ["Test data source"]
    };
    
    console.log('✅ Test persona created');
    
    return res.status(200).json({
      success: true,
      message: 'Basic API functionality working!',
      personas: [testPersona],
      matter: matter,
      keywords: keywords,
      timestamp: new Date().toISOString(),
      note: 'This is a test response - AI agents will be added back step by step'
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
