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
  copyProjects(ids: string[]): Promise<Project[]>;
  
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
      department: "전사",
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
      department: "인사부",
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
    const project3: Project = {
      id: randomUUID(),
      name: "2024 상반기 영업부 집중 훈련",
      description: "영업부 전원을 대상으로 한 피싱 인지 강화 캠페인",
      department: "영업부",
      templateId: template1.id,
      trainingPageId: null,
      startDate: new Date("2024-03-05"),
      endDate: new Date("2024-03-29"),
      status: "완료",
      targetCount: 220,
      openCount: 180,
      clickCount: 45,
      submitCount: 10,
      createdAt: new Date("2024-02-20"),
    };
    const project4: Project = {
      id: randomUUID(),
      name: "임원 대상 스피어피싱 대응 훈련",
      description: "경영진 특화 시나리오 기반 대응력 향상 훈련",
      department: "경영지원실",
      templateId: template2.id,
      trainingPageId: null,
      startDate: new Date("2024-04-02"),
      endDate: new Date("2024-04-12"),
      status: "진행중",
      targetCount: 18,
      openCount: 12,
      clickCount: 4,
      submitCount: 1,
      createdAt: new Date("2024-03-25"),
    };
    const project5: Project = {
      id: randomUUID(),
      name: "2024 하계 인턴 대상 보안 교육",
      description: "하계 인턴십 참여자를 위한 필수 보안 교육",
      department: "교육팀",
      templateId: template1.id,
      trainingPageId: null,
      startDate: new Date("2024-07-01"),
      endDate: new Date("2024-07-19"),
      status: "예약",
      targetCount: 60,
      openCount: null,
      clickCount: null,
      submitCount: null,
      createdAt: new Date("2024-06-10"),
    };
    this.projects.set(project3.id, project3);
    this.projects.set(project4.id, project4);
    this.projects.set(project5.id, project5);
    
    // Seed targets
    for (let i = 1; i <= 10; i++) {
      const baseDepartment = i <= 5 ? "영업부" : "개발부";
      const department =
        i % 3 === 0
          ? `${baseDepartment} 1팀, ${baseDepartment} 2팀`
          : baseDepartment;
      const target: Target = {
        id: randomUUID(),
        name: `직원${i}`,
        email: `employee${i}@company.com`,
        department,
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
      department: project.department ?? null,
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

  async copyProjects(ids: string[]): Promise<Project[]> {
    const copies: Project[] = [];
    const existingNames = new Set(Array.from(this.projects.values()).map((p) => p.name));

    const generateCopyName = (original: string) => {
      const baseName = `${original} 복제`;
      if (!existingNames.has(baseName)) {
        existingNames.add(baseName);
        return baseName;
      }
      let index = 2;
      let candidate = `${baseName} ${index}`;
      while (existingNames.has(candidate)) {
        index += 1;
        candidate = `${baseName} ${index}`;
      }
      existingNames.add(candidate);
      return candidate;
    };

    for (const id of ids) {
      const project = this.projects.get(id);
      if (!project) continue;

      const newId = randomUUID();
      const now = new Date();
      const copy: Project = {
        ...project,
        id: newId,
        name: generateCopyName(project.name),
        createdAt: now,
        startDate: new Date(project.startDate),
        endDate: new Date(project.endDate),
      };
      this.projects.set(newId, copy);
      copies.push(copy);
    }

    return copies;
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
