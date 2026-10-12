/**
 * seed.ts — the demo workspace a first visitor sees.
 *
 * Invented people and companies only (no real person, employer, phone or e-mail). Dates
 * are offsets from "now", so the demo always looks like a live desk: interviews this week,
 * a placement inside its guarantee, consent about to expire. English and Slovak variants
 * share the same ids and numbers so reports read the same in both languages.
 */
import { analyzeCv } from "@/lib/cv-analyzer";
import {
  addDays, addMonths, emptyWorkspace, isoDate, type Activity, type Application, type ApplicationStage,
  type Candidate, type Client, type Interview, type Job, type Recommendation, type Task, type Workspace,
} from "./model";

type L = "en" | "sk";
type T = Record<L, string>;
const t = (en: string, sk: string): T => ({ en, sk });

function at(now: Date, daysAgo: number, hour = 10, minute = 0): string {
  const d = new Date(now);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  d.setUTCHours(hour, minute, 0, 0);
  return d.toISOString();
}

function day(now: Date, offset: number): string {
  const d = new Date(now);
  d.setUTCDate(d.getUTCDate() + offset);
  return isoDate(d);
}

// ── Clients ───────────────────────────────────────────────────────────────────────────

const CLIENTS: Array<{ id: string; name: string; industry: T; location: string; website: string; contactName: string; contactEmail: string; contactPhone: string; feePercent: number | null; guaranteeDays: number | null; paymentTermsDays: number; notes: T; daysAgo: number }> = [
  { id: "cl-northwind", name: "Northwind Analytics s.r.o.", industry: t("Data & analytics", "Dáta a analytika"), location: "Bratislava", website: "northwind-analytics.example", contactName: "Zuzana Majerová", contactEmail: "z.majerova@northwind-analytics.example", contactPhone: "+421 900 000 101", feePercent: 22, guaranteeDays: 90, paymentTermsDays: 14, notes: t("Prefers two shortlisted profiles per week. Decides fast, pays on time.", "Chce dva profily do shortlistu týždenne. Rozhoduje rýchlo, platí načas."), daysAgo: 160 },
  { id: "cl-lumen", name: "Lumen Fintech a.s.", industry: t("Fintech", "Fintech"), location: "Bratislava · remote", website: "lumen-fintech.example", contactName: "Tomáš Beňo", contactEmail: "t.beno@lumen-fintech.example", contactPhone: "+421 900 000 102", feePercent: 20, guaranteeDays: 60, paymentTermsDays: 30, notes: t("Two-round interviews, technical task in round one. Budget approved per quarter.", "Dvojkolové pohovory, technická úloha v prvom kole. Rozpočet schvaľovaný kvartálne."), daysAgo: 120 },
  { id: "cl-koval", name: "Kovaľ Logistics", industry: t("Logistics", "Logistika"), location: "Žilina", website: "koval-logistics.example", contactName: "Ing. Peter Šimko", contactEmail: "simko@koval-logistics.example", contactPhone: "+421 900 000 103", feePercent: null, guaranteeDays: null, paymentTermsDays: 30, notes: t("Family-owned. Values stability over stack. Hiring manager interviews personally.", "Rodinná firma. Stabilita je dôležitejšia než stack. Manažér robí pohovory osobne."), daysAgo: 75 },
  { id: "cl-verdant", name: "Verdant Health", industry: t("Health tech", "Zdravotnícke technológie"), location: "Košice", website: "verdant-health.example", contactName: "MUDr. Alena Rybárová", contactEmail: "a.rybarova@verdant-health.example", contactPhone: "+421 900 000 104", feePercent: 25, guaranteeDays: 90, paymentTermsDays: 14, notes: t("Retained search for leadership roles. Monthly status call.", "Retained search na vedúce pozície. Mesačný status call."), daysAgo: 40 },
];

// ── Jobs ──────────────────────────────────────────────────────────────────────────────

interface SeedJob {
  id: string; clientId: string; title: string; location: string; workMode: Job["workMode"]; employment: Job["employment"];
  salaryMin: number; salaryMax: number; status: Job["status"]; priority: Job["priority"]; openedDaysAgo: number; deadlineIn: number | null;
  description: T; mustHave: string[]; niceToHave: string[];
}

