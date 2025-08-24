import { createServer } from "./createServer.js";
import { logger } from "./utils/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
// import { WebSocketServerTransport } from "@modelcontextprotocol/sdk/server/ws.js"; // Example for WebSocket
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseManager } from "./db/DatabaseManager.js";
import { ProjectRepository } from "./repositories/ProjectRepository.js";
import { TaskRepository } from "./repositories/TaskRepository.js";
import { WorkQueueRepository } from "./repositories/WorkQueueRepository.js";
import { ProjectService, TaskService, WorkQueueService } from "./services/index.js";

const main = async () => {
    try {
        const server = createServer();
        logger.info("Starting MCP server");

        // Choose your transport
        const transport = new StdioServerTransport();
        // const transport = new WebSocketServerTransport({ port: 8080 }); // Example

        logger.info("Connecting transport", { transport: transport.constructor.name });
        await server.connect(transport);

        logger.info("MCP Server connected and listening");

        // --- UI Server Setup ---
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);

        // Instantiate services for API endpoints
        const dbManager = DatabaseManager.getInstance();
        const db = dbManager.getDb();
        const projectRepository = new ProjectRepository(db);
        const taskRepository = new TaskRepository(db);
        const projectService = new ProjectService(db, projectRepository, taskRepository);
        const taskService = new TaskService(db, taskRepository, projectRepository);
        const workQueueRepository = new WorkQueueRepository(db);
        const workQueueService = new WorkQueueService(workQueueRepository, projectRepository);

        const httpServer = http.createServer(async (req, res) => {
            try {
                if (!req.url) {
                    res.statusCode = 400;
                    res.end();
                    return;
                }

                // API: Get project with tasks
                if (req.method === "GET" && req.url === "/api/projects") {
                    const projects = await projectService.listProjects();
                    res.setHeader("Content-Type", "application/json");
                    res.end(JSON.stringify({ projects }));
                    return;
                }

                if (req.method === "GET" && req.url.startsWith("/api/projects/")) {
                    const projectId = decodeURIComponent(req.url.split("/").pop() || "");
                    const project = await projectService.getProjectById(projectId);
                    if (!project) {
                        res.statusCode = 404;
                        res.setHeader("Content-Type", "application/json");
                        res.end(JSON.stringify({ error: "Project not found" }));
                        return;
                    }
                    const tasks = await taskService.listTasks({ project_id: projectId, include_subtasks: true });
                    res.setHeader("Content-Type", "application/json");
                    res.end(JSON.stringify({ project, tasks }));
                    return;
                }

                // API: Work queue - list items for a project
                if (req.method === "GET" && req.url.startsWith("/api/work-queue/")) {
                    const projectId = decodeURIComponent(req.url.split("/").pop() || "");
                    const queue = await workQueueService.list(projectId);
                    res.setHeader("Content-Type", "application/json");
                    res.end(JSON.stringify({ queue }));
                    return;
                }

                // API: Work queue - clear items for a project
                if (req.method === "DELETE" && req.url.startsWith("/api/work-queue/")) {
                    const projectId = decodeURIComponent(req.url.split("/").pop() || "");
                    let body = "";
                    req.on("data", chunk => {
                        body += chunk;
                    });
                    req.on("end", async () => {
                        try {
                            const data = JSON.parse(body || "{}");
                            const ids: string[] = Array.isArray(data.queue_ids) ? data.queue_ids : [];
                            await workQueueService.clear(projectId, ids);
                            res.statusCode = 204;
                            res.end();
                        } catch (err) {
                            res.statusCode = 400;
                            res.setHeader("Content-Type", "application/json");
                            res.end(JSON.stringify({ error: (err as Error).message }));
                        }
                    });
                    return;
                }

                // API: Update task details
                if (req.method === "POST" && req.url.startsWith("/api/tasks/")) {
                    const taskId = decodeURIComponent(req.url.split("/").pop() || "");
                    let body = "";
                    req.on("data", chunk => {
                        body += chunk;
                    });
                    req.on("end", async () => {
                        try {
                            const data = JSON.parse(body || "{}");
                            const { project_id, description, context, paused } = data;
                            const updated = await taskService.updateTask({
                                project_id,
                                task_id: taskId,
                                description,
                                context,
                                paused,
                            });
                            res.setHeader("Content-Type", "application/json");
                            res.end(JSON.stringify(updated));
                        } catch (err) {
                            res.statusCode = 400;
                            res.setHeader("Content-Type", "application/json");
                            res.end(JSON.stringify({ error: (err as Error).message }));
                        }
                    });
                    return;
                }

                // Static file serving
                const filePath = path.join(
                    __dirname,
                    "../public",
                    req.url === "/" ? "index.html" : req.url
                );
                fs.readFile(filePath, (err, content) => {
                    if (err) {
                        res.statusCode = 404;
                        res.end("Not Found");
                        return;
                    }
                    const ext = path.extname(filePath);
                    const contentType =
                        ext === ".html"
                            ? "text/html"
                            : ext === ".js"
                                ? "text/javascript"
                                : ext === ".css"
                                    ? "text/css"
                                    : "text/plain";
                    res.setHeader("Content-Type", contentType);
                    res.end(content);
                });
            } catch (err) {
                res.statusCode = 500;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ error: "Internal Server Error" }));
            }
        });

        const port = Number(process.env.UI_PORT) || 3000;
        httpServer.listen(port, () => {
            logger.info(`UI available at http://localhost:${port}`);
        });
    } catch (error) {
        logger.error("Failed to start server", error);
        process.exit(1); // Exit if server fails to start
    }
};

main();

