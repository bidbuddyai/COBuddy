import { db } from "../db";
import { 
  companies, 
  users, 
  rateTables, 
  projects, 
  subcontractors, 
  costCodes, 
  budgetLineItems, 
  scheduleActivities, 
  rfis, 
  rfiComments, 
  submittals, 
  submittalReviews, 
  tasks, 
  bidPackages, 
  bidInvitations, 
  bidSubmissions, 
  notifications 
} from "@shared/schema";
import { eq } from "drizzle-orm";
import fs from "fs/promises";
import path from "path";
import { parse } from "csv-parse/sync";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function initializeDeployment() {
  console.log("🚀 Initializing ProjectCommand deployment database...");
  
  try {
    // Step 1: Clean up or check initialization
    const existingCompanies = await db.select().from(companies).limit(1);
    if (existingCompanies.length > 0) {
      console.log("✅ Database already has companies. We will append fresh projects and seed data...");
    }

    console.log("📊 Setting up initial multi-tenant companies...");

    // Find or create Resource Environmental
    let resourceEnv;
    const reiList = await db.select().from(companies).where(eq(companies.domain, "resource-env.com"));
    if (reiList.length > 0) {
      resourceEnv = reiList[0];
      console.log("✅ Resource Environmental company already exists");
    } else {
      const [newRei] = await db.insert(companies).values({
        name: "Resource Environmental, Inc.",
        domain: "resource-env.com",
      }).returning();
      resourceEnv = newRei;
      console.log("✅ Created Resource Environmental company");
    }

    // Find or create Apex Abatement
    let apexCompany;
    const apexList = await db.select().from(companies).where(eq(companies.domain, "apexenv.com"));
    if (apexList.length > 0) {
      apexCompany = apexList[0];
      console.log("✅ Apex Abatement company already exists");
    } else {
      const [newApex] = await db.insert(companies).values({
        name: "Apex Abatement & Environmental Services",
        domain: "apexenv.com",
      }).returning();
      apexCompany = newApex;
      console.log("✅ Created Apex Abatement company");
    }

    // Find or create EcoWaste
    let ecowasteCompany;
    const ecoList = await db.select().from(companies).where(eq(companies.domain, "ecowaste.com"));
    if (ecoList.length > 0) {
      ecowasteCompany = ecoList[0];
      console.log("✅ EcoWaste company already exists");
    } else {
      const [newEco] = await db.insert(companies).values({
        name: "EcoWaste Containment & Hauling",
        domain: "ecowaste.com",
      }).returning();
      ecowasteCompany = newEco;
      console.log("✅ Created EcoWaste company");
    }

    // Find or create SafetyFirst
    let safetyfirstCompany;
    const safetyList = await db.select().from(companies).where(eq(companies.domain, "safetyfirstih.com"));
    if (safetyList.length > 0) {
      safetyfirstCompany = safetyList[0];
      console.log("✅ SafetyFirst company already exists");
    } else {
      const [newSafety] = await db.insert(companies).values({
        name: "SafetyFirst Air Monitoring Consultants",
        domain: "safetyfirstih.com",
      }).returning();
      safetyfirstCompany = newSafety;
      console.log("✅ Created SafetyFirst company");
    }

    // Step 2: Seed default users
    console.log("👤 Seeding default users...");

    // Helper to upsert a user with a secure password
    const upsertUser = async (id: string, email: string, firstName: string, lastName: string, role: string, companyId: number, plainPassword: string) => {
      const existing = await db.select().from(users).where(eq(users.email, email));
      const hashedPassword = await hashPassword(plainPassword);
      if (existing.length === 0) {
        await db.insert(users).values({
          id,
          email,
          password: hashedPassword,
          firstName,
          lastName,
          role,
          companyId,
        });
        console.log(`✅ Created user: ${email} with role: ${role}`);
      } else {
        // Always ensure password is set and secure
        await db.update(users).set({ password: hashedPassword, role, companyId }).where(eq(users.email, email));
        console.log(`✅ Updated/secured user: ${email} with role: ${role}`);
      }
    }

    // 1. Owner / Admin
    await upsertUser("chase-rei-admin", "chase@resource-env.com", "Chase", "Owner", "admin", resourceEnv.id, "PC_chase_admin_2026!");
    await upsertUser("admin-rei-system", "admin@resource-env.com", "Admin", "User", "admin", resourceEnv.id, "PC_system_admin_2026!");

    // 2. Project Manager
    await upsertUser("pm-rei-user", "pm@resource-env.com", "Sarah", "PM", "pm", resourceEnv.id, "PC_pm_user_2026!");

    // 3. Estimator
    await upsertUser("estimator-rei-user", "estimator@resource-env.com", "Eric", "Estimator", "estimator", resourceEnv.id, "PC_estimator_user_2026!");

    // 4. Subcontractor (Apex Abatement)
    await upsertUser("subcontractor-apex-user", "subcontractor@apexenv.com", "Steve", "Subcontractor", "subcontractor", apexCompany.id, "PC_subcontractor_user_2026!");

    // 5. Vendor (EcoWaste)
    await upsertUser("vendor-ecowaste-user", "vendor@ecowaste.com", "Victor", "Vendor", "vendor", ecowasteCompany.id, "PC_vendor_user_2026!");

    // 6. Consultant (SafetyFirst)
    await upsertUser("consultant-safetyfirst-user", "consultant@safetyfirstih.com", "Clara", "Consultant", "consultant", safetyfirstCompany.id, "PC_consultant_user_2026!");

    // 7. Read-Only
    await upsertUser("readonly-rei-user", "readonly@resource-env.com", "Ron", "ReadOnly", "readonly", resourceEnv.id, "PC_readonly_user_2026!");

    // Step 3: Seed standard Prevailing/Wage rate tables
    const existingRates = await db.select().from(rateTables).limit(1);
    if (existingRates.length === 0) {
      console.log("📥 Seeding labor, equipment, and disposal rate tables...");
      
      const rateTablesData = [
        {
          name: "REI Standard Wage Calculator",
          type: "labor",
          rates: [
            { code: "LAB-ST", description: "Labor Straight Time (Hazmat Tech)", rate: 31.60, unit: "hr" },
            { code: "LAB-OT", description: "Labor Over Time (Hazmat Tech)", rate: 47.40, unit: "hr" },
            { code: "LAB-DT", description: "Labor Double Time (Hazmat Tech)", rate: 63.20, unit: "hr" },
            { code: "SUP-ST", description: "Superintendent Straight Time", rate: 58.50, unit: "hr" },
            { code: "SUP-OT", description: "Superintendent Over Time", rate: 87.75, unit: "hr" }
          ]
        },
        {
          name: "Abatement Equipment Rates",
          type: "equipment",
          rates: [
            { code: "EQ-NEG", description: "Negative Air Machine 2000 CFM", rate: 85.00, unit: "day" },
            { code: "EQ-HEPA", description: "HEPA Vacuum Industrial", rate: 45.00, unit: "day" },
            { code: "EQ-SHWR", description: "Decontamination Shower 3-Chamber", rate: 150.00, unit: "day" },
            { code: "EQ-COMP", description: "Air Compressor 185 CFM Diesel", rate: 170.00, unit: "day" }
          ]
        },
        {
          name: "Hazardous & Soil Disposal Tonnage",
          type: "disposal",
          rates: [
            { code: "DISP-ACM", description: "Asbestos Waste (Fribable) Disposal", rate: 330.00, unit: "ton" },
            { code: "DISP-SOIL", description: "Class I Hazardous Soil Disposal Bulk", rate: 215.00, unit: "ton" },
            { code: "DISP-CONC", description: "Clean Concrete/Masonry Recycling", rate: 22.00, unit: "ton" }
          ]
        }
      ];

      for (const tableData of rateTablesData) {
        await db.insert(rateTables).values({
          name: tableData.name,
          type: tableData.type,
          effectiveDate: new Date(),
          data: tableData.rates,
          sourceFile: "REI-Standard-2026.pdf",
          companyId: resourceEnv.id,
          isApproved: true,
          reviewedBy: "chase-rei-admin",
          reviewedAt: new Date()
        });
      }
      console.log("✅ Seeded labor and equipment rates.");
    }

    // Step 4: Seed Subcontractors
    console.log("👷 Seeding commercial subcontractors & waste vendors...");
    const subList = [
      { name: "Apex Abatement & Environmental Services", companyName: "Apex Env Inc", contactEmail: "estimating@apexenv.com", contactPhone: "415-555-0199", tradeType: "abatement", licenseNumber: "LIC-98442", address: "1200 Industrial Pkwy, Oakland, CA" },
      { name: "Heavy Iron Demolition & Earthworks", companyName: "Heavy Iron Corp", contactEmail: "bids@heavyiron.com", contactPhone: "510-555-4422", tradeType: "demolition", licenseNumber: "LIC-88219", address: "400 Heavy Machinery Rd, Richmond, CA" },
      { name: "EcoWaste Containment & Hauling", companyName: "EcoWaste LLC", contactEmail: "logistics@ecowaste.com", contactPhone: "925-555-8833", tradeType: "waste_management", licenseNumber: "LIC-77312", address: "80 Landfill Ln, Antioch, CA" },
      { name: "SafetyFirst Air Monitoring Consultants", companyName: "SafetyFirst IH", contactEmail: "lab@safetyfirstih.com", contactPhone: "408-555-1100", tradeType: "hygienist", licenseNumber: "LIC-33421", address: "15 Science Park Dr, San Jose, CA" }
    ];

    const seededSubs: any[] = [];
    for (const sub of subList) {
      // Find or create
      const exist = await db.select().from(subcontractors).where(eq(subcontractors.name, sub.name));
      if (exist.length > 0) {
        seededSubs.push(exist[0]);
      } else {
        const [newSub] = await db.insert(subcontractors).values({
          ...sub,
          companyId: resourceEnv.id,
          isActive: true
        }).returning();
        seededSubs.push(newSub);
      }
    }
    console.log(`✅ Seeded ${seededSubs.length} subcontractors`);

    // Step 5: Seed Division 2 Cost Codes
    console.log("🏷️ Seeding Division 02 Master Cost Codes...");
    const masterCostCodes = [
      { code: "02-100", name: "Structure Demolition & Drop" },
      { code: "02-200", name: "Asbestos Remediation (ACM)" },
      { code: "02-300", name: "Lead Paint Mitigation (LBP)" },
      { code: "02-400", name: "Hazardous Soil excavation" },
      { code: "02-500", name: "Heavy Transport & Hauling" },
      { code: "02-600", name: "Air Monitoring & IH Inspections" }
    ];

    const seededCodes: any[] = [];
    for (const codeItem of masterCostCodes) {
      const exist = await db.select().from(costCodes).where(eq(costCodes.code, codeItem.code));
      if (exist.length > 0) {
        seededCodes.push(exist[0]);
      } else {
        const [newCode] = await db.insert(costCodes).values({
          code: codeItem.code,
          name: codeItem.name,
          companyId: resourceEnv.id
        }).returning();
        seededCodes.push(newCode);
      }
    }
    console.log(`✅ Seeded ${seededCodes.length} cost codes`);

    // Step 6: Seed Projects
    console.log("🏢 Seeding active demolition and hazmat projects...");
    const projectList = [
      {
        number: "PRJ-2026-001",
        name: "Golden Gate Mall Demolition & Abatement",
        description: "Complete structural demolition of the inactive 3-story Golden Gate Shopping Mall and comprehensive abatement of friable asbestos roofing, lead paint structural frames, and PCB ballast clusters prior to ground leveling.",
        clientName: "Golden Gate Redevelopment LLC",
        clientContact: "Marcus Vance (mvance@ggredev.com)",
        budget: "4500000.00",
        status: "active"
      },
      {
        number: "PRJ-2026-002",
        name: "East Bay Water Purification plume Remediation",
        description: "Plume mitigation and hazmat excavation at the inactive purification center. Includes structural containment, contaminated earth hauling, and Class I deep landfill soil backfill.",
        clientName: "East Bay Municipal Utility District",
        clientContact: "Diana Frost (dfrost@ebmud.org)",
        budget: "2800000.00",
        status: "active"
      }
    ];

    const seededProjects: any[] = [];
    for (const proj of projectList) {
      const exist = await db.select().from(projects).where(eq(projects.number, proj.number));
      if (exist.length > 0) {
        seededProjects.push(exist[0]);
      } else {
        const [newProj] = await db.insert(projects).values({
          ...proj,
          companyId: resourceEnv.id,
          createdBy: "chase-rei-admin"
        }).returning();
        seededProjects.push(newProj);
      }
    }
    console.log(`✅ Seeded ${seededProjects.length} projects`);

    const mallProj = seededProjects[0];
    const plumeProj = seededProjects[1];

    // Step 7: Seed Budgets per Project
    console.log("💰 Seeding interactive budget spreadsheets...");
    const mallBudget = [
      { code: "02-100", orig: "1500000.00", approved: "120000.00", pending: "45000.00", committed: "1480000.00", forecast: "1620000.00", eac: "1620000.00" }, // Demo
      { code: "02-200", orig: "1200000.00", approved: "0.00", pending: "15000.00", committed: "1150000.00", forecast: "1200000.00", eac: "1200000.00" },       // Asbestos
      { code: "02-300", orig: "600000.00", approved: "25000.00", pending: "0.00", committed: "590000.00", forecast: "625000.00", eac: "625000.00" },        // Lead
      { code: "02-500", orig: "800000.00", approved: "50000.00", pending: "20000.00", committed: "810000.00", forecast: "850000.00", eac: "850000.00" },       // Transport
      { code: "02-600", orig: "400000.00", approved: "0.00", pending: "0.00", committed: "320000.00", forecast: "400000.00", eac: "400000.00" }         // Hygienist
    ];

    for (const line of mallBudget) {
      const codeId = seededCodes.find(c => c.code === line.code)?.id;
      if (codeId) {
        await db.insert(budgetLineItems).values({
          projectId: mallProj.id,
          costCodeId: codeId,
          originalBudget: line.orig,
          approvedChanges: line.approved,
          pendingChanges: line.pending,
          committedCosts: line.committed,
          forecastCost: line.forecast,
          estimatedAtCompletion: line.eac
        });
      }
    }

    const plumeBudget = [
      { code: "02-400", orig: "1800000.00", approved: "0.00", pending: "0.00", committed: "1750000.00", forecast: "1800000.00", eac: "1800000.00" },
      { code: "02-500", orig: "700000.00", approved: "45000.00", pending: "30000.00", committed: "690000.00", forecast: "745000.00", eac: "745000.00" },
      { code: "02-600", orig: "300000.00", approved: "0.00", pending: "5000.00", committed: "260000.00", forecast: "300000.00", eac: "300000.00" }
    ];

    for (const line of plumeBudget) {
      const codeId = seededCodes.find(c => c.code === line.code)?.id;
      if (codeId) {
        await db.insert(budgetLineItems).values({
          projectId: plumeProj.id,
          costCodeId: codeId,
          originalBudget: line.orig,
          approvedChanges: line.approved,
          pendingChanges: line.pending,
          committedCosts: line.committed,
          forecastCost: line.forecast,
          estimatedAtCompletion: line.eac
        });
      }
    }
    console.log("✅ Seeded project budgets.");

    // Step 8: Seed Project Schedules
    console.log("📅 Seeding project timeline schedules...");
    const mallSchedule = [
      { name: "Pre-construction & Hazmat Profiling", duration: 14, start: new Date("2026-06-01"), finish: new Date("2026-06-15"), comp: 100, party: "Sarah (REI)" },
      { name: "Negative Air Containment Setup Sector A", duration: 10, start: new Date("2026-06-16"), finish: new Date("2026-06-26"), comp: 80, party: "Apex Abatement" },
      { name: "Roofing Friable Asbestos Abatement", duration: 15, start: new Date("2026-06-27"), finish: new Date("2026-07-12"), comp: 0, party: "Apex Abatement" },
      { name: "Structural Mall Demolition Block-A Drop", duration: 12, start: new Date("2026-07-13"), finish: new Date("2026-07-25"), comp: 0, party: "Heavy Iron Corp" },
      { name: "Heavy Tonnage Metal & Concrete Haul", duration: 8, start: new Date("2026-07-26"), finish: new Date("2026-08-03"), comp: 0, party: "EcoWaste Logistics" }
    ];

    for (const act of mallSchedule) {
      await db.insert(scheduleActivities).values({
        projectId: mallProj.id,
        name: act.name,
        duration: act.duration,
        startDate: act.start,
        finishDate: act.finish,
        percentComplete: act.comp,
        responsibleParty: act.party,
        criticalPath: act.comp < 100
      });
    }
    console.log("✅ Seeded Golden Gate Mall project timeline.");

    // Step 9: Seed RFIs
    console.log("❓ Seeding Project RFIs...");
    const [mallRfi] = await db.insert(rfis).values({
      number: "RFI-001",
      projectId: mallProj.id,
      subject: "Discovery of Undocumented PCB Ballasts in Sector B",
      question: "During pre-abatement walks in Sector B (basement parking), we uncovered approximately 240 legacy fluorescent light fixtures containing undocumented PCB ballasts that were not included in the environmental survey. Please clarify the profile code and disposal route.",
      suggestedAnswer: "Recommend routing through Class I Ca Haz disposal rates under Profile PCB-9844. Cost impact is estimated at $12,500.00.",
      costImpact: "yes",
      scheduleImpact: 3,
      priority: "high",
      status: "open",
      ballInCourt: "Marcus Vance (Client)",
      discipline: "Environmental",
      location: "Sector B Basement",
      createdBy: "pm-rei-user"
    }).returning();

    // RFI Discussion comment
    await db.insert(rfiComments).values({
      rfiId: mallRfi.id,
      userId: "pm-rei-user",
      comment: "We have isolated the area with yellow tape until client authorizes disposal profile fees."
    });

    console.log("✅ Seeded RFIs.");

    // Step 10: Seed Submittals
    console.log("📋 Seeding submittal registry logs...");
    const [apexAbatement] = seededSubs.filter(s => s.tradeType === "abatement");
    
    const [submittal1] = await db.insert(submittals).values({
      number: "SUB-02-200-001",
      title: "Friable Asbestos Abatement Containment Plan (Sector A)",
      projectId: mallProj.id,
      specSection: "02 82 13 Asbestos Abatement",
      package: "ACM Abatement Set",
      type: "product_data",
      responsibleContractorId: apexAbatement.id,
      reviewerId: "pm-rei-user",
      dueDate: new Date("2026-06-10"),
      status: "pending_review",
      ballInCourt: "Sarah (REI PM)",
      revision: 0
    }).returning();

    await db.insert(submittalReviews).values({
      submittalId: submittal1.id,
      userId: "pm-rei-user",
      status: "approved_as_noted",
      comments: "Ensure negative air manometer charts are submitted daily to SafetyFirst IH."
    });

    console.log("✅ Seeded Submittals.");

    // Step 11: Seed Punch List Tasks
    console.log("🎯 Seeding Punch List Tasks...");
    await db.insert(tasks).values({
      projectId: mallProj.id,
      title: "Inspect containment seal at Basement Sector A elevator shaft",
      description: "Air flow test indicates a micro-leak near the fire elevator shaft sheet seal. Re-apply poly sheeting and high-tack tape immediately.",
      status: "open",
      priority: "high",
      dueDate: new Date("2026-06-03"),
      assigneeId: "pm-rei-user",
      assigneeName: "Sarah (REI PM)",
      location: "Basement Sector A elevator"
    });

    await db.insert(tasks).values({
      projectId: mallProj.id,
      title: "Complete daily air sampling log sheet",
      description: "Submit daily micro-fiber air clearance counts to SafetyFirst IH.",
      status: "completed",
      priority: "medium",
      dueDate: new Date("2026-06-02"),
      assigneeId: "chase-rei-admin",
      assigneeName: "Chase Owner",
      location: "Job Site Trailer"
    });

    console.log("✅ Seeded Punch list tasks.");

    // Step 12: Seed Bid Packages & Submissions
    console.log("⚖️ Seeding Bid Packages and leveling submissions...");
    const [bidPkg] = await db.insert(bidPackages).values({
      projectId: mallProj.id,
      title: "Lead Paint Abatement & Structural Mall Drop",
      description: "GC seeking bids for structural drop of Golden Gate Shopping Mall Block-A and associated high-elevation lead paint stabilization. Bids must include detailed alternate price for soil dust stabilization.",
      tradeCategory: "demolition",
      dueDate: new Date("2026-06-15"),
      status: "active"
    }).returning();

    // Invite two subs: Apex Abatement and Heavy Iron
    const [apexSub] = seededSubs.filter(s => s.tradeType === 'abatement');
    const [heavySub] = seededSubs.filter(s => s.tradeType === 'demolition');

    const [invite1] = await db.insert(bidInvitations).values({
      bidPackageId: bidPkg.id,
      subcontractorId: apexSub.id,
      token: "token-apex-demo-redev",
      inviteeEmail: "estimating@apexenv.com",
      status: "submitted"
    }).returning();

    const [invite2] = await db.insert(bidInvitations).values({
      bidPackageId: bidPkg.id,
      subcontractorId: heavySub.id,
      token: "token-heavy-demo-redev",
      inviteeEmail: "bids@heavyiron.com",
      status: "submitted"
    }).returning();

    // Seed submissions
    await db.insert(bidSubmissions).values({
      bidInvitationId: invite1.id,
      baseBid: "420000.00",
      alternates: [
        { name: "Additional Soil Dust Stabilization", amount: 15000.00 }
      ],
      unitPrices: [
        { item: "Lead Abatement Tech Labor", price: 42.00, unit: "hr" }
      ],
      clarifications: "Includes all EPA lead-paint containment supplies, labor, and final clearance swipes.",
      exclusions: "Excludes heavy crane leasing fees and structural concrete drop (under other scopes)."
    });

    await db.insert(bidSubmissions).values({
      bidInvitationId: invite2.id,
      baseBid: "395000.00",
      alternates: [
        { name: "Additional Soil Dust Stabilization", amount: 28000.00 }
      ],
      unitPrices: [
        { item: "Lead Abatement Tech Labor", price: 55.00, unit: "hr" }
      ],
      clarifications: "Includes heavy demolition equipment drop and crane mobilization.",
      exclusions: "Excludes CA Haz profiling fees (to be paid directly by GC/Owner)."
    });

    console.log("✅ Seeded Bid Packages & Subcontractor Submissions.");

    // Step 13: Seed System Notifications
    await db.insert(notifications).values({
      userId: "chase-rei-admin",
      projectId: mallProj.id,
      title: "New Subcontractor Bid Submitted",
      message: "Heavy Iron Demolition Corp has submitted a bid on the Lead Paint Abatement package.",
      isRead: false,
      link: `/projects/${mallProj.id}/bid-packages/${bidPkg.id}/leveling`
    });

    console.log("\n🎉 ProjectCommand database seeding complete!");
    console.log("📌 You can now log in and see a fully populated demolition & abatement enterprise system!");
    
  } catch (error) {
    console.error("❌ Error initializing deployment database:", error);
    throw error;
  } finally {
    process.exit(0);
  }
}

// Run initialization
initializeDeployment();