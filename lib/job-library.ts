import type { CvLocale } from "./cv-matcher-copy";

export const JOB_CATEGORIES = ["ai", "data", "aws"] as const;
export type JobCategory = (typeof JOB_CATEGORIES)[number];
export interface JobRole {
  id: string;
  title: string;
  category: JobCategory;
  description: string;
}
export const JOB_LIBRARY_KEY = "cv-matcher:job-library:v1";
export const CUSTOM_ROLE_LIMIT = 100;
export const TITLE_LIMIT = 120;
export const DESCRIPTION_LIMIT = 50_000;

// Curated starting points, not a statistical ranking or live vacancies.
const DEFAULTS: [string, string, JobCategory, string, string][] = [
  ["ml-engineer", "Machine Learning Engineer", "ai",
    "Build, evaluate and deploy machine learning models.\nRequired: Python, SQL, machine learning, model evaluation and Git. Work with data scientists to prepare datasets and monitor production models.\nNice to have: PyTorch, TensorFlow, Docker and AWS SageMaker.",
    "Vyvíjajte, vyhodnocujte a nasadzujte modely strojového učenia.\nPovinné: Python, SQL, strojové učenie, vyhodnocovanie modelov a Git. Pripravujte dáta s dátovými vedcami a monitorujte modely v produkcii.\nVýhodou: PyTorch, TensorFlow, Docker a AWS SageMaker."],
  ["ai-engineer", "AI Engineer", "ai",
    "Build AI-powered applications and integrate language models with business workflows.\nRequired: Python, REST APIs, machine learning, Git and automated testing. Evaluate model output, retrieval quality and application reliability.\nNice to have: LLMs, retrieval-augmented generation, FastAPI and AWS.",
    "Vyvíjajte aplikácie s AI a prepájajte jazykové modely s firemnými procesmi.\nPovinné: Python, REST APIs, strojové učenie, Git a automatizované testovanie. Vyhodnocujte výstupy modelov, kvalitu vyhľadávania a spoľahlivosť aplikácií.\nVýhodou: LLM, retrieval-augmented generation, FastAPI a AWS."],
  ["mlops-engineer", "MLOps Engineer", "ai",
    "Operate reliable machine learning pipelines from training to production.\nRequired: Python, Docker, Kubernetes, CI/CD, Git and machine learning. Automate model deployment, versioning, monitoring and rollback.\nNice to have: Terraform, MLflow and AWS SageMaker.",
    "Prevádzkujte spoľahlivé pipeline strojového učenia od trénovania po produkciu.\nPovinné: Python, Docker, Kubernetes, CI/CD, Git a strojové učenie. Automatizujte nasadenie, verzovanie, monitoring a návrat modelov na staršiu verziu.\nVýhodou: Terraform, MLflow a AWS SageMaker."],
  ["data-analyst", "Data Analyst", "data",
    "Turn business data into clear reports and actionable insights.\nRequired: SQL, Excel, data analysis and stakeholder management. Validate data, define metrics and communicate findings.\nNice to have: Python, Power BI and Tableau.",
    "Meňte firemné dáta na zrozumiteľné reporty a využiteľné zistenia.\nPovinné: SQL, Excel, analýza dát a stakeholder management. Overujte dáta, definujte metriky a komunikujte výsledky.\nVýhodou: Python, Power BI a Tableau."],
  ["data-scientist", "Data Scientist", "data",
    "Use statistical analysis and machine learning to solve business problems.\nRequired: Python, SQL, machine learning and data analysis. Design experiments, validate models and explain results to stakeholders.\nNice to have: R, Tableau and AWS.",
    "Riešte firemné problémy štatistickou analýzou a strojovým učením.\nPovinné: Python, SQL, strojové učenie a analýza dát. Navrhujte experimenty, overujte modely a vysvetľujte výsledky partnerom.\nVýhodou: R, Tableau a AWS."],
  ["data-engineer", "Data Engineer", "data",
    "Build and maintain dependable batch and streaming data pipelines.\nRequired: Python, SQL, PostgreSQL, Git and data modeling. Implement ETL workflows, data quality checks and warehouse ingestion.\nNice to have: Kafka, Spark, Airflow and AWS Glue.",
    "Vyvíjajte a udržiavajte spoľahlivé dávkové a streamingové dátové pipeline.\nPovinné: Python, SQL, PostgreSQL, Git a dátové modelovanie. Implementujte ETL, kontroly kvality dát a načítanie do dátového skladu.\nVýhodou: Kafka, Spark, Airflow a AWS Glue."],
  ["analytics-engineer", "Analytics Engineer", "data",
    "Create tested, documented data models for reporting and analytics.\nRequired: SQL, Git, data analysis and data modeling. Transform warehouse data, define shared metrics and maintain data quality tests.\nNice to have: dbt, Python, Power BI and CI/CD.",
    "Vytvárajte otestované a zdokumentované dátové modely pre reporty a analytiku.\nPovinné: SQL, Git, analýza dát a dátové modelovanie. Transformujte dáta v sklade, definujte spoločné metriky a udržiavajte testy kvality dát.\nVýhodou: dbt, Python, Power BI a CI/CD."],
  ["aws-cloud-engineer", "AWS Cloud Engineer", "aws",
    "Build and operate secure AWS infrastructure.\nRequired: AWS, Linux, Terraform, networking and Git. Manage EC2, S3, VPC and IAM, monitor availability and control cloud costs.\nNice to have: Python, Docker and Kubernetes.",
    "Budujte a prevádzkujte bezpečnú infraštruktúru AWS.\nPovinné: AWS, Linux, Terraform, siete a Git. Spravujte EC2, S3, VPC a IAM, monitorujte dostupnosť a náklady cloudu.\nVýhodou: Python, Docker a Kubernetes."],
  ["aws-solutions-architect", "AWS Solutions Architect", "aws",
    "Design secure, resilient and cost-effective systems on AWS.\nRequired: AWS, system design, networking and stakeholder management. Translate business requirements into architectures, document trade-offs and plan migrations.\nNice to have: Terraform, Kubernetes and REST APIs.",
    "Navrhujte bezpečné, odolné a nákladovo efektívne systémy na AWS.\nPovinné: AWS, návrh systémov, siete a stakeholder management. Premieňajte potreby firmy na architektúry, dokumentujte kompromisy a plánujte migrácie.\nVýhodou: Terraform, Kubernetes a REST APIs."],
  ["aws-devops-engineer", "AWS DevOps Engineer", "aws",
    "Automate delivery and operation of applications on AWS.\nRequired: AWS, Linux, Docker, Terraform, CI/CD and Git. Build deployment pipelines, monitor services and improve incident response.\nNice to have: Kubernetes, Python and AWS CloudFormation.",
    "Automatizujte dodávanie a prevádzku aplikácií na AWS.\nPovinné: AWS, Linux, Docker, Terraform, CI/CD a Git. Vytvárajte pipeline nasadenia, monitorujte služby a zlepšujte riešenie incidentov.\nVýhodou: Kubernetes, Python a AWS CloudFormation."],
];

