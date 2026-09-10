// Synthetic demo data for CivicFlow. Every service, citizen, and application
// here is fabricated for demonstration purposes only — see build brief §37.
// Run with `npm run db:seed`.

import { PrismaClient, Role, ServiceCategory, RequirementType, RequirementNecessity, ApplicationStatus, DocumentStatus, DeadlineKind, BlockerOwner, BlockerStatus } from "@prisma/client";
import { hashPassword } from "../src/lib/auth/password";
import { RuleNode } from "../src/lib/eligibility/types";
import { evaluateEligibility } from "../src/lib/eligibility/evaluate";
import { deriveBlockers } from "../src/lib/workflow/blockers";

const prisma = new PrismaClient();

// Small deterministic PRNG so re-seeding produces the same dataset.
function makeRng(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}
const rng = makeRng(42);
function pick<T>(arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}
function randInt(min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

const DEMO_PASSWORD = "CivicFlow!2026";

async function main() {
  console.log("Seeding CivicFlow synthetic demo data...");

  // -------------------------------------------------------------------
  // Clear existing data (idempotent local re-seed only — never run against
  // a real deployment's database).
  // -------------------------------------------------------------------
  await prisma.notification.deleteMany();
  await prisma.auditEvent.deleteMany();
  await prisma.aIRecommendation.deleteMany();
  await prisma.caseNote.deleteMany();
  await prisma.benefit.deleteMany();
  await prisma.deadline.deleteMany();
  await prisma.applicationBlocker.deleteMany();
  await prisma.applicationEvent.deleteMany();
  await prisma.applicationDocument.deleteMany();
  await prisma.application.deleteMany();
  await prisma.requirement.deleteMany();
  await prisma.eligibilityRuleSet.deleteMany();
  await prisma.service.deleteMany();
  await prisma.department.deleteMany();
  await prisma.citizenProfile.deleteMany();
  await prisma.user.deleteMany();

  // -------------------------------------------------------------------
  // Departments
  // -------------------------------------------------------------------
  const departmentDefs = [
    { name: "Department of Education", description: "Administers education access and scholarship programs.", jurisdiction: "State of Maharashtra" },
    { name: "Department of Health & Family Welfare", description: "Administers healthcare access programs.", jurisdiction: "State of Maharashtra" },
    { name: "Department of Labour & Employment", description: "Administers employment and skilling programs.", jurisdiction: "State of Maharashtra" },
    { name: "Department of Housing & Urban Affairs", description: "Administers housing assistance programs.", jurisdiction: "State of Maharashtra" },
    { name: "Department of Agriculture & Farmers Welfare", description: "Administers agricultural support programs.", jurisdiction: "State of Maharashtra" },
    { name: "Department of Micro, Small & Medium Enterprises", description: "Administers small business support programs.", jurisdiction: "State of Maharashtra" },
    { name: "Department of Social Justice & Empowerment", description: "Administers social support and disability programs.", jurisdiction: "State of Maharashtra" },
    { name: "Department of Digital Services & Identity", description: "Administers digital skilling and identity documentation programs.", jurisdiction: "State of Maharashtra" },
  ];
  const departments: Awaited<ReturnType<typeof prisma.department.create>>[] = [];
  for (const def of departmentDefs) {
    departments.push(await prisma.department.create({ data: def }));
  }
  const dept = (name: string) => departments.find((d) => d.name === name)!;

  // -------------------------------------------------------------------
  // Services (each: category, department, eligibility rule tree, requirements)
  // -------------------------------------------------------------------
  interface ServiceDef {
    name: string;
    description: string;
    category: ServiceCategory;
    department: string;
    priority: number;
    processingDays: number;
    rules: RuleNode;
    requirements: { type: RequirementType; necessity: RequirementNecessity; name: string; description: string; conditionField?: string; conditionValue?: string }[];
  }

  const serviceDefs: ServiceDef[] = [
    {
      name: "Student Education Support",
      description: "Synthetic demonstration service. Income-based tuition support for enrolled students.",
      category: ServiceCategory.EDUCATION,
      department: "Department of Education",
      priority: 8,
      processingDays: 21,
      rules: {
        all: [
          { field: "age", operator: ">=", value: 16, label: "Age at least 16" },
          { field: "age", operator: "<=", value: 25, label: "Age at most 25" },
          { field: "annualIncome", operator: "<=", value: 500000, label: "Household income at most ₹5,00,000" },
          { field: "residency", operator: "=", value: "Maharashtra", label: "Resident of Maharashtra" },
          { field: "studentStatus", operator: "=", value: true, label: "Currently enrolled as a student" },
        ],
      },
      requirements: [
        { type: RequirementType.DOCUMENT, necessity: RequirementNecessity.REQUIRED, name: "Identity proof", description: "Government-issued identity document (demo)." },
        { type: RequirementType.DOCUMENT, necessity: RequirementNecessity.REQUIRED, name: "Income certificate", description: "Household income certificate (demo)." },
        { type: RequirementType.DOCUMENT, necessity: RequirementNecessity.REQUIRED, name: "Enrollment proof", description: "Proof of current enrollment (demo)." },
        { type: RequirementType.DOCUMENT, necessity: RequirementNecessity.OPTIONAL, name: "Merit certificate", description: "Academic merit certificate, if available (demo)." },
      ],
    },
    {
      name: "Digital Skills Scholarship",
      description: "Synthetic demonstration service. Funded digital-skills training for young adults.",
      category: ServiceCategory.EDUCATION,
      department: "Department of Digital Services & Identity",
      priority: 6,
      processingDays: 14,
      rules: {
        all: [
          { field: "age", operator: ">=", value: 18, label: "Age at least 18" },
          { field: "age", operator: "<=", value: 35, label: "Age at most 35" },
          { any: [
            { field: "employmentStatus", operator: "=", value: "unemployed", label: "Currently unemployed" },
            { field: "studentStatus", operator: "=", value: true, label: "Currently a student" },
          ] },
        ],
      },
      requirements: [
        { type: RequirementType.DOCUMENT, necessity: RequirementNecessity.REQUIRED, name: "Identity proof", description: "Government-issued identity document (demo)." },
        { type: RequirementType.DOCUMENT, necessity: RequirementNecessity.REQUIRED, name: "Residency proof", description: "Proof of current residency (demo)." },
      ],
    },
    {
      name: "Healthcare Access Support",
      description: "Synthetic demonstration service. Subsidized healthcare access for low-income households.",
      category: ServiceCategory.HEALTHCARE,
      department: "Department of Health & Family Welfare",
      priority: 9,
      processingDays: 10,
      rules: {
        all: [
          { field: "annualIncome", operator: "<=", value: 300000, label: "Household income at most ₹3,00,000" },
          { field: "residency", operator: "=", value: "Maharashtra", label: "Resident of Maharashtra" },
        ],
      },
      requirements: [
        { type: RequirementType.DOCUMENT, necessity: RequirementNecessity.REQUIRED, name: "Identity proof", description: "Government-issued identity document (demo)." },
        { type: RequirementType.DOCUMENT, necessity: RequirementNecessity.REQUIRED, name: "Income certificate", description: "Household income certificate (demo)." },
        { type: RequirementType.DOCUMENT, necessity: RequirementNecessity.REQUIRED, name: "Residency proof", description: "Proof of current residency (demo)." },
      ],
    },
    {
      name: "Senior Citizen Support",
      description: "Synthetic demonstration service. Monthly support stipend for senior citizens.",
      category: ServiceCategory.HEALTHCARE,
      department: "Department of Health & Family Welfare",
      priority: 7,
      processingDays: 14,
      rules: {
        all: [
          { field: "age", operator: ">=", value: 60, label: "Age at least 60" },
          { field: "residency", operator: "=", value: "Maharashtra", label: "Resident of Maharashtra" },
        ],
      },
      requirements: [
        { type: RequirementType.DOCUMENT, necessity: RequirementNecessity.REQUIRED, name: "Identity proof", description: "Government-issued identity document (demo)." },
        { type: RequirementType.DOCUMENT, necessity: RequirementNecessity.REQUIRED, name: "Age proof", description: "Proof of date of birth (demo)." },
      ],
    },
    {
      name: "Employment Assistance Program",
      description: "Synthetic demonstration service. Job placement and training support.",
      category: ServiceCategory.EMPLOYMENT,
      department: "Department of Labour & Employment",
      priority: 8,
      processingDays: 18,
      rules: {
        all: [
          { field: "age", operator: ">=", value: 18, label: "Age at least 18" },
          { field: "employmentStatus", operator: "=", value: "unemployed", label: "Currently unemployed" },
          { field: "residency", operator: "=", value: "Maharashtra", label: "Resident of Maharashtra" },
        ],
      },
      requirements: [
        { type: RequirementType.DOCUMENT, necessity: RequirementNecessity.REQUIRED, name: "Identity proof", description: "Government-issued identity document (demo)." },
        { type: RequirementType.DOCUMENT, necessity: RequirementNecessity.REQUIRED, name: "Residency proof", description: "Proof of current residency (demo)." },
        { type: RequirementType.DOCUMENT, necessity: RequirementNecessity.REQUIRED, name: "Educational qualification proof", description: "Highest qualification certificate (demo)." },
      ],
    },
    {
      name: "Women Entrepreneurship Support",
      description: "Synthetic demonstration service. Seed funding and mentorship for women-owned businesses.",
      category: ServiceCategory.SMALL_BUSINESS,
      department: "Department of Micro, Small & Medium Enterprises",
      priority: 7,
      processingDays: 25,
      rules: {
        all: [
          { field: "age", operator: ">=", value: 18, label: "Age at least 18" },
          { field: "businessOwner", operator: "=", value: true, label: "Owns or is starting a business" },
          { field: "annualIncome", operator: "<=", value: 1000000, label: "Household income at most ₹10,00,000" },
        ],
      },
      requirements: [
        { type: RequirementType.DOCUMENT, necessity: RequirementNecessity.REQUIRED, name: "Identity proof", description: "Government-issued identity document (demo)." },
        { type: RequirementType.DOCUMENT, necessity: RequirementNecessity.REQUIRED, name: "Business registration proof", description: "Business registration or intent document (demo)." },
        { type: RequirementType.DOCUMENT, necessity: RequirementNecessity.REQUIRED, name: "Income certificate", description: "Household income certificate (demo)." },
      ],
    },
    {
      name: "Small Business Startup Support",
      description: "Synthetic demonstration service. Low-interest startup loans for new small businesses.",
      category: ServiceCategory.SMALL_BUSINESS,
      department: "Department of Micro, Small & Medium Enterprises",
      priority: 6,
      processingDays: 30,
      rules: {
        all: [
          { field: "age", operator: ">=", value: 21, label: "Age at least 21" },
          { field: "businessOwner", operator: "=", value: true, label: "Owns or is starting a business" },
        ],
      },
      requirements: [
        { type: RequirementType.DOCUMENT, necessity: RequirementNecessity.REQUIRED, name: "Identity proof", description: "Government-issued identity document (demo)." },
        { type: RequirementType.DOCUMENT, necessity: RequirementNecessity.REQUIRED, name: "Business plan document", description: "Business plan or proposal (demo)." },
      ],
    },
    {
      name: "Housing Assistance",
      description: "Synthetic demonstration service. Rental support for low-income households.",
      category: ServiceCategory.HOUSING,
      department: "Department of Housing & Urban Affairs",
      priority: 9,
      processingDays: 20,
      rules: {
        all: [
          { field: "annualIncome", operator: "<=", value: 400000, label: "Household income at most ₹4,00,000" },
          { field: "housingStatus", operator: "IN", value: ["renting", "homeless"], label: "Currently renting or without stable housing" },
          { field: "residency", operator: "=", value: "Maharashtra", label: "Resident of Maharashtra" },
        ],
      },
      requirements: [
        { type: RequirementType.DOCUMENT, necessity: RequirementNecessity.REQUIRED, name: "Identity proof", description: "Government-issued identity document (demo)." },
        { type: RequirementType.DOCUMENT, necessity: RequirementNecessity.REQUIRED, name: "Income certificate", description: "Household income certificate (demo)." },
        { type: RequirementType.DOCUMENT, necessity: RequirementNecessity.REQUIRED, name: "Housing status proof", description: "Current rental agreement or housing status document (demo)." },
      ],
    },
    {
      name: "Senior Housing Support",
      description: "Synthetic demonstration service. Home modification grants for senior citizens.",
      category: ServiceCategory.HOUSING,
      department: "Department of Housing & Urban Affairs",
      priority: 5,
      processingDays: 25,
      rules: {
        all: [
          { field: "age", operator: ">=", value: 60, label: "Age at least 60" },
          { field: "housingStatus", operator: "=", value: "owned", label: "Owns current residence" },
        ],
      },
      requirements: [
        { type: RequirementType.DOCUMENT, necessity: RequirementNecessity.REQUIRED, name: "Identity proof", description: "Government-issued identity document (demo)." },
        { type: RequirementType.DOCUMENT, necessity: RequirementNecessity.REQUIRED, name: "Property ownership proof", description: "Proof of property ownership (demo)." },
      ],
    },
    {
      name: "Agricultural Equipment Support",
      description: "Synthetic demonstration service. Subsidized equipment grants for farmers.",
      category: ServiceCategory.AGRICULTURE,
      department: "Department of Agriculture & Farmers Welfare",
      priority: 6,
      processingDays: 21,
      rules: {
        all: [
          { field: "agricultureLand", operator: "=", value: true, label: "Owns or leases agricultural land" },
          { field: "residency", operator: "=", value: "Maharashtra", label: "Resident of Maharashtra" },
        ],
      },
      requirements: [
        { type: RequirementType.DOCUMENT, necessity: RequirementNecessity.REQUIRED, name: "Identity proof", description: "Government-issued identity document (demo)." },
        { type: RequirementType.DOCUMENT, necessity: RequirementNecessity.REQUIRED, name: "Land ownership proof", description: "Agricultural land record (demo)." },
      ],
    },
    {
      name: "Farmer Income Support",
      description: "Synthetic demonstration service. Direct income support for small and marginal farmers.",
      category: ServiceCategory.AGRICULTURE,
      department: "Department of Agriculture & Farmers Welfare",
      priority: 8,
      processingDays: 15,
      rules: {
        all: [
          { field: "agricultureLand", operator: "=", value: true, label: "Owns or leases agricultural land" },
          { field: "annualIncome", operator: "<=", value: 600000, label: "Household income at most ₹6,00,000" },
        ],
      },
      requirements: [
        { type: RequirementType.DOCUMENT, necessity: RequirementNecessity.REQUIRED, name: "Identity proof", description: "Government-issued identity document (demo)." },
        { type: RequirementType.DOCUMENT, necessity: RequirementNecessity.REQUIRED, name: "Land ownership proof", description: "Agricultural land record (demo)." },
        { type: RequirementType.DOCUMENT, necessity: RequirementNecessity.REQUIRED, name: "Income certificate", description: "Household income certificate (demo)." },
      ],
    },
    {
      name: "Disability Accessibility Assistance",
      description: "Synthetic demonstration service. Accessibility equipment and home-modification grants.",
      category: ServiceCategory.DISABILITY_SUPPORT,
      department: "Department of Social Justice & Empowerment",
      priority: 9,
      processingDays: 16,
      rules: {
        all: [
          { field: "disabilityStatus", operator: "=", value: true, label: "Has a registered disability" },
          { field: "residency", operator: "=", value: "Maharashtra", label: "Resident of Maharashtra" },
        ],
      },
      requirements: [
        { type: RequirementType.DOCUMENT, necessity: RequirementNecessity.REQUIRED, name: "Identity proof", description: "Government-issued identity document (demo)." },
        { type: RequirementType.DOCUMENT, necessity: RequirementNecessity.REQUIRED, name: "Disability certificate", description: "Registered disability certificate (demo)." },
      ],
    },
    {
      name: "Social Support Stipend",
      description: "Synthetic demonstration service. Monthly stipend for households below the poverty line.",
      category: ServiceCategory.SOCIAL_SUPPORT,
      department: "Department of Social Justice & Empowerment",
      priority: 8,
      processingDays: 12,
      rules: {
        all: [
          { field: "annualIncome", operator: "<=", value: 200000, label: "Household income at most ₹2,00,000" },
          { field: "householdSize", operator: ">=", value: 1, label: "Household size recorded" },
        ],
      },
      requirements: [
        { type: RequirementType.DOCUMENT, necessity: RequirementNecessity.REQUIRED, name: "Identity proof", description: "Government-issued identity document (demo)." },
        { type: RequirementType.DOCUMENT, necessity: RequirementNecessity.REQUIRED, name: "Income certificate", description: "Household income certificate (demo)." },
      ],
    },
    {
      name: "Dependent Family Support",
      description: "Synthetic demonstration service. Additional support for households with multiple dependents.",
      category: ServiceCategory.SOCIAL_SUPPORT,
      department: "Department of Social Justice & Empowerment",
      priority: 5,
      processingDays: 14,
      rules: {
        all: [
          { field: "dependents", operator: ">=", value: 2, label: "At least 2 dependents" },
          { field: "annualIncome", operator: "<=", value: 500000, label: "Household income at most ₹5,00,000" },
        ],
      },
      requirements: [
        { type: RequirementType.DOCUMENT, necessity: RequirementNecessity.REQUIRED, name: "Identity proof", description: "Government-issued identity document (demo)." },
        { type: RequirementType.DOCUMENT, necessity: RequirementNecessity.REQUIRED, name: "Household composition proof", description: "Document listing dependents (demo)." },
      ],
    },
    {
      name: "Public Utility Connection Support",
      description: "Synthetic demonstration service. Subsidized utility connections for new households.",
      category: ServiceCategory.PUBLIC_UTILITIES,
      department: "Department of Housing & Urban Affairs",
      priority: 4,
      processingDays: 10,
      rules: {
        all: [
          { field: "residency", operator: "=", value: "Maharashtra", label: "Resident of Maharashtra" },
          { field: "annualIncome", operator: "<=", value: 700000, label: "Household income at most ₹7,00,000" },
        ],
      },
      requirements: [
        { type: RequirementType.DOCUMENT, necessity: RequirementNecessity.REQUIRED, name: "Identity proof", description: "Government-issued identity document (demo)." },
        { type: RequirementType.DOCUMENT, necessity: RequirementNecessity.REQUIRED, name: "Residency proof", description: "Proof of current residency (demo)." },
      ],
    },
    {
      name: "Identity Documentation Assistance",
      description: "Synthetic demonstration service. Assistance obtaining foundational identity documents.",
      category: ServiceCategory.IDENTITY_DOCUMENTATION,
      department: "Department of Digital Services & Identity",
      priority: 7,
      processingDays: 7,
      rules: {
        all: [
          { field: "residency", operator: "=", value: "Maharashtra", label: "Resident of Maharashtra" },
        ],
      },
      requirements: [
        { type: RequirementType.DOCUMENT, necessity: RequirementNecessity.REQUIRED, name: "Residency proof", description: "Proof of current residency (demo)." },
        { type: RequirementType.DOCUMENT, necessity: RequirementNecessity.REQUIRED, name: "Birth record or affidavit", description: "Birth record or a sworn affidavit (demo)." },
      ],
    },
    {
      name: "Rural Electrification Support",
      description: "Synthetic demonstration service. Subsidized household electricity connections in rural areas.",
      category: ServiceCategory.PUBLIC_UTILITIES,
      department: "Department of Housing & Urban Affairs",
      priority: 5,
      processingDays: 18,
      rules: {
        all: [
          { field: "age", operator: ">=", value: 18, label: "Age at least 18" },
          { field: "residency", operator: "=", value: "Maharashtra", label: "Resident of Maharashtra" },
          { field: "housingStatus", operator: "IN", value: ["owned", "renting"], label: "Owns or rents current residence" },
          { field: "annualIncome", operator: "<=", value: 800000, label: "Household income at most ₹8,00,000" },
        ],
      },
      requirements: [
        { type: RequirementType.DOCUMENT, necessity: RequirementNecessity.REQUIRED, name: "Identity proof", description: "Government-issued identity document (demo)." },
        { type: RequirementType.DOCUMENT, necessity: RequirementNecessity.REQUIRED, name: "Residency proof", description: "Proof of current residency (demo)." },
        { type: RequirementType.DOCUMENT, necessity: RequirementNecessity.REQUIRED, name: "Electricity connection application", description: "Completed connection application form (demo)." },
        { type: RequirementType.DOCUMENT, necessity: RequirementNecessity.REQUIRED, name: "Housing status proof", description: "Current ownership or rental document (demo)." },
        { type: RequirementType.DOCUMENT, necessity: RequirementNecessity.OPTIONAL, name: "Income certificate", description: "Household income certificate, if available (demo)." },
      ],
    },
    {
      name: "Startup Digital Presence Grant",
      description: "Synthetic demonstration service. Small grant for new businesses to build a digital storefront.",
      category: ServiceCategory.SMALL_BUSINESS,
      department: "Department of Micro, Small & Medium Enterprises",
      priority: 4,
      processingDays: 14,
      rules: {
        all: [
          { field: "age", operator: ">=", value: 18, label: "Age at least 18" },
          { field: "businessOwner", operator: "=", value: true, label: "Owns or is starting a business" },
          { field: "annualIncome", operator: "<=", value: 1500000, label: "Household income at most ₹15,00,000" },
        ],
      },
      requirements: [
        { type: RequirementType.DOCUMENT, necessity: RequirementNecessity.REQUIRED, name: "Identity proof", description: "Government-issued identity document (demo)." },
        { type: RequirementType.DOCUMENT, necessity: RequirementNecessity.REQUIRED, name: "Business registration proof", description: "Business registration or intent document (demo)." },
        { type: RequirementType.DOCUMENT, necessity: RequirementNecessity.REQUIRED, name: "Digital plan document", description: "A short plan describing the intended digital storefront (demo)." },
      ],
    },
    {
      name: "Maternal Health Support",
      description: "Synthetic demonstration service. Subsidized prenatal and postnatal healthcare access.",
      category: ServiceCategory.HEALTHCARE,
      department: "Department of Health & Family Welfare",
      priority: 9,
      processingDays: 10,
      rules: {
        all: [
          { field: "age", operator: ">=", value: 18, label: "Age at least 18" },
          { field: "age", operator: "<=", value: 45, label: "Age at most 45" },
          { field: "residency", operator: "=", value: "Maharashtra", label: "Resident of Maharashtra" },
          { field: "annualIncome", operator: "<=", value: 450000, label: "Household income at most ₹4,50,000" },
        ],
      },
      requirements: [
        { type: RequirementType.DOCUMENT, necessity: RequirementNecessity.REQUIRED, name: "Identity proof", description: "Government-issued identity document (demo)." },
        { type: RequirementType.DOCUMENT, necessity: RequirementNecessity.REQUIRED, name: "Income certificate", description: "Household income certificate (demo)." },
        { type: RequirementType.DOCUMENT, necessity: RequirementNecessity.REQUIRED, name: "Medical registration proof", description: "Proof of prenatal care registration (demo)." },
        { type: RequirementType.DOCUMENT, necessity: RequirementNecessity.OPTIONAL, name: "Hospital referral letter", description: "Referral letter from a healthcare provider, if available (demo)." },
      ],
    },
  ];

  type SeededService = Awaited<ReturnType<typeof prisma.service.create>> & {
    rules: RuleNode;
    requirements: Awaited<ReturnType<typeof prisma.requirement.create>>[];
  };
  const services: SeededService[] = [];
  for (const def of serviceDefs) {
    const service = await prisma.service.create({
      data: {
        name: def.name,
        description: def.description,
        category: def.category,
        jurisdiction: "Maharashtra",
        departmentId: dept(def.department).id,
        priority: def.priority,
        processingDays: def.processingDays,
        isSynthetic: true,
      },
    });
    await prisma.eligibilityRuleSet.create({
      data: { serviceId: service.id, version: 1, rules: JSON.stringify(def.rules) },
    });
    const createdRequirements = [];
    for (const req of def.requirements) {
      createdRequirements.push(
        await prisma.requirement.create({
          data: {
            serviceId: service.id,
            type: req.type,
            necessity: req.necessity,
            name: req.name,
            description: req.description,
            conditionField: req.conditionField,
            conditionValue: req.conditionValue,
          },
        })
      );
    }
    services.push({ ...service, rules: def.rules, requirements: createdRequirements });
  }
  console.log(`Created ${departments.length} departments, ${services.length} services.`);

  // -------------------------------------------------------------------
  // Demo accounts (one per role — documented in README)
  // -------------------------------------------------------------------
  const demoPasswordHash = await hashPassword(DEMO_PASSWORD);

  const demoCitizenUser = await prisma.user.create({
    data: { email: "citizen@civicflow.dev", passwordHash: demoPasswordHash, name: "Asha Verma", role: Role.CITIZEN },
  });
  const demoCitizenProfile = await prisma.citizenProfile.create({
    data: {
      userId: demoCitizenUser.id,
      age: 22,
      location: "Pune",
      residency: "Maharashtra",
      annualIncome: 320000,
      employmentStatus: "unemployed",
      educationLevel: "undergraduate",
      householdSize: 4,
      dependents: 1,
      businessOwner: false,
      housingStatus: "renting",
      disabilityStatus: false,
      studentStatus: true,
      agricultureLand: false,
    },
  });

  const caseWorkerUser = await prisma.user.create({
    data: { email: "caseworker@civicflow.dev", passwordHash: demoPasswordHash, name: "Rahul Deshmukh", role: Role.CASE_WORKER },
  });
  await prisma.user.create({
    data: { email: "admin@civicflow.dev", passwordHash: demoPasswordHash, name: "Priya Nair", role: Role.SERVICE_ADMIN },
  });
  await prisma.user.create({
    data: { email: "sysadmin@civicflow.dev", passwordHash: demoPasswordHash, name: "System Administrator", role: Role.SYSTEM_ADMIN },
  });

  console.log("Created 4 demo accounts (citizen, case worker, service admin, system admin).");

  // -------------------------------------------------------------------
  // Bulk synthetic citizens (25 total, including the demo citizen above)
  // -------------------------------------------------------------------
  const firstNames = ["Aarav", "Vivaan", "Aditya", "Diya", "Ananya", "Ishaan", "Kavya", "Meera", "Rohan", "Sanya", "Kabir", "Neha", "Arjun", "Pooja", "Rakesh", "Sneha", "Vikram", "Anjali", "Sameer", "Divya", "Manoj", "Ritu", "Suresh", "Lakshmi"];
  const cities = ["Pune", "Mumbai", "Nagpur", "Nashik", "Aurangabad", "Thane", "Solapur", "Kolhapur"];
  const employment = ["employed", "unemployed", "self-employed", "retired"];
  const housing = ["renting", "owned", "homeless"];
  const education = ["secondary", "undergraduate", "postgraduate", "none"];

  const citizenProfiles = [demoCitizenProfile];
  for (let i = 0; i < 24; i++) {
    const name = `${pick(firstNames)} ${["Sharma", "Patil", "Kulkarni", "Iyer", "Reddy", "Singh", "Gupta", "Joshi"][i % 8]}`;
    const user = await prisma.user.create({
      data: {
        email: `citizen${i + 1}@demo.civicflow.dev`,
        passwordHash: demoPasswordHash,
        name,
        role: Role.CITIZEN,
      },
    });
    const age = randInt(16, 75);
    const isComplete = rng() > 0.25; // ~75% complete profiles, rest intentionally partial (missing info scenario)
    const profile = await prisma.citizenProfile.create({
      data: {
        userId: user.id,
        age,
        location: pick(cities),
        residency: rng() > 0.15 ? "Maharashtra" : "Gujarat",
        annualIncome: isComplete ? randInt(80000, 1200000) : rng() > 0.5 ? randInt(80000, 1200000) : null,
        employmentStatus: isComplete ? pick(employment) : null,
        educationLevel: pick(education),
        householdSize: randInt(1, 7),
        dependents: randInt(0, 4),
        businessOwner: rng() > 0.8,
        housingStatus: isComplete ? pick(housing) : null,
        disabilityStatus: rng() > 0.88,
        studentStatus: age <= 25 && rng() > 0.4,
        agricultureLand: rng() > 0.75,
      },
    });
    citizenProfiles.push(profile);
  }
  console.log(`Created ${citizenProfiles.length} citizen profiles.`);

  // -------------------------------------------------------------------
  // Applications (30+, spanning every workflow status and blocker type)
  // -------------------------------------------------------------------
  type EventLog = { actor: string; action: string; fromStatus: string | null; toStatus: string | null; notes?: string; daysAgo: number };

  async function createApplication(opts: {
    profileId: string;
    service: (typeof services)[number];
    status: ApplicationStatus;
    documentStatuses: Record<string, DocumentStatus>;
    events: EventLog[];
    createdDaysAgo: number;
    deadlineDaysFromNow?: number;
  }) {
    const now = new Date();
    const createdAt = new Date(now.getTime() - opts.createdDaysAgo * 86400000);
    const application = await prisma.application.create({
      data: {
        citizenProfileId: opts.profileId,
        serviceId: opts.service.id,
        status: opts.status,
        createdAt,
        submittedAt: opts.status === "DRAFT" ? null : createdAt,
        decidedAt: opts.status === "APPROVED" || opts.status === "REJECTED" ? now : null,
      },
    });

    for (const req of opts.service.requirements) {
      const status = opts.documentStatuses[req.name] ?? "NOT_PROVIDED";
      await prisma.applicationDocument.create({
        data: {
          applicationId: application.id,
          requirementId: req.id,
          status,
          fileName: status === "NOT_PROVIDED" ? null : `${req.name.replace(/\s+/g, "_").toLowerCase()}.pdf`,
          synthesizedContent: status === "NOT_PROVIDED" ? null : `Synthetic demo content standing in for: ${req.name}`,
          verifiedById: status === "VERIFIED" || status === "REJECTED" ? caseWorkerUser.id : null,
          verificationNote: status === "REJECTED" ? "Document quality insufficient for verification (demo)." : status === "CORRECTION_REQUIRED" ? "Please resubmit a clearer copy (demo)." : null,
        },
      });
    }

    for (const ev of opts.events) {
      await prisma.applicationEvent.create({
        data: {
          applicationId: application.id,
          actor: ev.actor,
          action: ev.action,
          fromStatus: ev.fromStatus,
          toStatus: ev.toStatus,
          notes: ev.notes,
          createdAt: new Date(now.getTime() - ev.daysAgo * 86400000),
        },
      });
    }

    // Derive and persist blockers from the actual document/status data (never hand-authored).
    const docsForBlockers = opts.service.requirements.map((req) => ({
      requirementId: req.id,
      requirementName: req.name,
      necessity: req.necessity,
      status: opts.documentStatuses[req.name] ?? "NOT_PROVIDED",
    }));
    const blockers = deriveBlockers({ applicationId: application.id, status: opts.status, documents: docsForBlockers });
    for (const b of blockers) {
      await prisma.applicationBlocker.create({
        data: {
          applicationId: application.id,
          reasonCode: b.reasonCode,
          reason: b.reason,
          requiredAction: b.requiredAction,
          owner: b.owner as BlockerOwner,
          status: BlockerStatus.OPEN,
        },
      });
    }

    if (opts.deadlineDaysFromNow !== undefined) {
      await prisma.deadline.create({
        data: {
          kind: DeadlineKind.DOCUMENT,
          dueAt: new Date(now.getTime() + opts.deadlineDaysFromNow * 86400000),
          label: `Document submission deadline for ${opts.service.name}`,
          serviceId: opts.service.id,
          applicationId: application.id,
        },
      });
    }

    if (opts.status === "APPROVED") {
      await prisma.benefit.create({
        data: {
          applicationId: application.id,
          serviceId: opts.service.id,
          description: `Synthetic demo benefit granted under ${opts.service.name}.`,
        },
      });
    }

    return application;
  }

  const educationSupport = services.find((s) => s.name === "Student Education Support")!;
  const healthcareAccess = services.find((s) => s.name === "Healthcare Access Support")!;
  const employmentAssistance = services.find((s) => s.name === "Employment Assistance Program")!;
  const housingAssistance = services.find((s) => s.name === "Housing Assistance")!;
  const disabilityAssistance = services.find((s) => s.name === "Disability Accessibility Assistance")!;
  const smallBusiness = services.find((s) => s.name === "Women Entrepreneurship Support")!;

  // ---- Hand-authored scenario applications (used in the primary demo journey) ----

  // 1. The flagship "blocked on missing income certificate" application for the demo citizen.
  await createApplication({
    profileId: demoCitizenProfile.id,
    service: educationSupport,
    status: "DOCUMENT_VERIFICATION",
    documentStatuses: { "Identity proof": "VERIFIED", "Income certificate": "NOT_PROVIDED", "Enrollment proof": "NOT_PROVIDED" },
    createdDaysAgo: 9,
    deadlineDaysFromNow: 2,
    events: [
      { actor: "CITIZEN", action: "APPLICATION_CREATED", fromStatus: null, toStatus: "DRAFT", daysAgo: 9 },
      { actor: "CITIZEN", action: "DOCUMENT_UPLOADED", fromStatus: null, toStatus: null, notes: "Identity proof uploaded", daysAgo: 8 },
      { actor: "CITIZEN", action: "APPLICATION_SUBMITTED", fromStatus: "DRAFT", toStatus: "SUBMITTED", daysAgo: 8 },
      { actor: "SYSTEM", action: "STATUS_CHANGED", fromStatus: "SUBMITTED", toStatus: "UNDER_REVIEW", daysAgo: 7 },
      { actor: `CASE_WORKER:${caseWorkerUser.id}`, action: "DOCUMENT_VERIFIED", fromStatus: null, toStatus: null, notes: "Identity proof verified", daysAgo: 5 },
      { actor: "SYSTEM", action: "STATUS_CHANGED", fromStatus: "UNDER_REVIEW", toStatus: "DOCUMENT_VERIFICATION", daysAgo: 5 },
    ],
  });

  // 2. Approved application (full success path).
  await createApplication({
    profileId: demoCitizenProfile.id,
    service: healthcareAccess,
    status: "APPROVED",
    documentStatuses: { "Identity proof": "VERIFIED", "Income certificate": "VERIFIED", "Residency proof": "VERIFIED" },
    createdDaysAgo: 30,
    events: [
      { actor: "CITIZEN", action: "APPLICATION_CREATED", fromStatus: null, toStatus: "DRAFT", daysAgo: 30 },
      { actor: "CITIZEN", action: "APPLICATION_SUBMITTED", fromStatus: "DRAFT", toStatus: "SUBMITTED", daysAgo: 29 },
      { actor: "SYSTEM", action: "STATUS_CHANGED", fromStatus: "SUBMITTED", toStatus: "UNDER_REVIEW", daysAgo: 28 },
      { actor: `CASE_WORKER:${caseWorkerUser.id}`, action: "ALL_DOCUMENTS_VERIFIED", fromStatus: null, toStatus: null, daysAgo: 20 },
      { actor: `CASE_WORKER:${caseWorkerUser.id}`, action: "APPLICATION_APPROVED", fromStatus: "UNDER_REVIEW", toStatus: "APPROVED", notes: "All demo eligibility rules satisfied and documents verified.", daysAgo: 18 },
    ],
  });

  // 3. Rejected application.
  await createApplication({
    profileId: citizenProfiles[3].id,
    service: employmentAssistance,
    status: "REJECTED",
    documentStatuses: { "Identity proof": "VERIFIED", "Residency proof": "REJECTED", "Educational qualification proof": "VERIFIED" },
    createdDaysAgo: 40,
    events: [
      { actor: "CITIZEN", action: "APPLICATION_SUBMITTED", fromStatus: "DRAFT", toStatus: "SUBMITTED", daysAgo: 39 },
      { actor: "SYSTEM", action: "STATUS_CHANGED", fromStatus: "SUBMITTED", toStatus: "UNDER_REVIEW", daysAgo: 38 },
      { actor: `CASE_WORKER:${caseWorkerUser.id}`, action: "DOCUMENT_REJECTED", fromStatus: null, toStatus: null, notes: "Residency proof did not match declared address.", daysAgo: 30 },
      { actor: `CASE_WORKER:${caseWorkerUser.id}`, action: "APPLICATION_REJECTED", fromStatus: "UNDER_REVIEW", toStatus: "REJECTED", notes: "Residency requirement not satisfied.", daysAgo: 25 },
    ],
  });

  // 4. Overdue application (deadline in the past, still blocked).
  await createApplication({
    profileId: citizenProfiles[5].id,
    service: housingAssistance,
    status: "ADDITIONAL_INFORMATION_REQUIRED",
    documentStatuses: { "Identity proof": "VERIFIED", "Income certificate": "CORRECTION_REQUIRED", "Housing status proof": "NOT_PROVIDED" },
    createdDaysAgo: 20,
    deadlineDaysFromNow: -3,
    events: [
      { actor: "CITIZEN", action: "APPLICATION_SUBMITTED", fromStatus: "DRAFT", toStatus: "SUBMITTED", daysAgo: 19 },
      { actor: "SYSTEM", action: "STATUS_CHANGED", fromStatus: "SUBMITTED", toStatus: "UNDER_REVIEW", daysAgo: 18 },
      { actor: `CASE_WORKER:${caseWorkerUser.id}`, action: "CORRECTION_REQUESTED", fromStatus: "UNDER_REVIEW", toStatus: "ADDITIONAL_INFORMATION_REQUIRED", notes: "Income certificate is illegible; please resubmit.", daysAgo: 10 },
    ],
  });

  // 5. Pending review (all documents in, awaiting case worker).
  await createApplication({
    profileId: citizenProfiles[7].id,
    service: disabilityAssistance,
    status: "UNDER_REVIEW",
    documentStatuses: { "Identity proof": "UNDER_REVIEW", "Disability certificate": "UNDER_REVIEW" },
    createdDaysAgo: 4,
    deadlineDaysFromNow: 10,
    events: [
      { actor: "CITIZEN", action: "APPLICATION_SUBMITTED", fromStatus: "DRAFT", toStatus: "SUBMITTED", daysAgo: 3 },
      { actor: "SYSTEM", action: "STATUS_CHANGED", fromStatus: "SUBMITTED", toStatus: "UNDER_REVIEW", daysAgo: 2 },
    ],
  });

  // 6. Draft application (not yet submitted — missing information scenario).
  await createApplication({
    profileId: citizenProfiles[9].id,
    service: smallBusiness,
    status: "DRAFT",
    documentStatuses: {},
    createdDaysAgo: 1,
    events: [{ actor: "CITIZEN", action: "APPLICATION_CREATED", fromStatus: null, toStatus: "DRAFT", daysAgo: 1 }],
  });

  // ---- Bulk-generated applications for realistic volume (30+ total) ----
  const statusPool: { status: ApplicationStatus; weight: number }[] = [
    { status: "DRAFT", weight: 2 },
    { status: "SUBMITTED", weight: 2 },
    { status: "UNDER_REVIEW", weight: 4 },
    { status: "DOCUMENT_VERIFICATION", weight: 4 },
    { status: "ADDITIONAL_INFORMATION_REQUIRED", weight: 3 },
    { status: "RESUBMITTED", weight: 1 },
    { status: "APPROVED", weight: 4 },
    { status: "REJECTED", weight: 2 },
    { status: "CANCELLED", weight: 1 },
  ];
  const weightedStatuses: ApplicationStatus[] = statusPool.flatMap((s) => Array(s.weight).fill(s.status));

  function statusesForApplication(status: ApplicationStatus, requirementNames: string[]): Record<string, DocumentStatus> {
    const result: Record<string, DocumentStatus> = {};
    for (const name of requirementNames) {
      if (status === "DRAFT" || status === "SUBMITTED") {
        result[name] = rng() > 0.6 ? "UPLOADED" : "NOT_PROVIDED";
      } else if (status === "APPROVED") {
        result[name] = "VERIFIED";
      } else if (status === "REJECTED") {
        result[name] = rng() > 0.5 ? "VERIFIED" : "REJECTED";
      } else if (status === "ADDITIONAL_INFORMATION_REQUIRED") {
        result[name] = rng() > 0.5 ? "CORRECTION_REQUIRED" : "VERIFIED";
      } else {
        result[name] = pick(["VERIFIED", "UNDER_REVIEW", "NOT_PROVIDED"]);
      }
    }
    return result;
  }

  let bulkCount = 0;
  for (let i = 0; i < 26; i++) {
    const profile = pick(citizenProfiles);
    const service = pick(services);
    const status = pick(weightedStatuses);
    const requirementNames = service.requirements.map((r) => r.name);
    const createdDaysAgo = randInt(1, 60);
    const deadlineDaysFromNow = rng() > 0.4 ? randInt(-5, 21) : undefined;

    await createApplication({
      profileId: profile.id,
      service,
      status,
      documentStatuses: statusesForApplication(status, requirementNames),
      createdDaysAgo,
      deadlineDaysFromNow,
      events: [
        { actor: "CITIZEN", action: "APPLICATION_CREATED", fromStatus: null, toStatus: "DRAFT", daysAgo: createdDaysAgo },
        ...(status !== "DRAFT"
          ? [{ actor: "CITIZEN", action: "APPLICATION_SUBMITTED", fromStatus: "DRAFT", toStatus: "SUBMITTED", daysAgo: createdDaysAgo - 1 }]
          : []),
      ],
    });
    bulkCount++;
  }
  console.log(`Created ${bulkCount + 6} applications in total.`);

  // -------------------------------------------------------------------
  // A few general (non-application-specific) deadlines and notifications
  // -------------------------------------------------------------------
  await prisma.deadline.create({
    data: {
      kind: DeadlineKind.APPLICATION,
      dueAt: new Date(Date.now() + 14 * 86400000),
      label: "Student Education Support — intake window closes",
      serviceId: educationSupport.id,
    },
  });

  await prisma.notification.create({
    data: {
      userId: demoCitizenUser.id,
      title: "Action needed: Income certificate",
      body: "Your Student Education Support application is blocked until you upload an income certificate.",
    },
  });

  console.log("Seed complete.");
  console.log("\nDemo accounts (all use the same password):");
  console.log(`  Password: ${DEMO_PASSWORD}`);
  console.log(`  Citizen:       citizen@civicflow.dev`);
  console.log(`  Case worker:   caseworker@civicflow.dev`);
  console.log(`  Service admin: admin@civicflow.dev`);
  console.log(`  System admin:  sysadmin@civicflow.dev`);

  void evaluateEligibility; // referenced for type-checking parity with runtime usage elsewhere
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
