import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Get the directory name using ES modules approach
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define MIME types for different file extensions
const MIME_TYPES = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".gif": "image/gif",
};

/**
 * Handles HTTP requests and routes them to appropriate responses
 * @param {http.IncomingMessage} req - The HTTP request object
 * @param {http.ServerResponse} res - The HTTP response object
 */
export function handleRoutes(req, res) {
  console.log(`${req.method} ${req.url}`);

  // Handle favicon requests
  if (req.url === "/favicon.ico") {
    res.writeHead(204); // No content
    res.end();
    return;
  }

  // health check endpoint for Render
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "healthy" }));
    return;
  }

  // Determine file path based on URL
  let filePath;
  if (req.url === "/") {
    // Serve index.html for the root path
    filePath = path.join(__dirname, "views", "index.html");
  } else {
    // Remove leading slash and join with the views directory
    const requestPath = req.url.substring(1);
    filePath = path.join(__dirname, "views", requestPath);
  }

  // Get file extension to determine content type
  const extname = path.extname(filePath);
  const contentType = MIME_TYPES[extname] || "text/plain";

  // Read and serve the file
  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === "ENOENT") {
        // File not found error
        console.error(`File not found: ${filePath}`);
        res.writeHead(404);
        res.end("404 Not Found");
      } else {
        // Server error
        console.error(`Server error: ${error.code} when accessing ${filePath}`);
        res.writeHead(500);
        res.end(`Server Error: ${error.code}`);
      }
    } else {
      // Success - return the file content
      res.writeHead(200, { "Content-Type": contentType });
      res.end(content, "utf-8");
    }
  });
}
