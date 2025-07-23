// api/upload.js
import { handleUpload } from "@vercel/blob/client";

export default async function handler(req, res) {
  // Add CORS headers for your frontend
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === "POST") {
    try {
      console.log("📤 Blob upload request received");
      
      return await handleUpload({
        request: req,
        onBeforeGenerateToken: async () => {
          console.log("🔐 Generating upload token");
          return {
            allowedContentTypes: [
              "image/*", 
              "application/pdf", 
              "video/*",
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // Excel
              "application/vnd.ms-excel", // Excel legacy
              "text/csv",
              "application/json",
              "text/plain",
              "application/msword",
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document" // Word
            ],
            maximumSizeInBytes: 5 * 1024 ** 3, // 5 GB - good for large datasets
            validUntil: Date.now() + 1000 * 60 * 10, // 10 min
          };
        },
        onUploadCompleted: async ({ blob }) => {
          console.log("✅ Upload complete:", blob.url);
          console.log("📊 File size:", blob.size, "bytes");
        },
      });
    } catch (error) {
      console.error("💥 Upload error:", error);
      return res.status(500).json({ 
        error: "Upload failed", 
        message: error.message 
      });
    }
  }
  
  res.status(405).json({ error: "Method not allowed" });
}
