/**
 * Portfolio Application - Applying DDD and SOLID principles
 * 
 * Domain-Driven Design (DDD) Structure:
 * - Domain: Core business logic and entities
 * - Application: Use cases and application services
 * - Infrastructure: External concerns (DOM manipulation, data)
 * 
 * SOLID Principles Applied:
 * - Single Responsibility: Each class has one reason to change
 * - Open/Closed: Open for extension, closed for modification
 * - Liskov Substitution: Subtypes must be substitutable for base types
 * - Interface Segregation: Clients shouldn't depend on unused interfaces
 * - Dependency Inversion: Depend on abstractions, not concretions
 */

// ===== DOMAIN LAYER =====

/**
 * Value Object: Project
 * Represents a project entity with immutable properties
 */
class Project {
  constructor({ id, title, description, url }) {
    this.validateInput({ id, title, description, url });
    
    this._id = id;
    this._title = title;
    this._description = description;
    this._url = url;
    
    Object.freeze(this);
  }
  
  validateInput({ id, title, description, url }) {
    if (!id || typeof id !== 'number') {
      throw new Error('Project ID must be a valid number');
    }
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      throw new Error('Project title must be a non-empty string');
    }
    if (!description || typeof description !== 'string') {
      throw new Error('Project description must be a string');
    }
    if (!url || typeof url !== 'string') {
      throw new Error('Project URL must be a string');
    }
  }
  
  get id() { return this._id; }
  get title() { return this._title; }
  get description() { return this._description; }
  get url() { return this._url; }
  
  equals(other) {
    return other instanceof Project && this._id === other._id;
  }
  
  toJSON() {
    return {
      id: this._id,
      title: this._title,
      description: this._description,
      url: this._url
    };
  }
}

/**
 * Value Object: Skill
 * Represents a skill with validation
 */
class Skill {
  constructor(name) {
    this.validateName(name);
    this._name = name.trim();
    Object.freeze(this);
  }
  
  validateName(name) {
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw new Error('Skill name must be a non-empty string');
    }
  }
  
  get name() { return this._name; }
  
  equals(other) {
    return other instanceof Skill && this._name === other._name;
  }
  
  toJSON() {
    return { name: this._name };
  }
}

/**
 * Entity: Portfolio
 * Aggregate root that manages the portfolio state
 */
class Portfolio {
  constructor({ name, summary, projects = [], skills = [] }) {
    this.validatePortfolioData({ name, summary });
    
    this._name = name;
    this._summary = summary;
    this._projects = new Map();
    this._skills = new Set();
    
    // Initialize with provided data
    projects.forEach(project => this.addProject(project));
    skills.forEach(skill => this.addSkill(skill));
  }
  
  validatePortfolioData({ name, summary }) {
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw new Error('Portfolio name must be a non-empty string');
    }
    if (summary && typeof summary !== 'string') {
      throw new Error('Portfolio summary must be a string');
    }
  }
  
  get name() { return this._name; }
  get summary() { return this._summary; }
  
  getProjects() {
    return Array.from(this._projects.values());
  }
  
  getSkills() {
    return Array.from(this._skills);
  }
  
  addProject(projectData) {
    const project = projectData instanceof Project 
      ? projectData 
      : new Project(projectData);
    
    if (this._projects.has(project.id)) {
      throw new Error(`Project with ID ${project.id} already exists`);
    }
    
    this._projects.set(project.id, project);
    return project;
  }
  
  removeProject(projectId) {
    return this._projects.delete(projectId);
  }
  
  addSkill(skillData) {
    const skill = skillData instanceof Skill 
      ? skillData 
      : new Skill(skillData);
    
    // Check if skill already exists
    const existingSkill = Array.from(this._skills).find(s => s.equals(skill));
    if (existingSkill) {
      return existingSkill;
    }
    
    this._skills.add(skill);
    return skill;
  }
  
  removeSkill(skillName) {
    const skillToRemove = Array.from(this._skills).find(s => s.name === skillName);
    if (skillToRemove) {
      this._skills.delete(skillToRemove);
      return true;
    }
    return false;
  }
  
  updateProfile({ name, summary }) {
    if (name !== undefined) {
      this.validatePortfolioData({ name, summary: this._summary });
      this._name = name;
    }
    if (summary !== undefined) {
      this.validatePortfolioData({ name: this._name, summary });
      this._summary = summary;
    }
  }
}

// ===== APPLICATION LAYER =====

/**
 * Interface: Renderer
 * Defines the contract for rendering components
 */
class IRenderer {
  render(data) {
    throw new Error('render method must be implemented');
  }
}

/**
 * Interface: Repository
 * Defines the contract for data persistence
 */
class IPortfolioRepository {
  save(portfolio) {
    throw new Error('save method must be implemented');
  }
  
  load() {
    throw new Error('load method must be implemented');
  }
}

/**
 * Use Case: Portfolio Management
 * Orchestrates portfolio operations
 */
class PortfolioService {
  constructor(repository) {
    if (!repository || !(repository instanceof IPortfolioRepository)) {
      throw new Error('PortfolioService requires a valid repository');
    }
    this._repository = repository;
    this._portfolio = null;
  }
  
