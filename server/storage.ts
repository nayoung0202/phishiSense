import { 
  type User, 
  type InsertUser,
  type Project,
  type InsertProject,
  type Template,
  type InsertTemplate,
  type Target,
  type InsertTarget,
  type TrainingPage,
  type InsertTrainingPage,
  type ProjectTarget,
  type InsertProjectTarget
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Projects
  getProjects(): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, project: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: string): Promise<boolean>;
  
  // Templates
  getTemplates(): Promise<Template[]>;
  getTemplate(id: string): Promise<Template | undefined>;
  createTemplate(template: InsertTemplate): Promise<Template>;
  updateTemplate(id: string, template: Partial<InsertTemplate>): Promise<Template | undefined>;
  deleteTemplate(id: string): Promise<boolean>;
  
  // Targets
  getTargets(): Promise<Target[]>;
  getTarget(id: string): Promise<Target | undefined>;
  createTarget(target: InsertTarget): Promise<Target>;
  updateTarget(id: string, target: Partial<InsertTarget>): Promise<Target | undefined>;
  deleteTarget(id: string): Promise<boolean>;
  
  // Training Pages
  getTrainingPages(): Promise<TrainingPage[]>;
  getTrainingPage(id: string): Promise<TrainingPage | undefined>;
  createTrainingPage(page: InsertTrainingPage): Promise<TrainingPage>;
  updateTrainingPage(id: string, page: Partial<InsertTrainingPage>): Promise<TrainingPage | undefined>;
  deleteTrainingPage(id: string): Promise<boolean>;
  
  // Project Targets
  getProjectTargets(projectId: string): Promise<ProjectTarget[]>;
  createProjectTarget(projectTarget: InsertProjectTarget): Promise<ProjectTarget>;
  updateProjectTarget(id: string, projectTarget: Partial<InsertProjectTarget>): Promise<ProjectTarget | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private projects: Map<string, Project>;
  private templates: Map<string, Template>;
  private targets: Map<string, Target>;
  private trainingPages: Map<string, TrainingPage>;
  private projectTargets: Map<string, ProjectTarget>;

  constructor() {
    this.users = new Map();
    this.projects = new Map();
    this.templates = new Map();
    this.targets = new Map();
    this.trainingPages = new Map();
    this.projectTargets = new Map();
    
    this.seedData();
  }

  private seedData() {
    // Seed templates
    const template1: Template = {
      id: randomUUID(),
      name: "배송 알림 템플릿",
      subject: "[긴급] 배송 주소 확인 필요",
      body: "<p>고객님의 주문 건에 대한 배송지 주소 확인이 필요합니다...</p>",
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    };
    const template2: Template = {
      id: randomUUID(),
      name: "계정 보안 알림",
      subject: "보안 위협 감지 - 즉시 확인 요망",
      body: "<p>귀하의 계정에서 이상 로그인 시도가 감지되었습니다...</p>",
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    };
    this.templates.set(template1.id, template1);
    this.templates.set(template2.id, template2);
    
    // Seed projects
    const project1: Project = {
      id: randomUUID(),
      name: "2024 Q1 전직원 피싱 훈련",
      description: "2024년 1분기 전 직원 대상 피싱 보안 훈련",
      templateId: template1.id,
      trainingPageId: null,
      startDate: new Date('2024-01-15'),
      endDate: new Date('2024-01-31'),
      status: "완료",
      targetCount: 1200,
      openCount: 816,
      clickCount: 276,
      submitCount: 48,
      createdAt: new Date('2024-01-10'),
    };
    const project2: Project = {
      id: randomUUID(),
      name: "신입사원 대상 보안 교육",
      description: "2024년 신입사원 보안 인식 향상 훈련",
      templateId: template2.id,
      trainingPageId: null,
      startDate: new Date('2024-02-01'),
      endDate: new Date('2024-02-28'),
      status: "진행중",
      targetCount: 45,
      openCount: 20,
      clickCount: 5,
      submitCount: 2,
      createdAt: new Date('2024-01-25'),
    };
    this.projects.set(project1.id, project1);
    this.projects.set(project2.id, project2);
    
    // Seed targets
    for (let i = 1; i <= 10; i++) {
      const target: Target = {
        id: randomUUID(),
        name: `직원${i}`,
        email: `employee${i}@company.com`,
        department: i <= 5 ? "영업부" : "개발부",
        tags: i % 2 === 0 ? ["신입", "교육필요"] : ["경력"],
        status: "active",
        createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
      };
      this.targets.set(target.id, target);
    }
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Projects
  async getProjects(): Promise<Project[]> {
    return Array.from(this.projects.values()).sort((a, b) => 
      b.createdAt!.getTime() - a.createdAt!.getTime()
    );
  }

  async getProject(id: string): Promise<Project | undefined> {
    return this.projects.get(id);
  }

  async createProject(project: InsertProject): Promise<Project> {
    const id = randomUUID();
    const newProject: Project = { 
      id,
      name: project.name,
      description: project.description ?? null,
      templateId: project.templateId ?? null,
      trainingPageId: project.trainingPageId ?? null,
      startDate: project.startDate,
      endDate: project.endDate,
      status: project.status,
      targetCount: project.targetCount ?? null,
      openCount: project.openCount ?? null,
      clickCount: project.clickCount ?? null,
      submitCount: project.submitCount ?? null,
      createdAt: new Date(),
    };
    this.projects.set(id, newProject);
    return newProject;
  }

  async updateProject(id: string, project: Partial<InsertProject>): Promise<Project | undefined> {
    const existing = this.projects.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...project };
    this.projects.set(id, updated);
    return updated;
  }

  async deleteProject(id: string): Promise<boolean> {
    return this.projects.delete(id);
  }

  // Templates
  async getTemplates(): Promise<Template[]> {
    return Array.from(this.templates.values()).sort((a, b) => 
      b.updatedAt!.getTime() - a.updatedAt!.getTime()
    );
  }

  async getTemplate(id: string): Promise<Template | undefined> {
    return this.templates.get(id);
  }

  async createTemplate(template: InsertTemplate): Promise<Template> {
    const id = randomUUID();
    const now = new Date();
    const newTemplate: Template = { 
      ...template, 
      id, 
      createdAt: now,
      updatedAt: now
    };
    this.templates.set(id, newTemplate);
    return newTemplate;
  }

  async updateTemplate(id: string, template: Partial<InsertTemplate>): Promise<Template | undefined> {
    const existing = this.templates.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...template, updatedAt: new Date() };
    this.templates.set(id, updated);
    return updated;
  }

  async deleteTemplate(id: string): Promise<boolean> {
    return this.templates.delete(id);
  }

  // Targets
  async getTargets(): Promise<Target[]> {
    return Array.from(this.targets.values()).sort((a, b) => 
      b.createdAt!.getTime() - a.createdAt!.getTime()
    );
  }

  async getTarget(id: string): Promise<Target | undefined> {
    return this.targets.get(id);
  }

  async createTarget(target: InsertTarget): Promise<Target> {
    const id = randomUUID();
    const newTarget: Target = { 
      id,
      name: target.name,
      email: target.email,
      department: target.department ?? null,
      tags: target.tags ?? null,
      status: target.status ?? null,
      createdAt: new Date(),
    };
    this.targets.set(id, newTarget);
    return newTarget;
  }

  async updateTarget(id: string, target: Partial<InsertTarget>): Promise<Target | undefined> {
    const existing = this.targets.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...target };
    this.targets.set(id, updated);
    return updated;
  }

  async deleteTarget(id: string): Promise<boolean> {
    return this.targets.delete(id);
  }

  // Training Pages
  async getTrainingPages(): Promise<TrainingPage[]> {
    return Array.from(this.trainingPages.values()).sort((a, b) => 
      b.updatedAt!.getTime() - a.updatedAt!.getTime()
    );
  }

  async getTrainingPage(id: string): Promise<TrainingPage | undefined> {
    return this.trainingPages.get(id);
  }

  async createTrainingPage(page: InsertTrainingPage): Promise<TrainingPage> {
    const id = randomUUID();
    const now = new Date();
    const newPage: TrainingPage = { 
      id,
      name: page.name,
      description: page.description ?? null,
      content: page.content,
      status: page.status ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this.trainingPages.set(id, newPage);
    return newPage;
  }

  async updateTrainingPage(id: string, page: Partial<InsertTrainingPage>): Promise<TrainingPage | undefined> {
    const existing = this.trainingPages.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...page, updatedAt: new Date() };
    this.trainingPages.set(id, updated);
    return updated;
  }

  async deleteTrainingPage(id: string): Promise<boolean> {
    return this.trainingPages.delete(id);
  }

  // Project Targets
  async getProjectTargets(projectId: string): Promise<ProjectTarget[]> {
    return Array.from(this.projectTargets.values()).filter(
      pt => pt.projectId === projectId
    );
  }

  async createProjectTarget(projectTarget: InsertProjectTarget): Promise<ProjectTarget> {
    const id = randomUUID();
    const newProjectTarget: ProjectTarget = { 
      id,
      projectId: projectTarget.projectId,
      targetId: projectTarget.targetId,
      status: projectTarget.status ?? null,
      openedAt: projectTarget.openedAt ?? null,
      clickedAt: projectTarget.clickedAt ?? null,
      submittedAt: projectTarget.submittedAt ?? null,
    };
    this.projectTargets.set(id, newProjectTarget);
    return newProjectTarget;
  }

  async updateProjectTarget(id: string, projectTarget: Partial<InsertProjectTarget>): Promise<ProjectTarget | undefined> {
    const existing = this.projectTargets.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...projectTarget };
    this.projectTargets.set(id, updated);
    return updated;
  }
}

export const storage = new MemStorage();
