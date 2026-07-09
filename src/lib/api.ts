// Ensure API URL is properly configured with security checks
const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || "";

if (!rawApiUrl) {
  console.warn("NEXT_PUBLIC_API_URL environment variable not set. Using default.");
}

// Validate that the API URL is a valid HTTP(S) URL to prevent SSRF
let API_BASE_URL = "";
try {
  const parsedUrl = new URL(rawApiUrl);
  if (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') {
    API_BASE_URL = rawApiUrl;
  } else {
    console.warn("Invalid protocol for API URL, using empty string");
  }
} catch (e) {
  console.warn("Invalid API URL format, using empty string");
}

export default API_BASE_URL;