  async initialize(initialData) {
    try {
      this._portfolio = await this._repository.load();
    } catch (error) {
      console.warn('Could not load portfolio from repository, using initial data');
      this._portfolio = new Portfolio(initialData);
    }
    return this._portfolio;
  }
  
  getPortfolio() {
    if (!this._portfolio) {
      throw new Error('Portfolio not initialized. Call initialize() first.');
    }
    return this._portfolio;
  }
  
  async addProject(projectData) {
    const project = this._portfolio.addProject(projectData);
    await this._repository.save(this._portfolio);
    return project;
  }
  
  async addSkill(skillName) {
    const skill = this._portfolio.addSkill(skillName);
    await this._repository.save(this._portfolio);
    return skill;
  }
  
  async updateProfile(profileData) {
    this._portfolio.updateProfile(profileData);
    await this._repository.save(this._portfolio);
    return this._portfolio;
  }
}

// ===== INFRASTRUCTURE LAYER =====

/**
 * Security utility for HTML escaping
 */
class SecurityUtils {
  static escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') {
      return String(unsafe);
    }
    
    const escapeMap = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    
    return unsafe.replace(/[&<>"']/g, match => escapeMap[match]);
  }
}

/**
 * DOM utility for safe element operations
 */
class DOMUtils {
  static getElementById(id) {
    const element = document.getElementById(id);
    if (!element) {
      throw new Error(`Element with ID '${id}' not found`);
    }
    return element;
  }
  
  static createElement(tag, className = '', innerHTML = '') {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (innerHTML) element.innerHTML = innerHTML;
    return element;
  }
  
  static clearElement(element) {
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
  }
}

/**
 * Concrete Implementation: Header Renderer
 */
class HeaderRenderer extends IRenderer {
  constructor(nameElement, summaryElement) {
    super();
    this._nameElement = nameElement;
    this._summaryElement = summaryElement;
  }
  
  render({ name, summary }) {
    this._nameElement.textContent = SecurityUtils.escapeHtml(name);
    this._summaryElement.textContent = SecurityUtils.escapeHtml(summary);
  }
}

/**
 * Concrete Implementation: Projects Renderer
 */
class ProjectsRenderer extends IRenderer {
  constructor(containerElement) {
    super();
    this._container = containerElement;
  }
  
  render(projects) {
    DOMUtils.clearElement(this._container);
    
    projects.forEach(project => {
      const projectElement = this._createProjectElement(project);
      this._container.appendChild(projectElement);
    });
  }
  
  _createProjectElement(project) {
    const article = DOMUtils.createElement('article', 'project');
    
    const content = DOMUtils.createElement('div');
    const title = DOMUtils.createElement('h3', '', SecurityUtils.escapeHtml(project.title));
    const description = DOMUtils.createElement('p', '', SecurityUtils.escapeHtml(project.description));
    
    content.appendChild(title);
    content.appendChild(description);
    
    const linkContainer = DOMUtils.createElement('div');
    linkContainer.style.marginTop = '10px';
    
    const link = DOMUtils.createElement('a', '', 'Ver ▸');
    link.href = project.url;
    link.style.cssText = 'font-size: 13px; color: var(--accent-primary); text-decoration: none; font-weight: 600;';
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noopener noreferrer');
    
    linkContainer.appendChild(link);
    article.appendChild(content);
    article.appendChild(linkContainer);
    
    return article;
  }
}

/**
 * Concrete Implementation: Skills Renderer
 */
class SkillsRenderer extends IRenderer {
  constructor(containerElement) {
    super();
    this._container = containerElement;
  }
  
  render(skills) {
    DOMUtils.clearElement(this._container);
    
    skills.forEach(skill => {
      const skillElement = this._createSkillElement(skill);
      this._container.appendChild(skillElement);
    });
  }
  
  _createSkillElement(skill) {
    const span = DOMUtils.createElement('span', 'skill');
    span.textContent = SecurityUtils.escapeHtml(skill.name);
    span.setAttribute('role', 'listitem');
    return span;
  }
}

/**
 * Concrete Implementation: Local Storage Repository
 */
class LocalStoragePortfolioRepository extends IPortfolioRepository {
  constructor(storageKey = 'portfolio_data') {
    super();
    this._storageKey = storageKey;
  }
  
  async save(portfolio) {
    try {
      const data = {
        name: portfolio.name,
        summary: portfolio.summary,
        projects: portfolio.getProjects().map(p => p.toJSON()),
        skills: portfolio.getSkills().map(s => s.toJSON())
      };
      
      localStorage.setItem(this._storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save portfolio to localStorage:', error);
      throw new Error('Could not save portfolio data');
    }
  }
  
  async load() {
    try {
      const data = localStorage.getItem(this._storageKey);
      if (!data) {
        throw new Error('No portfolio data found in localStorage');
      }
      
      const parsedData = JSON.parse(data);
      return new Portfolio({
        name: parsedData.name,
        summary: parsedData.summary,
        projects: parsedData.projects || [],
        skills: (parsedData.skills || []).map(s => s.name || s)
      });
    } catch (error) {
      console.error('Failed to load portfolio from localStorage:', error);
      throw new Error('Could not load portfolio data');
    }
  }
}

/**
 * Main Application Controller
 * Orchestrates the entire application
 */
class PortfolioApplication {
  constructor() {
    this._service = null;
    this._renderers = new Map();
    this._isInitialized = false;
  }
  
