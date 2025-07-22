import { handleUpload } from "@vercel/blob/client";

export async function POST(request) {
  return handleUpload({
    request,
    onBeforeGenerateToken: async () => ({
      allowedContentTypes: ["*/*"],
      maximumSizeInBytes: 5 * 1024 ** 3, // 5GB
      validUntil: Date.now() + 1000 * 60 * 10, // 10 min
    }),
  });
}
