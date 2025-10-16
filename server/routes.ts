import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertProjectSchema, 
  insertTemplateSchema, 
  insertTargetSchema, 
  insertTrainingPageSchema 
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Projects
  app.get("/api/projects", async (req, res) => {
    try {
      const projects = await storage.getProjects();
      res.json(projects);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch projects" });
    }
  });

  app.get("/api/projects/:id", async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch project" });
    }
  });

  app.post("/api/projects", async (req, res) => {
    try {
      const validated = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(validated);
      res.status(201).json(project);
    } catch (error) {
      res.status(400).json({ error: "Invalid project data" });
    }
  });

  app.patch("/api/projects/:id", async (req, res) => {
    try {
      const project = await storage.updateProject(req.params.id, req.body);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      res.status(400).json({ error: "Failed to update project" });
    }
  });

  app.delete("/api/projects/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteProject(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete project" });
    }
  });

  // Templates
  app.get("/api/templates", async (req, res) => {
    try {
      const templates = await storage.getTemplates();
      res.json(templates);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch templates" });
    }
  });

  app.get("/api/templates/:id", async (req, res) => {
    try {
      const template = await storage.getTemplate(req.params.id);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch template" });
    }
  });

  app.post("/api/templates", async (req, res) => {
    try {
      const validated = insertTemplateSchema.parse(req.body);
      const template = await storage.createTemplate(validated);
      res.status(201).json(template);
    } catch (error) {
      res.status(400).json({ error: "Invalid template data" });
    }
  });

  app.patch("/api/templates/:id", async (req, res) => {
    try {
      const template = await storage.updateTemplate(req.params.id, req.body);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      res.status(400).json({ error: "Failed to update template" });
    }
  });

  app.delete("/api/templates/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteTemplate(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Template not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete template" });
    }
  });

  // Targets
  app.get("/api/targets", async (req, res) => {
    try {
      const targets = await storage.getTargets();
      res.json(targets);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch targets" });
    }
  });

  app.get("/api/targets/:id", async (req, res) => {
    try {
      const target = await storage.getTarget(req.params.id);
      if (!target) {
        return res.status(404).json({ error: "Target not found" });
      }
      res.json(target);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch target" });
    }
  });

  app.post("/api/targets", async (req, res) => {
    try {
      const validated = insertTargetSchema.parse(req.body);
      const target = await storage.createTarget(validated);
      res.status(201).json(target);
    } catch (error) {
      res.status(400).json({ error: "Invalid target data" });
    }
  });

  app.patch("/api/targets/:id", async (req, res) => {
    try {
      const target = await storage.updateTarget(req.params.id, req.body);
      if (!target) {
        return res.status(404).json({ error: "Target not found" });
      }
      res.json(target);
    } catch (error) {
      res.status(400).json({ error: "Failed to update target" });
    }
  });

  app.delete("/api/targets/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteTarget(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Target not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete target" });
    }
  });

  // Training Pages
  app.get("/api/training-pages", async (req, res) => {
    try {
      const pages = await storage.getTrainingPages();
      res.json(pages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch training pages" });
    }
  });

  app.get("/api/training-pages/:id", async (req, res) => {
    try {
      const page = await storage.getTrainingPage(req.params.id);
      if (!page) {
        return res.status(404).json({ error: "Training page not found" });
      }
      res.json(page);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch training page" });
    }
  });

  app.post("/api/training-pages", async (req, res) => {
    try {
      const validated = insertTrainingPageSchema.parse(req.body);
      const page = await storage.createTrainingPage(validated);
      res.status(201).json(page);
    } catch (error) {
      res.status(400).json({ error: "Invalid training page data" });
    }
  });

  app.patch("/api/training-pages/:id", async (req, res) => {
    try {
      const page = await storage.updateTrainingPage(req.params.id, req.body);
      if (!page) {
        return res.status(404).json({ error: "Training page not found" });
      }
      res.json(page);
    } catch (error) {
      res.status(400).json({ error: "Failed to update training page" });
    }
  });

  app.delete("/api/training-pages/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteTrainingPage(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Training page not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete training page" });
    }
  });

  // Project Targets
  app.get("/api/projects/:projectId/targets", async (req, res) => {
    try {
      const targets = await storage.getProjectTargets(req.params.projectId);
      res.json(targets);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch project targets" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