const JOBS: SeedJob[] = [
  {
    id: "job-backend", clientId: "cl-lumen", title: "Senior Backend Engineer", location: "Bratislava", workMode: "hybrid", employment: "permanent",
    salaryMin: 54000, salaryMax: 66000, status: "open", priority: "high", openedDaysAgo: 34, deadlineIn: 12,
    description: t(
      `Senior Backend Engineer\nWe are hiring a Senior Backend Engineer for our payments platform.\n\nRequirements:\n- 5+ years with Node.js and TypeScript\n- PostgreSQL and Redis\n- Designing REST APIs and microservices\n- Docker and CI/CD pipelines\n- AWS\n- English\n\nNice to have:\n- Kubernetes\n- Kafka\n- Terraform`,
      `Senior Backend Engineer\nHľadáme Senior Backend Engineera do platobnej platformy.\n\nPožadujeme:\n- 5+ rokov s Node.js a TypeScript\n- PostgreSQL a Redis\n- Návrh REST API a mikroslužieb\n- Docker a CI/CD\n- AWS\n- Angličtina\n\nVýhodou:\n- Kubernetes\n- Kafka\n- Terraform`
    ),
    mustHave: ["Node.js", "TypeScript", "PostgreSQL", "REST APIs", "Docker", "AWS"], niceToHave: ["Kubernetes", "Kafka", "Terraform"],
  },
  {
    id: "job-data", clientId: "cl-northwind", title: "Data Engineer", location: "Bratislava", workMode: "remote", employment: "permanent",
    salaryMin: 48000, salaryMax: 58000, status: "open", priority: "normal", openedDaysAgo: 21, deadlineIn: 25,
    description: t(
      `Data Engineer\nBuild and maintain dependable batch and streaming data pipelines.\n\nRequirements:\n- Python and SQL\n- PostgreSQL\n- Git and data modeling\n- Docker\n\nNice to have:\n- Kafka\n- Airflow\n- AWS`,
      `Data Engineer\nVyvíjajte a udržiavajte spoľahlivé dávkové a streamingové dátové pipeline.\n\nPožadujeme:\n- Python a SQL\n- PostgreSQL\n- Git a dátové modelovanie\n- Docker\n\nVýhodou:\n- Kafka\n- Airflow\n- AWS`
    ),
    mustHave: ["Python", "SQL", "PostgreSQL", "Git", "Docker"], niceToHave: ["Kafka", "Airflow", "AWS"],
  },
  {
    id: "job-frontend", clientId: "cl-lumen", title: "Frontend Developer (React)", location: "Bratislava", workMode: "hybrid", employment: "permanent",
    salaryMin: 42000, salaryMax: 52000, status: "open", priority: "normal", openedDaysAgo: 12, deadlineIn: 40,
    description: t(
      `Frontend Developer\nWe are hiring a Frontend Developer to build our customer dashboard.\n\nRequirements:\n- 3+ years with React and TypeScript\n- Strong CSS and responsive design\n- Experience consuming REST APIs and GraphQL\n- Unit testing with Jest\n- Git and code review\n\nNice to have:\n- Next.js\n- Accessibility (WCAG)\n- Figma`,
      `Frontend vývojár\nHľadáme frontend vývojára do tímu, ktorý stavia zákaznícky portál.\n\nPožadujeme:\n- 3+ roky s React a TypeScript\n- CSS a responzívny dizajn\n- Integrácia REST API a GraphQL\n- Unit testy v Jest\n- Git a code review\n\nVýhodou:\n- Next.js\n- Prístupnosť (WCAG)\n- Figma`
    ),
    mustHave: ["React", "TypeScript", "CSS", "REST APIs", "Jest"], niceToHave: ["Next.js", "Accessibility", "Figma"],
  },
  {
    id: "job-pm", clientId: "cl-verdant", title: "Product Manager", location: "Košice", workMode: "onsite", employment: "permanent",
    salaryMin: 50000, salaryMax: 62000, status: "open", priority: "urgent", openedDaysAgo: 8, deadlineIn: 5,
    description: t(
      `Product Manager\nRequirements:\n- Own the product roadmap and prioritisation\n- Stakeholder management across clinical and engineering teams\n- Agile and Scrum delivery with Jira\n- Data analysis with SQL and product analytics\n- Excellent communication in English\n\nNice to have:\n- A/B testing\n- OKRs\n- User research`,
      `Produktový manažér\nPožadujeme:\n- Vlastníctvo produktovej roadmapy a prioritizácie\n- Riadenie stakeholderov naprieč klinickým a vývojovým tímom\n- Agilné doručovanie v Scrume a Jira\n- Analýza dát v SQL a produktová analytika\n- Výborná komunikácia v angličtine\n\nVýhodou:\n- A/B testovanie\n- OKR\n- Používateľský výskum`
    ),
    mustHave: ["Product roadmap", "Stakeholder management", "Scrum", "SQL", "English"], niceToHave: ["A/B testing", "OKRs", "User research"],
  },
  {
    id: "job-devops", clientId: "cl-koval", title: "DevOps Engineer", location: "Žilina", workMode: "onsite", employment: "permanent",
    salaryMin: 40000, salaryMax: 50000, status: "filled", priority: "normal", openedDaysAgo: 70, deadlineIn: null,
    description: t(
      `DevOps Engineer\nRequirements:\n- Linux\n- Docker and Kubernetes\n- CI/CD (GitLab CI)\n- Terraform\n- Git\n\nNice to have:\n- AWS\n- Python`,
      `DevOps inžinier\nPožadujeme:\n- Linux\n- Docker a Kubernetes\n- CI/CD (GitLab CI)\n- Terraform\n- Git\n\nVýhodou:\n- AWS\n- Python`
    ),
    mustHave: ["Linux", "Docker", "Kubernetes", "CI/CD", "Terraform"], niceToHave: ["AWS", "Python"],
  },
  {
    id: "job-analyst", clientId: "cl-northwind", title: "Data Analyst", location: "Bratislava", workMode: "hybrid", employment: "permanent",
    salaryMin: 32000, salaryMax: 40000, status: "on-hold", priority: "low", openedDaysAgo: 45, deadlineIn: null,
    description: t(
      `Data Analyst\nRequirements:\n- SQL and Excel\n- Data analysis and stakeholder management\n\nNice to have:\n- Python\n- Power BI\n- Tableau`,
      `Dátový analytik\nPožadujeme:\n- SQL a Excel\n- Analýza dát a stakeholder management\n\nVýhodou:\n- Python\n- Power BI\n- Tableau`
    ),
    mustHave: ["SQL", "Excel", "Data analysis"], niceToHave: ["Python", "Power BI", "Tableau"],
  },
];

// ── Candidates ────────────────────────────────────────────────────────────────────────

interface SeedCandidate {
  id: string; firstName: string; lastName: string; title: T; location: string; company: string; years: number; salary: number;
  availability: T; skills: string[]; tags: string[]; source: Candidate["source"]; cv: T; summary: T;
  consent: { status: Candidate["consent"]["status"]; grantedDaysAgo: number | null; expiresInDays: number | null };
  createdDaysAgo: number; lastContactDaysAgo: number | null;
}

