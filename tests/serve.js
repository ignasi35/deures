const http = require("node:http");
const {createReadStream, statSync} = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const contentTypes = {
    ".css": "text/css",
    ".html": "text/html",
    ".js": "text/javascript",
    ".svg": "image/svg+xml",
};

http.createServer((request, response) => {
    const url = new URL(request.url, "http://127.0.0.1");
    const requestedPath = decodeURIComponent(url.pathname);
    const filePath = path.resolve(root, `.${requestedPath}`);

    if (!filePath.startsWith(`${root}${path.sep}`)) {
        response.writeHead(403).end("Forbidden");
        return;
    }

    const resolvedPath = path.join(filePath, "index.html");
    const target = requestedPath.endsWith("/") ? resolvedPath : filePath;
    try {
        if (!statSync(target).isFile()) {
            response.writeHead(404).end("Not found");
            return;
        }
    } catch (error) {
        if (error.code === "ENOENT" || error.code === "ENOTDIR") {
            response.writeHead(404).end("Not found");
            return;
        }
        throw error;
    }

    response.writeHead(200, {
        "Content-Type": `${contentTypes[path.extname(target)] || "application/octet-stream"}; charset=utf-8`,
    });
    createReadStream(target).pipe(response);
}).listen(4173, "127.0.0.1");