  async initialize(initialData) {
    try {
      // Setup dependencies
      const repository = new LocalStoragePortfolioRepository();
      this._service = new PortfolioService(repository);
      
      // Setup renderers
      this._setupRenderers();
      
      // Initialize portfolio
      await this._service.initialize(initialData);
      
      // Render initial state
      this._renderAll();
      
      this._isInitialized = true;
      console.log('Portfolio application initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize portfolio application:', error);
      throw error;
    }
  }
  
  _setupRenderers() {
    try {
      const nameElement = DOMUtils.getElementById('user-name');
      const summaryElement = DOMUtils.getElementById('user-summary');
      const projectsElement = DOMUtils.getElementById('projects-list');
      const skillsElement = DOMUtils.getElementById('skills-list');
      
      this._renderers.set('header', new HeaderRenderer(nameElement, summaryElement));
      this._renderers.set('projects', new ProjectsRenderer(projectsElement));
      this._renderers.set('skills', new SkillsRenderer(skillsElement));
      
    } catch (error) {
      throw new Error(`Failed to setup renderers: ${error.message}`);
    }
  }
  
  _renderAll() {
    const portfolio = this._service.getPortfolio();
    
    this._renderers.get('header').render({
      name: portfolio.name,
      summary: portfolio.summary
    });
    
    this._renderers.get('projects').render(portfolio.getProjects());
    this._renderers.get('skills').render(portfolio.getSkills());
  }
  
  async addProject(projectData) {
    this._ensureInitialized();
    
    try {
      await this._service.addProject(projectData);
      this._renderers.get('projects').render(this._service.getPortfolio().getProjects());
    } catch (error) {
      console.error('Failed to add project:', error);
      throw error;
    }
  }
  
  async addSkill(skillName) {
    this._ensureInitialized();
    
    try {
      await this._service.addSkill(skillName);
      this._renderers.get('skills').render(this._service.getPortfolio().getSkills());
    } catch (error) {
      console.error('Failed to add skill:', error);
      throw error;
    }
  }
  
  async updateProfile(profileData) {
    this._ensureInitialized();
    
    try {
      await this._service.updateProfile(profileData);
      this._renderers.get('header').render({
        name: this._service.getPortfolio().name,
        summary: this._service.getPortfolio().summary
      });
    } catch (error) {
      console.error('Failed to update profile:', error);
      throw error;
    }
  }
  
  _ensureInitialized() {
    if (!this._isInitialized) {
      throw new Error('Application not initialized. Call initialize() first.');
    }
  }
  
  // Public API for debugging and external access
  getPortfolio() {
    this._ensureInitialized();
    return this._service.getPortfolio();
  }
}

// ===== APPLICATION BOOTSTRAP =====

/**
 * Initial portfolio data
 */
const INITIAL_PORTFOLIO_DATA = {
  name: 'Matheus Venancio Moreira Sales',
  summary: 'Sou Analista Clínico em transição de carreira para Desenvolvedor de Sistemas. Tenho experiência com análise de dados, atenção aos detalhes e resolução de problemas — habilidades que agora aplico na programação. Estudo tecnologias como HTML, CSS, JavaScript, TypeScript e Node.js, com foco em desenvolvimento web e APIs. Busco minha primeira oportunidade na área tech para aplicar meu conhecimento, crescer profissionalmente e contribuir com soluções eficientes e bem estruturadas.',
  projects: [
    {
      id: 1,
      title: 'Sistema Acadêmico',
      description: 'Sistema web para que a comunidade acadêmica possa consultar os horários das aulas',
      url: 'https://github.com/prjDevflow/prj_1sem_client'
    }
  ],
  skills: ['HTML', 'CSS', 'JavaScript', 'Git', 'TypeScript', 'Node.js']
};

/**
 * Application entry point
 */
(async function bootstrap() {
  try {
    const app = new PortfolioApplication();
    await app.initialize(INITIAL_PORTFOLIO_DATA);
    
    // Expose app instance for debugging and external access
    window.__portfolioApp = app;
    
  } catch (error) {
    console.error('Failed to start portfolio application:', error);
    
    // Fallback: show error message to user
    const errorMessage = document.createElement('div');
    errorMessage.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ef4444;
      color: white;
      padding: 16px;
      border-radius: 8px;
      font-family: system-ui;
      font-size: 14px;
      z-index: 1000;
    `;
    errorMessage.textContent = 'Erro ao carregar o portfólio. Verifique o console para mais detalhes.';
    document.body.appendChild(errorMessage);
    
    // Auto-remove error message after 5 seconds
    setTimeout(() => {
      if (errorMessage.parentNode) {
        errorMessage.parentNode.removeChild(errorMessage);
      }
    }, 5000);
  }
})();