const CANDIDATES: SeedCandidate[] = [
  {
    id: "cand-horvathova", firstName: "Mária", lastName: "Horváthová", title: t("Backend Engineer", "Backend Engineer"), location: "Bratislava", company: "Orbis Software", years: 6, salary: 60000,
    availability: t("2 months' notice", "2-mesačná výpovedná lehota"), skills: ["Node.js", "TypeScript", "PostgreSQL", "Redis", "Docker", "AWS", "REST APIs", "Microservices", "Kubernetes"], tags: ["senior", "payments"], source: "linkedin",
    cv: t(
      `Mária Horváthová — Backend Engineer\nNode.js and TypeScript engineer with 6 years of experience building REST APIs and microservices for payment systems.\nDesigned a PostgreSQL schema serving 120,000 users; cut p95 latency by 40%.\nRedis caching, Docker, deployed on AWS with GitHub Actions CI/CD. Kubernetes in production for 2 years.\nMentored three junior developers. English C1.`,
      `Mária Horváthová — Backend Engineer\nNode.js a TypeScript vývojárka so 6 rokmi skúseností s REST API a mikroslužbami pre platobné systémy.\nNavrhla PostgreSQL schému pre 120 000 používateľov; skrátila p95 odozvu o 40 %.\nRedis cache, Docker, nasadenie na AWS cez GitHub Actions CI/CD. Kubernetes v produkcii 2 roky.\nMentorovala troch juniorov. Angličtina C1.`
    ),
    summary: t("Strongest backend profile in the pool. Motivated by fintech; wants hybrid.", "Najsilnejší backend profil v databáze. Motivuje ju fintech; chce hybrid."),
    consent: { status: "granted", grantedDaysAgo: 40, expiresInDays: 325 }, createdDaysAgo: 40, lastContactDaysAgo: 2,
  },
  {
    id: "cand-kovac", firstName: "Peter", lastName: "Kováč", title: t("Software Engineer", "Software Engineer"), location: "Trnava", company: "Delta Systems", years: 5, salary: 55000,
    availability: t("1 month", "1 mesiac"), skills: ["Node.js", "TypeScript", "PostgreSQL", "Docker", "AWS", "REST APIs", "Git"], tags: ["backend"], source: "database",
    cv: t(
      `Peter Kováč — Software Engineer\nNode.js and TypeScript developer with 5 years of experience building REST APIs.\nPostgreSQL schema design, Docker, AWS deployments with GitHub Actions.\nMentored two junior developers. English B2.`,
      `Peter Kováč — Software Engineer\nNode.js a TypeScript vývojár s 5 rokmi skúseností s REST API.\nNávrh PostgreSQL schém, Docker, nasadenie na AWS cez GitHub Actions.\nMentoroval dvoch juniorov. Angličtina B2.`
    ),
    summary: t("Solid, reliable. Missing Redis and microservices depth.", "Solídny, spoľahlivý. Chýba mu Redis a hĺbka v mikroslužbách."),
    consent: { status: "granted", grantedDaysAgo: 200, expiresInDays: 165 }, createdDaysAgo: 200, lastContactDaysAgo: 6,
  },
  {
    id: "cand-nagy", firstName: "Lukáš", lastName: "Nagy", title: t("Senior Backend Developer", "Senior Backend Developer"), location: "Bratislava", company: "Aurum Pay", years: 8, salary: 64000,
    availability: t("Immediately", "Ihneď"), skills: ["Node.js", "TypeScript", "PostgreSQL", "Redis", "Kafka", "Docker", "Kubernetes", "AWS", "Terraform", "Microservices", "REST APIs"], tags: ["senior", "payments", "lead"], source: "referral",
    cv: t(
      `Lukáš Nagy — Senior Backend Developer\n8 years designing REST APIs and microservices in Node.js and TypeScript for card payments.\nPostgreSQL, Redis, Kafka event streaming at 20,000 messages per second.\nDocker and Kubernetes on AWS, infrastructure in Terraform, CI/CD with GitLab.\nLed a team of 5 engineers. English C1, German B1.`,
      `Lukáš Nagy — Senior Backend Developer\n8 rokov návrhu REST API a mikroslužieb v Node.js a TypeScript pre kartové platby.\nPostgreSQL, Redis, Kafka event streaming pri 20 000 správach za sekundu.\nDocker a Kubernetes na AWS, infraštruktúra v Terraforme, CI/CD v GitLabe.\nViedol tím 5 inžinierov. Angličtina C1, nemčina B1.`
    ),
    summary: t("Referral from a placed candidate. Leaving a shrinking team; ready now.", "Odporúčanie od umiestneného kandidáta. Odchádza zo zmenšujúceho sa tímu; dostupný hneď."),
    consent: { status: "granted", grantedDaysAgo: 18, expiresInDays: 347 }, createdDaysAgo: 18, lastContactDaysAgo: 1,
  },
  {
    id: "cand-bielikova", firstName: "Andrea", lastName: "Bieliková", title: t("Backend Developer", "Backend Developer"), location: "Nitra", company: "Freelance", years: 7, salary: 62000,
    availability: t("Immediately", "Ihneď"), skills: ["Node.js", "TypeScript", "NestJS", "PostgreSQL", "Redis", "Docker", "AWS", "REST APIs", "GraphQL", "Microservices"], tags: ["senior", "freelance"], source: "job-board",
    cv: t(
      `Andrea Bieliková — Backend Developer\nFreelance backend developer, 7 years. Node.js, TypeScript and NestJS services with PostgreSQL and Redis.\nBuilt REST APIs and GraphQL gateways for e-commerce clients serving 300,000 customers.\nDocker, AWS (ECS, RDS), microservices. English C1.`,
      `Andrea Bieliková — Backend Developer\nFreelance backend vývojárka, 7 rokov. Služby v Node.js, TypeScript a NestJS s PostgreSQL a Redis.\nPostavila REST API a GraphQL brány pre e-commerce klientov s 300 000 zákazníkmi.\nDocker, AWS (ECS, RDS), mikroslužby. Angličtina C1.`
    ),
    summary: t("Wants to leave freelancing for a stable team. Offer stage — negotiating salary.", "Chce opustiť freelance a ísť do stabilného tímu. Vo fáze ponuky — vyjednáva plat."),
    consent: { status: "granted", grantedDaysAgo: 30, expiresInDays: 335 }, createdDaysAgo: 30, lastContactDaysAgo: 0,
  },
  {
    id: "cand-sykora", firstName: "Martin", lastName: "Sýkora", title: t("Data Engineer", "Data Engineer"), location: "Bratislava", company: "Northstar Retail", years: 4, salary: 52000,
    availability: t("2 months", "2 mesiace"), skills: ["Python", "SQL", "PostgreSQL", "Airflow", "Docker", "Git", "Data modeling", "Kafka"], tags: ["data"], source: "linkedin",
    cv: t(
      `Martin Sýkora — Data Engineer\n4 years building batch and streaming data pipelines in Python and SQL.\nPostgreSQL warehouse, Airflow orchestration, Kafka ingestion, Docker. Git, data modeling and quality tests.\nReduced nightly pipeline runtime from 6 hours to 90 minutes.`,
      `Martin Sýkora — Data Engineer\n4 roky stavania dávkových a streamingových dátových pipeline v Pythone a SQL.\nPostgreSQL sklad, orchestrácia v Airflow, príjem dát cez Kafka, Docker. Git, dátové modelovanie a testy kvality.\nSkrátil nočný beh pipeline zo 6 hodín na 90 minút.`
    ),
    summary: t("Good fit for Northwind. Prefers remote.", "Dobrá zhoda pre Northwind. Preferuje remote."),
    consent: { status: "granted", grantedDaysAgo: 15, expiresInDays: 350 }, createdDaysAgo: 15, lastContactDaysAgo: 3,
  },
  {
    id: "cand-vargova", firstName: "Katarína", lastName: "Vargová", title: t("Analytics Engineer", "Analytics Engineer"), location: "Remote (Banská Bystrica)", company: "Bluefin Insights", years: 3, salary: 46000,
    availability: t("1 month", "1 mesiac"), skills: ["SQL", "Python", "dbt", "PostgreSQL", "Git", "Data analysis", "Power BI"], tags: ["data"], source: "job-board",
    cv: t(
      `Katarína Vargová — Analytics Engineer\n3 years of SQL and Python data modeling with dbt on PostgreSQL. Git-based workflow, tested models, Power BI dashboards for 40 stakeholders.\nData analysis for finance and marketing teams.`,
      `Katarína Vargová — Analytics Engineer\n3 roky dátového modelovania v SQL a Pythone s dbt nad PostgreSQL. Git workflow, testované modely, Power BI dashboardy pre 40 stakeholderov.\nAnalýza dát pre finančný a marketingový tím.`
    ),
    summary: t("Junior-to-mid. Could grow into the Data Engineer role.", "Junior až mid. Mohla by dorásť do Data Engineer roly."),
    consent: { status: "granted", grantedDaysAgo: 345, expiresInDays: 20 }, createdDaysAgo: 345, lastContactDaysAgo: 9,
  },
  {
    id: "cand-novak", firstName: "Jana", lastName: "Nováková", title: t("Frontend Engineer", "Frontend Engineer"), location: "Bratislava", company: "Pixelbay", years: 4, salary: 48000,
    availability: t("2 months' notice", "2-mesačná výpovedná lehota"), skills: ["React", "JavaScript", "CSS", "Tailwind CSS", "Figma", "REST APIs", "Git", "Responsive design"], tags: ["frontend"], source: "linkedin",
    cv: t(
      `Jana Nováková — Frontend Engineer\nBuilt React and JavaScript single-page apps for 4 years.\nStyled components with CSS and Tailwind, mobile first. Responsible for the design system and Figma handoffs.\nWorked on REST API integration with the backend team. Git, GitHub, pull requests.`,
      `Jana Nováková — Frontend Engineer\n4 roky vývoja jednostránkových aplikácií v React a JavaScript.\nCSS a Tailwind, mobile first. Zodpovedná za dizajn systém a podklady z Figma.\nPodieľala sa na integrácii REST API. Git, GitHub, pull requesty.`
    ),
    summary: t("Strong design sense; TypeScript and testing are gaps to probe.", "Silný cit pre dizajn; TypeScript a testovanie treba preveriť."),
    consent: { status: "granted", grantedDaysAgo: 10, expiresInDays: 355 }, createdDaysAgo: 10, lastContactDaysAgo: 4,
  },
  {
    id: "cand-urban", firstName: "Filip", lastName: "Urban", title: t("Frontend Developer", "Frontend Developer"), location: "Bratislava", company: "Cobalt Studio", years: 5, salary: 50000,
    availability: t("3 months", "3 mesiace"), skills: ["React", "TypeScript", "Next.js", "CSS", "Jest", "Playwright", "GraphQL", "REST APIs", "Accessibility", "Git"], tags: ["frontend", "senior"], source: "referral",
    cv: t(
      `Filip Urban — Frontend Developer\n5 years with React and TypeScript, Next.js in production since 2022. CSS and responsive design, accessibility (WCAG 2.1 AA audits).\nREST APIs and GraphQL, unit testing with Jest, end-to-end with Playwright. Git and code review in a team of 8.`,
      `Filip Urban — Frontend Developer\n5 rokov s React a TypeScript, Next.js v produkcii od 2022. CSS a responzívny dizajn, prístupnosť (audity WCAG 2.1 AA).\nREST API a GraphQL, unit testy v Jest, end-to-end v Playwright. Git a code review v tíme 8 ľudí.`
    ),
    summary: t("Near-perfect match for Lumen frontend. Long notice period.", "Takmer dokonalá zhoda pre Lumen frontend. Dlhá výpovedná lehota."),
    consent: { status: "granted", grantedDaysAgo: 7, expiresInDays: 358 }, createdDaysAgo: 7, lastContactDaysAgo: 1,
  },
  {
    id: "cand-kovacova", firstName: "Lucia", lastName: "Kováčová", title: t("Project Coordinator", "Project Coordinator"), location: "Košice", company: "MedLine Services", years: 3, salary: 40000,
    availability: t("1 month", "1 mesiac"), skills: ["Jira", "Confluence", "Agile", "Scrum", "A/B testing", "Stakeholder management", "Communication"], tags: ["product"], source: "direct",
    cv: t(
      `Lucia Kováčová — Project Coordinator\nCoordinated releases in an Agile team using Jira and Confluence. Helped with the product roadmap and customer interviews.\nPresented weekly updates to stakeholders. Ran A/B tests on onboarding emails.`,
      `Lucia Kováčová — Project Coordinator\nKoordinovala releasy v agilnom tíme s Jira a Confluence. Pomáhala s produktovou roadmapou a rozhovormi so zákazníkmi.\nKaždý týždeň prezentovala výsledky stakeholderom. Spúšťala A/B testy onboarding e-mailov.`
    ),
    summary: t("Applied directly. Light on ownership; screen before submitting.", "Prihlásila sa priamo. Slabšia na ownership; pred odoslaním preveriť."),
    consent: { status: "pending", grantedDaysAgo: null, expiresInDays: null }, createdDaysAgo: 3, lastContactDaysAgo: null,
  },
  {
    id: "cand-hudec", firstName: "Roman", lastName: "Hudec", title: t("Product Manager", "Product Manager"), location: "Košice", company: "Clinix Software", years: 7, salary: 60000,
    availability: t("2 months", "2 mesiace"), skills: ["Product roadmap", "Stakeholder management", "Agile", "Scrum", "Jira", "SQL", "Product analytics", "OKRs", "User research", "English"], tags: ["product", "senior"], source: "linkedin",
    cv: t(
      `Roman Hudec — Product Manager\n7 years owning the product roadmap for clinical software. Stakeholder management across medical, sales and engineering teams.\nAgile and Scrum delivery with Jira, OKRs, product analytics with SQL and Mixpanel. User research and usability testing. Excellent communication in English.`,
      `Roman Hudec — Product Manager\n7 rokov vlastníctva produktovej roadmapy klinického softvéru. Stakeholder management naprieč medicínskym, obchodným a vývojovým tímom.\nAgilné doručovanie v Scrume a Jira, OKR, produktová analytika v SQL a Mixpanel. Používateľský výskum a usability testovanie. Výborná komunikácia v angličtine.`
    ),
    summary: t("Health-tech PM — exactly Verdant's brief. Client interview booked.", "PM zo zdravotníckych technológií — presne zadanie Verdantu. Pohovor u klienta dohodnutý."),
    consent: { status: "granted", grantedDaysAgo: 6, expiresInDays: 359 }, createdDaysAgo: 6, lastContactDaysAgo: 0,
  },
  {
    id: "cand-balazova", firstName: "Eva", lastName: "Balážová", title: t("DevOps Engineer", "DevOps Engineer"), location: "Žilina", company: "Kovaľ Logistics", years: 6, salary: 48000,
    availability: t("Placed", "Umiestnená"), skills: ["Linux", "Docker", "Kubernetes", "CI/CD", "Terraform", "Git", "AWS", "Python"], tags: ["devops", "placed"], source: "database",
    cv: t(
      `Eva Balážová — DevOps Engineer\n6 years operating Linux infrastructure. Docker and Kubernetes clusters, GitLab CI/CD pipelines, Terraform for AWS. Python automation and Git.`,
      `Eva Balážová — DevOps Engineer\n6 rokov prevádzky linuxovej infraštruktúry. Docker a Kubernetes klastre, GitLab CI/CD pipeline, Terraform pre AWS. Automatizácia v Pythone a Git.`
    ),
    summary: t("Placed at Kovaľ Logistics. Check in before the guarantee ends.", "Umiestnená v Kovaľ Logistics. Ozvať sa pred koncom záruky."),
    consent: { status: "granted", grantedDaysAgo: 68, expiresInDays: 297 }, createdDaysAgo: 68, lastContactDaysAgo: 12,
  },
  {
    id: "cand-polak", firstName: "Juraj", lastName: "Polák", title: t("QA Engineer", "QA Engineer"), location: "Trenčín", company: "Testify", years: 4, salary: 38000,
    availability: t("1 month", "1 mesiac"), skills: ["Playwright", "Cypress", "TypeScript", "Unit testing", "CI/CD", "Git"], tags: ["qa"], source: "event",
    cv: t(
      `Juraj Polák — QA Engineer\n4 years of test automation with Playwright and Cypress in TypeScript. Unit testing strategy, CI/CD integration with GitHub Actions, Git.`,
      `Juraj Polák — QA Engineer\n4 roky automatizácie testov v Playwright a Cypress v TypeScripte. Stratégia unit testov, integrácia CI/CD cez GitHub Actions, Git.`
    ),
    summary: t("Met at a testing meetup. No open QA job yet — keep warm.", "Stretnutie na testovacom meetupe. Zatiaľ bez otvorenej QA pozície — udržiavať kontakt."),
    consent: { status: "granted", grantedDaysAgo: 370, expiresInDays: -5 }, createdDaysAgo: 370, lastContactDaysAgo: 60,
  },
  {
    id: "cand-mlynar", firstName: "Dávid", lastName: "Mlynár", title: t("Cloud Engineer", "Cloud Engineer"), location: "Bratislava", company: "Skyline Hosting", years: 5, salary: 52000,
    availability: t("2 months", "2 mesiace"), skills: ["AWS", "Linux", "Terraform", "Docker", "Kubernetes", "Python", "Git"], tags: ["cloud"], source: "linkedin",
    cv: t(
      `Dávid Mlynár — Cloud Engineer\n5 years building AWS infrastructure: EC2, S3, VPC, IAM. Terraform, Linux, Docker and Kubernetes. Python automation, Git.`,
      `Dávid Mlynár — Cloud Engineer\n5 rokov stavania AWS infraštruktúry: EC2, S3, VPC, IAM. Terraform, Linux, Docker a Kubernetes. Automatizácia v Pythone, Git.`
    ),
    summary: t("Rejected for DevOps at Kovaľ — salary too high for them.", "Zamietnutý na DevOps v Kovaľ — plat bol pre nich privysoký."),
    consent: { status: "granted", grantedDaysAgo: 60, expiresInDays: 305 }, createdDaysAgo: 60, lastContactDaysAgo: 30,
  },
  {
    id: "cand-simkova", firstName: "Nina", lastName: "Šimková", title: t("Data Scientist", "Data Scientist"), location: "Bratislava", company: "Quantrix", years: 3, salary: 50000,
    availability: t("3 months", "3 mesiace"), skills: ["Python", "SQL", "Machine learning", "Data analysis", "Tableau", "Git"], tags: ["data"], source: "job-board",
    cv: t(
      `Nina Šimková — Data Scientist\n3 years applying machine learning and statistical analysis in Python and SQL. Data analysis for pricing, Tableau reporting, Git.`,
      `Nina Šimková — Data Scientist\n3 roky strojového učenia a štatistickej analýzy v Pythone a SQL. Analýza dát pre pricing, reporty v Tableau, Git.`
    ),
    summary: t("Withdrew consent — do not contact.", "Odvolala súhlas — nekontaktovať."),
    consent: { status: "withdrawn", grantedDaysAgo: 90, expiresInDays: null }, createdDaysAgo: 90, lastContactDaysAgo: 25,
  },
];