export function defaultJobRoles(locale: CvLocale): JobRole[] {
  return DEFAULTS.map(([id, title, category, en, sk]) => ({
    id, title, category, description: `${title}\n${locale === "sk" ? sk : en}`,
  }));
}

/** Reject damaged/version-mismatched storage rather than loading arbitrary shapes. */
export function parseSavedRoles(raw: string | null): JobRole[] {
  if (!raw) return [];
  const data: unknown = JSON.parse(raw);
  if (!data || typeof data !== "object" || !("version" in data) || data.version !== 1 ||
      !("roles" in data) || !Array.isArray(data.roles) || data.roles.length > CUSTOM_ROLE_LIMIT) {
    throw new Error("Invalid job library");
  }
  const ids = new Set<string>();
  return data.roles.map((value: unknown) => {
    if (!value || typeof value !== "object" || !("id" in value) ||
        typeof value.id !== "string" || !/^custom:[a-zA-Z0-9-]{1,80}$/.test(value.id) ||
        !("title" in value) || typeof value.title !== "string" || !value.title.trim() || value.title.length > TITLE_LIMIT ||
        !("description" in value) || typeof value.description !== "string" || !value.description.trim() || value.description.length > DESCRIPTION_LIMIT ||
        !("category" in value) || !JOB_CATEGORIES.includes(value.category as JobCategory) || ids.has(value.id)) {
      throw new Error("Invalid saved role");
    }
    ids.add(value.id);
    return { id: value.id, title: value.title, description: value.description, category: value.category as JobCategory };
  });
}

export function serializeSavedRoles(roles: JobRole[]): string {
  const raw = JSON.stringify({ version: 1, roles });
  parseSavedRoles(raw);
  return raw;
}
