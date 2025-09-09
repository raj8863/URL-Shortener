// Import required modules
import { readFile } from 'fs/promises';   // for reading files asynchronously
import { createServer } from 'http';      // to create an HTTP server
import path from 'path';                  // to safely join file paths
import crypto from 'crypto';              // for generating random short codes
import { writeFile } from 'fs/promises';  // ✅ use promise-based writeFile

const DATA_FILE = path.join("data", "links.json");

// Reusable function to serve files
const serverFile = async (res, filePath, contentType) => { 
    try {
        const data = await readFile(filePath); // read file
        res.writeHead(200, { 'Content-Type': contentType }); // set header
        res.end(data); // send file content
    } catch (error) {
        res.writeHead(404, { 'Content-Type': contentType }); // if file not found
        res.end('404 Not Found');
    }
};

const savelinks = async (links) => {
    await writeFile(DATA_FILE, JSON.stringify(links)); // ✅ save JSON
};

// Load links from JSON file
const loadlinks = async () => {
    try {
        const data = await readFile(DATA_FILE, "utf-8");   // ✅ correct path variable
        return JSON.parse(data);
    } catch (error) {
        if (error.code === "ENOENT") {
            await writeFile(DATA_FILE, JSON.stringify({})); // ✅ init empty file
            return {}; // ✅ return empty object if file doesn’t exist
        }
        throw error;
    }
};

// Create the HTTP server
const server = createServer(async (req, res) => {
    // Handle GET requests
    if (req.method === "GET") {
        if (req.url === "/") {
            return serverFile(res, path.join("public", "index.html"), "text/html");
        } 
        else if (req.url === "/style.css") {
            return serverFile(res, path.join("public", "style.css"), "text/css");
        }
        else if (req.url === "/links") {
            const links = await loadlinks();
            res.writeHead(200, { "Content-Type": "application/json" });
            return res.end(JSON.stringify(links));
        }
    }

    // Handle POST /shorten
    if (req.method === "POST" && req.url === "/shorten") {
        const links = await loadlinks();

        let body = ""; // ✅ use let, not const
        req.on("data", (chunk) => {
            body += chunk;
        });

        req.on("end", async () => {
            console.log(body);
            const { url, shortCode } = JSON.parse(body);

            if (!url) {
                res.writeHead(400, { "Content-Type": "text/plain" });
                return res.end("Bad Request: URL is required");
            }

            const finalShortCode = shortCode || crypto.randomBytes(3).toString("hex");

            if (links[finalShortCode]) {
                res.writeHead(400, { "Content-Type": "text/plain" });
                return res.end("Short code already in use. Please choose another one.");
            }

            // Save new short link
            links[finalShortCode] = url;
            await savelinks(links);

            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: true, shortCode: finalShortCode }));
        });
    }
});

// Start the server on port 3000
server.listen(3000, () => {
    console.log('✅ Server is running on http://localhost:3000');
});