// ── Applications ──────────────────────────────────────────────────────────────────────

interface SeedApplication {
  id: string; candidateId: string; jobId: string; score: number | null;
  /** Stage → days ago it was entered. */
  path: Array<[ApplicationStage, number]>;
  rejection?: Application["rejection"];
}

const APPLICATIONS: SeedApplication[] = [
  { id: "app-nagy-backend", candidateId: "cand-nagy", jobId: "job-backend", score: 92, path: [["sourced", 18], ["screening", 16], ["submitted", 12], ["interview", 7]] },
  { id: "app-bielikova-backend", candidateId: "cand-bielikova", jobId: "job-backend", score: 88, path: [["sourced", 30], ["screening", 27], ["submitted", 22], ["interview", 15], ["offer", 3]] },
  { id: "app-horvathova-backend", candidateId: "cand-horvathova", jobId: "job-backend", score: 84, path: [["sourced", 34], ["screening", 29]] },
  { id: "app-kovac-backend", candidateId: "cand-kovac", jobId: "job-backend", score: 71, path: [["sourced", 33], ["screening", 25], ["submitted", 11]] },
  { id: "app-sykora-data", candidateId: "cand-sykora", jobId: "job-data", score: 86, path: [["sourced", 15], ["screening", 12], ["submitted", 6]] },
  { id: "app-vargova-data", candidateId: "cand-vargova", jobId: "job-data", score: 57, path: [["sourced", 20], ["screening", 9]] },
  { id: "app-simkova-data", candidateId: "cand-simkova", jobId: "job-data", score: 43, path: [["sourced", 21], ["rejected", 19]], rejection: { reason: "withdrew", note: "" } },
  { id: "app-urban-frontend", candidateId: "cand-urban", jobId: "job-frontend", score: 95, path: [["sourced", 7], ["screening", 5], ["submitted", 2]] },
  { id: "app-novak-frontend", candidateId: "cand-novak", jobId: "job-frontend", score: 52, path: [["sourced", 10], ["screening", 4]] },
  { id: "app-hudec-pm", candidateId: "cand-hudec", jobId: "job-pm", score: 90, path: [["sourced", 6], ["screening", 5], ["submitted", 3], ["interview", 1]] },
  { id: "app-kovacova-pm", candidateId: "cand-kovacova", jobId: "job-pm", score: null, path: [["sourced", 3]] },
  { id: "app-balazova-devops", candidateId: "cand-balazova", jobId: "job-devops", score: 93, path: [["sourced", 68], ["screening", 65], ["submitted", 60], ["interview", 52], ["offer", 45], ["placed", 41]] },
  { id: "app-mlynar-devops", candidateId: "cand-mlynar", jobId: "job-devops", score: 80, path: [["sourced", 66], ["screening", 62], ["submitted", 58], ["rejected", 50]], rejection: { reason: "salary", note: "" } },
  { id: "app-vargova-analyst", candidateId: "cand-vargova", jobId: "job-analyst", score: 75, path: [["sourced", 44], ["screening", 40], ["submitted", 35]] },
];

