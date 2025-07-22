"use client";
import { useRef, useState } from "react";

export default function Home() {
  const fileInputRef = useRef();
  const [status, setStatus] = useState("");

  async function handleUpload(e) {
    e.preventDefault();
    setStatus("Uploading...");
    const file = fileInputRef.current.files[0];
    if (!file) {
      setStatus("No file selected!");
      return;
    }
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      setStatus("Upload failed.");
      return;
    }
    const { url } = await res.json();
    setStatus("✅ Uploaded! Blob URL: " + url);
  }

  return (
    <form onSubmit={handleUpload}>
      <input type="file" ref={fileInputRef} />
      <button type="submit">Upload File</button>
      <div>{status}</div>
    </form>
  );
}
