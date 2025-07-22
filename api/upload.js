import { handleUpload } from "@vercel/blob/client";

export default async function handler(req, res) {
  if (req.method === "POST") {
    return handleUpload({
      request: req,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ["image/*", "application/pdf", "video/*"],
        maximumSizeInBytes: 5 * 1024 ** 3, // 5 GB
        validUntil: Date.now() + 1000 * 60 * 10, // 10 min
      }),
      onUploadCompleted: async ({ blob }) => {
        console.log("✅ Upload complete:", blob.url);
      },
    });
  }
  res.status(405).send("Method not allowed");
}