interface SeedInterview {
  id: string; applicationId: string; type: Interview["type"]; inDays: number; hour: number; durationMinutes: number;
  interviewer: T | string; place: T | string; status: Interview["status"];
  scorecard?: { scores: number[]; recommendation: Recommendation; summary: T };
}

const INTERVIEWS: SeedInterview[] = [
  { id: "int-nagy-1", applicationId: "app-nagy-backend", type: "phone", inDays: -15, hour: 9, durationMinutes: 30, interviewer: t("You", "Vy"), place: t("Phone", "Telefón"), status: "done", scorecard: { scores: [5, 5, 4, 5, 4], recommendation: "strong-yes", summary: t("Deep payments experience, clear communicator, available now. Submit.", "Hlboká skúsenosť s platbami, jasne komunikuje, dostupný hneď. Odoslať.") } },
  { id: "int-nagy-2", applicationId: "app-nagy-backend", type: "client", inDays: 1, hour: 14, durationMinutes: 60, interviewer: "Tomáš Beňo (Lumen)", place: "https://meet.example/lumen-nagy", status: "scheduled" },
  { id: "int-bielikova-1", applicationId: "app-bielikova-backend", type: "client", inDays: -14, hour: 10, durationMinutes: 60, interviewer: "Tomáš Beňo (Lumen)", place: "https://meet.example/lumen-bielikova", status: "done", scorecard: { scores: [4, 4, 5, 4, 3], recommendation: "yes", summary: t("Strong engineer, salary expectation at the top of the range.", "Silná inžinierka, platové očakávanie na hornej hranici.") } },
  { id: "int-hudec-1", applicationId: "app-hudec-pm", type: "video", inDays: -4, hour: 11, durationMinutes: 45, interviewer: t("You", "Vy"), place: "https://meet.example/hudec", status: "done", scorecard: { scores: [5, 4, 5, 5, 4], recommendation: "strong-yes", summary: t("Owns outcomes, speaks the clinicians' language. Fast-track to the client.", "Vlastní výsledky, hovorí jazykom klinikov. Rýchlo ku klientovi.") } },
  { id: "int-hudec-2", applicationId: "app-hudec-pm", type: "client", inDays: 0, hour: 15, durationMinutes: 90, interviewer: "MUDr. Alena Rybárová (Verdant)", place: t("Verdant Health, Košice, 3rd floor", "Verdant Health, Košice, 3. poschodie"), status: "scheduled" },
  { id: "int-urban-1", applicationId: "app-urban-frontend", type: "phone", inDays: -3, hour: 16, durationMinutes: 30, interviewer: t("You", "Vy"), place: t("Phone", "Telefón"), status: "done", scorecard: { scores: [5, 4, 4, 4, 3], recommendation: "yes", summary: t("Technically excellent; three months' notice is the only risk.", "Technicky výborný; jediné riziko je trojmesačná výpovedná lehota.") } },
  { id: "int-sykora-1", applicationId: "app-sykora-data", type: "client", inDays: 3, hour: 10, durationMinutes: 60, interviewer: "Zuzana Majerová (Northwind)", place: "https://meet.example/northwind-sykora", status: "scheduled" },
  { id: "int-horvathova-1", applicationId: "app-horvathova-backend", type: "video", inDays: 2, hour: 9, durationMinutes: 30, interviewer: t("You", "Vy"), place: "https://meet.example/horvathova", status: "scheduled" },
];

const TASKS: Array<{ id: string; title: T; dueIn: number | null; done: boolean; candidateId?: string; jobId?: string }> = [
  { id: "task-1", title: t("Send Lumen the interview summary for L. Nagy", "Poslať Lumenu zhrnutie pohovoru L. Nagya"), dueIn: 0, done: false, candidateId: "cand-nagy", jobId: "job-backend" },
  { id: "task-2", title: t("Counter-offer call with A. Bieliková", "Telefonát o protiponuke s A. Bielikovou"), dueIn: 1, done: false, candidateId: "cand-bielikova", jobId: "job-backend" },
  { id: "task-3", title: t("Chase Verdant for feedback on R. Hudec", "Vypýtať od Verdantu feedback na R. Hudeca"), dueIn: 2, done: false, candidateId: "cand-hudec", jobId: "job-pm" },
  { id: "task-4", title: t("Renew K. Vargová's data consent", "Obnoviť súhlas K. Vargovej"), dueIn: -2, done: false, candidateId: "cand-vargova" },
  { id: "task-5", title: t("Guarantee check-in: E. Balážová at Kovaľ", "Kontrola v záruke: E. Balážová v Kovaľ"), dueIn: 7, done: false, candidateId: "cand-balazova", jobId: "job-devops" },
  { id: "task-6", title: t("Invoice Kovaľ Logistics for the DevOps placement", "Vyfakturovať Kovaľ Logistics za DevOps umiestnenie"), dueIn: -1, done: true, jobId: "job-devops" },
  { id: "task-7", title: t("Source 3 more Data Engineers for Northwind", "Vytipovať 3 ďalších Data Engineerov pre Northwind"), dueIn: 4, done: false, jobId: "job-data" },
];

const NOTES: Array<{ type: Activity["type"]; candidateId?: string; jobId?: string; clientId?: string; daysAgo: number; hour: number; text: T }> = [
  { type: "call", candidateId: "cand-nagy", jobId: "job-backend", daysAgo: 1, hour: 11, text: t("Prep call before the client interview. Confident; asked about on-call rota.", "Príprava pred pohovorom u klienta. Sebaistý; pýtal sa na on-call rotáciu.") },
  { type: "email", candidateId: "cand-bielikova", jobId: "job-backend", daysAgo: 0, hour: 9, text: t("Sent the written offer: 64,000 + 10% bonus. Replied she will decide by Friday.", "Poslaná písomná ponuka: 64 000 + 10 % bonus. Odpísala, že sa rozhodne do piatku.") },
  { type: "meeting", clientId: "cl-lumen", jobId: "job-backend", daysAgo: 3, hour: 14, text: t("Status call with Tomáš: they want to close the backend role this month.", "Status call s Tomášom: backend pozíciu chcú uzavrieť tento mesiac.") },
  { type: "call", candidateId: "cand-hudec", jobId: "job-pm", daysAgo: 0, hour: 8, text: t("Confirmed today's on-site at Verdant, 15:00. Sent him the clinical workflow deck.", "Potvrdené dnešné stretnutie vo Verdante o 15:00. Poslal som mu prezentáciu klinického workflow.") },
  { type: "note", candidateId: "cand-vargova", daysAgo: 9, hour: 10, text: t("Consent expires in 3 weeks — ask to renew at next contact.", "Súhlas vyprší o 3 týždne — pri ďalšom kontakte požiadať o obnovenie.") },
  { type: "email", candidateId: "cand-urban", jobId: "job-frontend", daysAgo: 2, hour: 17, text: t("Profile submitted to Lumen with scorecard summary.", "Profil odoslaný Lumenu so zhrnutím hodnotenia.") },
  { type: "note", clientId: "cl-koval", jobId: "job-devops", daysAgo: 12, hour: 13, text: t("Peter Šimko: Eva is doing great; wants a second DevOps next year.", "Peter Šimko: Eva je výborná; budúci rok chcú druhého DevOpsa.") },
  { type: "call", candidateId: "cand-sykora", jobId: "job-data", daysAgo: 3, hour: 15, text: t("Client interview booked for next week; remote-first is a must for him.", "Pohovor u klienta dohodnutý na budúci týždeň; remote-first je preňho podmienka.") },
  { type: "note", clientId: "cl-verdant", daysAgo: 40, hour: 10, text: t("Retained engagement signed: 25% fee, 1/3 on signing.", "Podpísaný retained mandát: 25 % odmena, 1/3 pri podpise.") },
];

// ── Assembly ──────────────────────────────────────────────────────────────────────────

export function seedWorkspace(locale: L, now = new Date()): Workspace {
  const ws = emptyWorkspace(locale, now);
  ws.settings.agencyName = locale === "sk" ? "Vaša agentúra" : "Your agency";

  ws.clients = CLIENTS.map<Client>((c) => ({
    id: c.id, name: c.name, industry: c.industry[locale], location: c.location, website: c.website,
    contactName: c.contactName, contactEmail: c.contactEmail, contactPhone: c.contactPhone,
    feePercent: c.feePercent, guaranteeDays: c.guaranteeDays, paymentTermsDays: c.paymentTermsDays,
    notes: c.notes[locale], createdAt: at(now, c.daysAgo),
  }));

  ws.jobs = JOBS.map<Job>((j) => ({
    id: j.id, clientId: j.clientId, title: j.title, location: j.location, workMode: j.workMode, employment: j.employment,
    salaryMin: j.salaryMin, salaryMax: j.salaryMax, feePercent: null, status: j.status, priority: j.priority,
    openedAt: day(now, -j.openedDaysAgo), deadline: j.deadlineIn === null ? null : day(now, j.deadlineIn),
    description: j.description[locale], mustHave: j.mustHave, niceToHave: j.niceToHave,
    owner: locale === "sk" ? "Vy" : "You", createdAt: at(now, j.openedDaysAgo),
  }));

  ws.candidates = CANDIDATES.map<Candidate>((c) => ({
    id: c.id, firstName: c.firstName, lastName: c.lastName, email: `${c.firstName}.${c.lastName}@example.com`.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase(),
    phone: `+421 900 ${String(100 + CANDIDATES.indexOf(c)).padStart(3, "0")} 000`, title: c.title[locale], location: c.location,
    currentCompany: c.company, yearsExperience: c.years, salaryExpectation: c.salary, availability: c.availability[locale],
    skills: c.skills, tags: c.tags, source: c.source, linkedin: "", cvText: c.cv[locale], summary: c.summary[locale],
    consent: {
      status: c.consent.status,
      grantedAt: c.consent.grantedDaysAgo === null ? null : day(now, -c.consent.grantedDaysAgo),
      expiresAt: c.consent.expiresInDays === null ? null : day(now, c.consent.expiresInDays),
    },
    anonymized: false, createdAt: at(now, c.createdDaysAgo), lastContactAt: c.lastContactDaysAgo === null ? null : at(now, c.lastContactDaysAgo, 11),
  }));

  // Stored scores are the analyzer's own, so "Score with the matcher" never contradicts
  // the card; `null` stays null (the demo keeps one unscored application on purpose).
  const scoreOf = (a: SeedApplication): number | null => {
    if (a.score === null) return null;
    const cand = ws.candidates.find((c) => c.id === a.candidateId);
    const job = ws.jobs.find((j) => j.id === a.jobId);
    return cand && job ? (analyzeCv(cand.cvText, job.description)?.score ?? a.score) : a.score;
  };
  ws.applications = APPLICATIONS.map<Application>((a) => ({
    id: a.id, candidateId: a.candidateId, jobId: a.jobId, score: scoreOf(a),
    stage: a.path[a.path.length - 1]![0],
    history: a.path.map(([stage, daysAgo]) => ({ stage, at: at(now, daysAgo, 10) })),
    rejection: a.rejection ?? null, createdAt: at(now, a.path[0]![1]),
  }));

  const criteria = locale === "sk"
    ? ["Odborná zhoda", "Hĺbka praxe", "Komunikácia", "Motivácia pre rolu", "Plat a dostupnosť"]
    : ["Technical fit", "Experience depth", "Communication", "Motivation for the role", "Salary & availability"];
  ws.interviews = INTERVIEWS.map<Interview>((i) => ({
    id: i.id, applicationId: i.applicationId, type: i.type, scheduledAt: at(now, -i.inDays, i.hour), durationMinutes: i.durationMinutes,
    interviewer: typeof i.interviewer === "string" ? i.interviewer : i.interviewer[locale], place: typeof i.place === "string" ? i.place : i.place[locale],
    status: i.status, createdAt: at(now, Math.max(0, -i.inDays) + 2),
    scorecard: i.scorecard
      ? { criteria: criteria.map((name, k) => ({ name, score: i.scorecard!.scores[k] ?? null, note: "" })), recommendation: i.scorecard.recommendation, summary: i.scorecard.summary[locale] }
      : null,
  }));

  const placedAt = at(now, 41);
  ws.placements = [
    {
      id: "pl-balazova", applicationId: "app-balazova-devops", candidateId: "cand-balazova", jobId: "job-devops", clientId: "cl-koval",
      startDate: day(now, -27), salary: 47000, feePercent: 20, feeAmount: 9400, guaranteeDays: 90, guaranteeUntil: addDays(day(now, -27), 90),
      invoiceStatus: "sent", createdAt: placedAt,
    },
    {
      id: "pl-earlier", applicationId: "app-earlier", candidateId: "cand-kovac", jobId: "job-earlier", clientId: "cl-northwind",
      startDate: day(now, -140), salary: 45000, feePercent: 22, feeAmount: 9900, guaranteeDays: 90, guaranteeUntil: addDays(day(now, -140), 90),
      invoiceStatus: "paid", createdAt: at(now, 150),
    },
  ];
  // The earlier placement needs its (now closed) job and application so reports can read them.
  ws.jobs.push({
    id: "job-earlier", clientId: "cl-northwind", title: "Backend Developer (Python)", location: "Bratislava", workMode: "hybrid", employment: "permanent",
    salaryMin: 42000, salaryMax: 48000, feePercent: null, status: "filled", priority: "normal", openedAt: day(now, -188), deadline: null,
    description: locale === "sk" ? "Backend Developer (Python)\nPožadujeme:\n- Python\n- PostgreSQL\n- REST APIs\n- Docker" : "Backend Developer (Python)\nRequirements:\n- Python\n- PostgreSQL\n- REST APIs\n- Docker",
    mustHave: ["Python", "PostgreSQL", "REST APIs", "Docker"], niceToHave: [], owner: locale === "sk" ? "Vy" : "You", createdAt: at(now, 188),
  });
  ws.applications.push({
    id: "app-earlier", candidateId: "cand-kovac", jobId: "job-earlier", score: 78, stage: "placed",
    history: [["sourced", 186], ["screening", 182], ["submitted", 176], ["interview", 168], ["offer", 156], ["placed", 150]].map(([s, d]) => ({ stage: s as ApplicationStage, at: at(now, d as number) })),
    rejection: null, createdAt: at(now, 186),
  });

  ws.tasks = TASKS.map<Task>((task) => ({
    id: task.id, title: task.title[locale], dueAt: task.dueIn === null ? null : day(now, task.dueIn), done: task.done,
    candidateId: task.candidateId ?? null, jobId: task.jobId ?? null, createdAt: at(now, 5),
  }));

  const stageLabel: Record<L, Record<ApplicationStage, string>> = {
    en: { sourced: "Sourced", screening: "Screening", submitted: "Submitted", interview: "Interview", offer: "Offer", placed: "Placed", rejected: "Rejected" },
    sk: { sourced: "Vytipovaní", screening: "Screening", submitted: "Odoslaní klientovi", interview: "Pohovor", offer: "Ponuka", placed: "Umiestnení", rejected: "Zamietnutí" },
  };
  const stageActivities: Activity[] = ws.applications.flatMap((app) =>
    app.history.map((h, k) => ({
      id: `act-${app.id}-${k}`, type: "stage" as const, candidateId: app.candidateId, jobId: app.jobId, clientId: null, at: h.at,
      text: locale === "sk" ? `Fáza: ${stageLabel.sk[h.stage]}` : `Stage: ${stageLabel.en[h.stage]}`,
    }))
  );
  const notes: Activity[] = NOTES.map((n, k) => ({
    id: `act-note-${k}`, type: n.type, candidateId: n.candidateId ?? null, jobId: n.jobId ?? null, clientId: n.clientId ?? null,
    at: at(now, n.daysAgo, n.hour), text: n.text[locale],
  }));
  ws.activities = [...stageActivities, ...notes].sort((a, b) => b.at.localeCompare(a.at));

  // The consent dates above are relative; the one that "expires in 20 days" also needs a
  // grant date consistent with the configured validity, so renewals read sensibly.
  for (const c of ws.candidates) {
    if (c.consent.status === "granted" && c.consent.grantedAt && !c.consent.expiresAt) {
      c.consent.expiresAt = addMonths(c.consent.grantedAt, ws.settings.consentMonths);
    }
  }
  return ws;
}
