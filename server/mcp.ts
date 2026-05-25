import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdinStdoutServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { Router } from "express";
import { db } from "./db.js";
import { storage } from "./storage.js";
import { eq, and, ne } from "drizzle-orm";
import { 
  projects, 
  budgetLineItems, 
  scheduleActivities, 
  rfis, 
  rfiComments,
  submittals, 
  submittalReviews,
  tasks, 
  changeOrders, 
  rateTables 
} from "@shared/schema.js";

// Initialize the core MCP Server
const mcpServer = new Server(
  {
    name: "projectbuddy-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Map of active transports indexed by sessionId
const activeTransports = new Map<string, SSEServerTransport>();

// Expose standard tools to the list tools endpoint
mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      // 1. Projects
      {
        name: "get_projects",
        description: "Retrieve all active construction projects.",
        inputSchema: { type: "object", properties: {} }
      },
      {
        name: "create_project",
        description: "Create a new construction project in the system.",
        inputSchema: {
          type: "object",
          properties: {
            name: { type: "string", description: "Project name" },
            number: { type: "string", description: "Project number/code" },
            clientName: { type: "string", description: "Client/Owner name" },
            status: { type: "string", enum: ["active", "completed", "planning"], default: "active" },
            companyId: { type: "number", description: "Parent company ID (default to 1)" }
          },
          required: ["name", "number", "clientName"]
        }
      },
      {
        name: "delete_project",
        description: "Delete a construction project from the database.",
        inputSchema: {
          type: "object",
          properties: { id: { type: "number", description: "Project database ID" } },
          required: ["id"]
        }
      },
      // 2. Cost Budget & Codes
      {
        name: "get_budget",
        description: "Retrieve cost budget line items for a project, showing Cost Codes, EACs, original budgets, and variance calculations.",
        inputSchema: {
          type: "object",
          properties: { projectId: { type: "number", description: "Project database ID" } },
          required: ["projectId"]
        }
      },
      {
        name: "add_budget_item",
        description: "Add a new cost budget line item linked to a standard cost code.",
        inputSchema: {
          type: "object",
          properties: {
            projectId: { type: "number", description: "Project database ID" },
            costCodeId: { type: "number", description: "Cost Code database ID (e.g. 1 for Structure Demolition)" },
            originalBudget: { type: "string", description: "Original cost budget amount (decimal string)" },
            estimatedAtCompletion: { type: "string", description: "EAC cost budget amount" },
            committedCosts: { type: "string", description: "Committed costs amount" },
            forecastCosts: { type: "string", description: "Forecast costs amount" }
          },
          required: ["projectId", "costCodeId", "originalBudget"]
        }
      },
      {
        name: "update_budget_item",
        description: "Update an existing cost budget line item.",
        inputSchema: {
          type: "object",
          properties: {
            id: { type: "number", description: "Budget item database ID" },
            originalBudget: { type: "string", description: "New original cost budget amount" },
            estimatedAtCompletion: { type: "string", description: "New EAC cost budget amount" },
            committedCosts: { type: "string", description: "New committed costs amount" },
            forecastCosts: { type: "string", description: "New forecast costs amount" }
          },
          required: ["id"]
        }
      },
      {
        name: "delete_budget_item",
        description: "Delete a cost budget line item from the database.",
        inputSchema: {
          type: "object",
          properties: { id: { type: "number", description: "Budget item database ID" } },
          required: ["id"]
        }
      },
      // 3. Schedule Activities
      {
        name: "get_schedule",
        description: "Retrieve Gantt scheduleActivities lookahead milestones for a project.",
        inputSchema: {
          type: "object",
          properties: { projectId: { type: "number", description: "Project database ID" } },
          required: ["projectId"]
        }
      },
      {
        name: "add_schedule_activity",
        description: "Add an activity to the lookahead Gantt schedule.",
        inputSchema: {
          type: "object",
          properties: {
            projectId: { type: "number" },
            name: { type: "string", description: "Activity name" },
            startDate: { type: "string", description: "ISO date string" },
            finishDate: { type: "string", description: "ISO date string" },
            duration: { type: "number", description: "Duration in days" },
            percentComplete: { type: "number", description: "0 to 100 percentage complete" },
            criticalPath: { type: "boolean", description: "Is this activity on the critical path?" },
            responsibleParty: { type: "string", description: "Assignee / Subcontractor name" }
          },
          required: ["projectId", "name"]
        }
      },
      {
        name: "update_schedule_activity",
        description: "Update an existing schedule activity.",
        inputSchema: {
          type: "object",
          properties: {
            id: { type: "number", description: "Activity database ID" },
            name: { type: "string" },
            startDate: { type: "string" },
            finishDate: { type: "string" },
            duration: { type: "number" },
            percentComplete: { type: "number" },
            criticalPath: { type: "boolean" },
            responsibleParty: { type: "string" }
          },
          required: ["id"]
        }
      },
      {
        name: "delete_schedule_activity",
        description: "Delete a schedule activity from the database.",
        inputSchema: {
          type: "object",
          properties: { id: { type: "number", description: "Activity database ID" } },
          required: ["id"]
        }
      },
      // 4. RFIs (Requests for Information)
      {
        name: "get_rfis",
        description: "Retrieve Requests for Information (RFIs) for a project.",
        inputSchema: {
          type: "object",
          properties: { projectId: { type: "number" } },
          required: ["projectId"]
        }
      },
      {
        name: "create_rfi",
        description: "Create a new Request for Information (RFI) with cost/schedule impact assessments.",
        inputSchema: {
          type: "object",
          properties: {
            projectId: { type: "number" },
            number: { type: "string", description: "RFI sequence number (e.g. RFI-004)" },
            title: { type: "string", description: "RFI subject" },
            question: { type: "string", description: "Technical RFI inquiry question" },
            suggestedAnswer: { type: "string", description: "Draft response or suggestion" },
            status: { type: "string", enum: ["open", "closed", "pending", "draft"], default: "open" },
            priority: { type: "string", enum: ["low", "medium", "high"], default: "medium" },
            costImpact: { type: "string", description: "Estimated cost impact" },
            scheduleImpactDays: { type: "number", description: "Estimated schedule delay in days" }
          },
          required: ["projectId", "number", "title", "question"]
        }
      },
      {
        name: "update_rfi",
        description: "Update an existing RFI (e.g., closing it or answering it).",
        inputSchema: {
          type: "object",
          properties: {
            id: { type: "number", description: "RFI database ID" },
            title: { type: "string" },
            question: { type: "string" },
            suggestedAnswer: { type: "string" },
            status: { type: "string", enum: ["open", "closed", "pending", "draft"] },
            priority: { type: "string", enum: ["low", "medium", "high"] },
            costImpact: { type: "string" },
            scheduleImpactDays: { type: "number" }
          },
          required: ["id"]
        }
      },
      {
        name: "delete_rfi",
        description: "Delete an RFI from the database.",
        inputSchema: {
          type: "object",
          properties: { id: { type: "number" } },
          required: ["id"]
        }
      },
      // 5. Submittals Registry
      {
        name: "get_submittals",
        description: "Retrieve submittals for a project.",
        inputSchema: {
          type: "object",
          properties: { projectId: { type: "number" } },
          required: ["projectId"]
        }
      },
      {
        name: "create_submittal",
        description: "Create a new submittal log registry item.",
        inputSchema: {
          type: "object",
          properties: {
            projectId: { type: "number" },
            title: { type: "string", description: "Submittal title" },
            specSection: { type: "string", description: "Specification division section (e.g. 02-200)" },
            status: { type: "string", enum: ["open", "approved", "rejected", "pending_review"], default: "pending_review" },
            priority: { type: "string", enum: ["low", "medium", "high"], default: "medium" },
            dueDate: { type: "string", description: "ISO due date" }
          },
          required: ["projectId", "title", "specSection"]
        }
      },
      {
        name: "update_submittal",
        description: "Update an existing submittal registry item.",
        inputSchema: {
          type: "object",
          properties: {
            id: { type: "number" },
            title: { type: "string" },
            specSection: { type: "string" },
            status: { type: "string", enum: ["open", "approved", "rejected", "pending_review"] },
            priority: { type: "string", enum: ["low", "medium", "high"] },
            dueDate: { type: "string" }
          },
          required: ["id"]
        }
      },
      {
        name: "delete_submittal",
        description: "Delete a submittal log item from the database.",
        inputSchema: {
          type: "object",
          properties: { id: { type: "number" } },
          required: ["id"]
        }
      },
      // 6. Punch Tasks List
      {
        name: "get_tasks",
        description: "Retrieve all tasks and punch list items for a project.",
        inputSchema: {
          type: "object",
          properties: { projectId: { type: "number" } },
          required: ["projectId"]
        }
      },
      {
        name: "create_task",
        description: "Create a new location-scoped punch list task.",
        inputSchema: {
          type: "object",
          properties: {
            projectId: { type: "number" },
            title: { type: "string", description: "Task summary/description" },
            location: { type: "string", description: "Physical site location (e.g. Suite 101, Roof)" },
            priority: { type: "string", enum: ["low", "medium", "high"], default: "medium" },
            status: { type: "string", enum: ["open", "in_progress", "completed"], default: "open" },
            dueDate: { type: "string" }
          },
          required: ["projectId", "title", "location"]
        }
      },
      {
        name: "update_task",
        description: "Update an existing punch list task.",
        inputSchema: {
          type: "object",
          properties: {
            id: { type: "number" },
            title: { type: "string" },
            location: { type: "string" },
            priority: { type: "string", enum: ["low", "medium", "high"] },
            status: { type: "string", enum: ["open", "in_progress", "completed"] },
            dueDate: { type: "string" }
          },
          required: ["id"]
        }
      },
      {
        name: "delete_task",
        description: "Delete a punch list task from the database.",
        inputSchema: {
          type: "object",
          properties: { id: { type: "number" } },
          required: ["id"]
        }
      },
      // 7. AI Potential Change Orders (PCO)
      {
        name: "get_change_orders",
        description: "Retrieve change orders for a project.",
        inputSchema: {
          type: "object",
          properties: { projectId: { type: "number" } },
          required: ["projectId"]
        }
      },
      {
        name: "create_change_order",
        description: "Create a Potential Change Order (PCO) in the log.",
        inputSchema: {
          type: "object",
          properties: {
            projectId: { type: "number" },
            number: { type: "string", description: "CO sequence code (e.g. PCO-001)" },
            description: { type: "string", description: "Scope breakdown description" },
            status: { type: "string", enum: ["draft", "pending", "approved", "rejected"], default: "draft" },
            totalAmount: { type: "string", description: "Total CO amount" },
            laborAmount: { type: "string" },
            materialAmount: { type: "string" },
            equipmentAmount: { type: "string" },
            subcontractorAmount: { type: "string" }
          },
          required: ["projectId", "number", "description", "totalAmount"]
        }
      },
      {
        name: "update_change_order",
        description: "Update an existing change order status or amounts.",
        inputSchema: {
          type: "object",
          properties: {
            id: { type: "number" },
            description: { type: "string" },
            status: { type: "string", enum: ["draft", "pending", "approved", "rejected"] },
            totalAmount: { type: "string" },
            laborAmount: { type: "string" },
            materialAmount: { type: "string" },
            equipmentAmount: { type: "string" },
            subcontractorAmount: { type: "string" }
          },
          required: ["id"]
        }
      },
      {
        name: "delete_change_order",
        description: "Delete a change order from the database.",
        inputSchema: {
          type: "object",
          properties: { id: { type: "number" } },
          required: ["id"]
        }
      },
      // 8. Bulk Actions (Create Multiple)
      {
        name: "bulk_add_tasks",
        description: "Add multiple punch list tasks in a single operation.",
        inputSchema: {
          type: "object",
          properties: {
            projectId: { type: "number" },
            tasks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  location: { type: "string" },
                  priority: { type: "string", enum: ["low", "medium", "high"], default: "medium" },
                  status: { type: "string", enum: ["open", "in_progress", "completed"], default: "open" },
                  dueDate: { type: "string" }
                },
                required: ["title", "location"]
              }
            }
          },
          required: ["projectId", "tasks"]
        }
      },
      {
        name: "bulk_add_budget_items",
        description: "Add multiple cost budget line items in a single operation.",
        inputSchema: {
          type: "object",
          properties: {
            projectId: { type: "number" },
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  costCodeId: { type: "number" },
                  originalBudget: { type: "string" },
                  estimatedAtCompletion: { type: "string" },
                  committedCosts: { type: "string" },
                  forecastCosts: { type: "string" }
                },
                required: ["costCodeId", "originalBudget"]
              }
            }
          },
          required: ["projectId", "items"]
        }
      },
      {
        name: "bulk_add_schedule_activities",
        description: "Add multiple lookahead schedule activities in a single operation.",
        inputSchema: {
          type: "object",
          properties: {
            projectId: { type: "number" },
            activities: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  startDate: { type: "string" },
                  finishDate: { type: "string" },
                  duration: { type: "number" },
                  percentComplete: { type: "number" },
                  criticalPath: { type: "boolean" },
                  responsibleParty: { type: "string" }
                },
                required: ["name"]
              }
            }
          },
          required: ["projectId", "activities"]
        }
      }
    ]
  };
});

// Process tool executions
mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  console.log(`🔧 Executing MCP Tool: ${name}`);

  try {
    switch (name) {
      // --- 1. PROJECTS ---
      case "get_projects": {
        const result = await storage.getProjects();
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
      case "create_project": {
        const params = args as any;
        const result = await storage.createProject({
          name: params.name,
          number: params.number,
          clientName: params.clientName,
          status: params.status || "active",
          companyId: params.companyId || 1
        });
        return { content: [{ type: "text", text: `Success: Project created with ID ${result.id}\n\n${JSON.stringify(result, null, 2)}` }] };
      }
      case "delete_project": {
        const params = args as any;
        await db.delete(projects).where(eq(projects.id, params.id));
        return { content: [{ type: "text", text: `Success: Project ID ${params.id} has been permanently deleted.` }] };
      }

      // --- 2. BUDGET ---
      case "get_budget": {
        const params = args as any;
        const result = await storage.getBudgetLineItems(params.projectId);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
      case "add_budget_item": {
        const params = args as any;
        const result = await storage.createBudgetLineItem({
          projectId: params.projectId,
          costCodeId: params.costCodeId,
          originalBudget: params.originalBudget,
          estimatedAtCompletion: params.estimatedAtCompletion || params.originalBudget,
          committedCosts: params.committedCosts || "0.00",
          forecastCosts: params.forecastCosts || "0.00"
        });
        return { content: [{ type: "text", text: `Success: Budget line item created with ID ${result.id}` }] };
      }
      case "update_budget_item": {
        const params = args as any;
        const result = await storage.updateBudgetLineItem(params.id, {
          originalBudget: params.originalBudget,
          estimatedAtCompletion: params.estimatedAtCompletion,
          committedCosts: params.committedCosts,
          forecastCosts: params.forecastCosts
        });
        return { content: [{ type: "text", text: `Success: Budget item ID ${params.id} updated.` }] };
      }
      case "delete_budget_item": {
        const params = args as any;
        await db.delete(budgetLineItems).where(eq(budgetLineItems.id, params.id));
        return { content: [{ type: "text", text: `Success: Budget line ID ${params.id} permanently deleted.` }] };
      }

      // --- 3. SCHEDULE ---
      case "get_schedule": {
        const params = args as any;
        const result = await storage.getScheduleActivities(params.projectId);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
      case "add_schedule_activity": {
        const params = args as any;
        const result = await storage.createScheduleActivity({
          projectId: params.projectId,
          name: params.name,
          startDate: params.startDate ? new Date(params.startDate) : null,
          finishDate: params.finishDate ? new Date(params.finishDate) : null,
          duration: params.duration || 0,
          percentComplete: params.percentComplete || 0,
          criticalPath: params.criticalPath || false,
          responsibleParty: params.responsibleParty || ""
        });
        return { content: [{ type: "text", text: `Success: Activity created with ID ${result.id}` }] };
      }
      case "update_schedule_activity": {
        const params = args as any;
        const result = await storage.updateScheduleActivity(params.id, {
          name: params.name,
          startDate: params.startDate ? new Date(params.startDate) : undefined,
          finishDate: params.finishDate ? new Date(params.finishDate) : undefined,
          duration: params.duration,
          percentComplete: params.percentComplete,
          criticalPath: params.criticalPath,
          responsibleParty: params.responsibleParty
        });
        return { content: [{ type: "text", text: `Success: Activity ID ${params.id} updated.` }] };
      }
      case "delete_schedule_activity": {
        const params = args as any;
        await db.delete(scheduleActivities).where(eq(scheduleActivities.id, params.id));
        return { content: [{ type: "text", text: `Success: Activity ID ${params.id} permanently deleted.` }] };
      }

      // --- 4. RFIs ---
      case "get_rfis": {
        const params = args as any;
        const result = await storage.getRFIs(params.projectId);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
      case "create_rfi": {
        const params = args as any;
        const result = await storage.createRFI({
          projectId: params.projectId,
          number: params.number,
          title: params.title,
          question: params.question,
          suggestedAnswer: params.suggestedAnswer || "",
          status: params.status || "open",
          priority: params.priority || "medium",
          costImpact: params.costImpact || "0.00",
          scheduleImpactDays: params.scheduleImpactDays || 0
        });
        return { content: [{ type: "text", text: `Success: RFI created with ID ${result.id}` }] };
      }
      case "update_rfi": {
        const params = args as any;
        const result = await storage.updateRFI(params.id, {
          title: params.title,
          question: params.question,
          suggestedAnswer: params.suggestedAnswer,
          status: params.status,
          priority: params.priority,
          costImpact: params.costImpact,
          scheduleImpactDays: params.scheduleImpactDays
        });
        return { content: [{ type: "text", text: `Success: RFI ID ${params.id} updated.` }] };
      }
      case "delete_rfi": {
        const params = args as any;
        await db.delete(rfis).where(eq(rfis.id, params.id));
        return { content: [{ type: "text", text: `Success: RFI ID ${params.id} permanently deleted.` }] };
      }

      // --- 5. SUBMITTALS ---
      case "get_submittals": {
        const params = args as any;
        const result = await storage.getSubmittals(params.projectId);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
      case "create_submittal": {
        const params = args as any;
        const result = await storage.createSubmittal({
          projectId: params.projectId,
          title: params.title,
          specSection: params.specSection,
          status: params.status || "pending_review",
          priority: params.priority || "medium",
          dueDate: params.dueDate ? new Date(params.dueDate) : null
        });
        return { content: [{ type: "text", text: `Success: Submittal registry item created with ID ${result.id}` }] };
      }
      case "update_submittal": {
        const params = args as any;
        const result = await storage.updateSubmittal(params.id, {
          title: params.title,
          specSection: params.specSection,
          status: params.status,
          priority: params.priority,
          dueDate: params.dueDate ? new Date(params.dueDate) : undefined
        });
        return { content: [{ type: "text", text: `Success: Submittal ID ${params.id} updated.` }] };
      }
      case "delete_submittal": {
        const params = args as any;
        await db.delete(submittals).where(eq(submittals.id, params.id));
        return { content: [{ type: "text", text: `Success: Submittal ID ${params.id} permanently deleted.` }] };
      }

      // --- 6. PUNCH TASKS ---
      case "get_tasks": {
        const params = args as any;
        const result = await storage.getTasks(params.projectId);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
      case "create_task": {
        const params = args as any;
        const result = await storage.createTask({
          projectId: params.projectId,
          title: params.title,
          location: params.location,
          priority: params.priority || "medium",
          status: params.status || "open",
          dueDate: params.dueDate ? new Date(params.dueDate) : null
        });
        return { content: [{ type: "text", text: `Success: Task created with ID ${result.id}` }] };
      }
      case "update_task": {
        const params = args as any;
        const result = await storage.updateTask(params.id, {
          title: params.title,
          location: params.location,
          priority: params.priority,
          status: params.status,
          dueDate: params.dueDate ? new Date(params.dueDate) : undefined
        });
        return { content: [{ type: "text", text: `Success: Task ID ${params.id} updated.` }] };
      }
      case "delete_task": {
        const params = args as any;
        await db.delete(tasks).where(eq(tasks.id, params.id));
        return { content: [{ type: "text", text: `Success: Task ID ${params.id} permanently deleted.` }] };
      }

      // --- 7. CHANGE ORDERS ---
      case "get_change_orders": {
        const params = args as any;
        const result = await storage.getChangeOrders({ projectId: params.projectId });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
      case "create_change_order": {
        const params = args as any;
        const result = await storage.createChangeOrder({
          projectId: params.projectId,
          number: params.number,
          description: params.description,
          status: params.status || "draft",
          totalAmount: params.totalAmount,
          laborAmount: params.laborAmount || "0.00",
          materialAmount: params.materialAmount || "0.00",
          equipmentAmount: params.equipmentAmount || "0.00",
          subcontractorAmount: params.subcontractorAmount || "0.00"
        });
        return { content: [{ type: "text", text: `Success: Change Order created with ID ${result.id}` }] };
      }
      case "update_change_order": {
        const params = args as any;
        const result = await storage.updateChangeOrder(params.id, {
          description: params.description,
          status: params.status,
          totalAmount: params.totalAmount,
          laborAmount: params.laborAmount,
          materialAmount: params.materialAmount,
          equipmentAmount: params.equipmentAmount,
          subcontractorAmount: params.subcontractorAmount
        });
        return { content: [{ type: "text", text: `Success: Change Order ID ${params.id} updated.` }] };
      }
      case "delete_change_order": {
        const params = args as any;
        await db.delete(changeOrders).where(eq(changeOrders.id, params.id));
        return { content: [{ type: "text", text: `Success: Change Order ID ${params.id} permanently deleted.` }] };
      }

      // --- 8. BULK ACTIONS ---
      case "bulk_add_tasks": {
        const params = args as any;
        const createdIds: number[] = [];
        for (const taskData of params.tasks) {
          const res = await storage.createTask({
            projectId: params.projectId,
            title: taskData.title,
            location: taskData.location,
            priority: taskData.priority || "medium",
            status: taskData.status || "open",
            dueDate: taskData.dueDate ? new Date(taskData.dueDate) : null
          });
          createdIds.push(res.id);
        }
        return { content: [{ type: "text", text: `Success: Bulk-added ${createdIds.length} tasks. Database IDs: ${createdIds.join(", ")}` }] };
      }
      case "bulk_add_budget_items": {
        const params = args as any;
        const createdIds: number[] = [];
        for (const itemData of params.items) {
          const res = await storage.createBudgetLineItem({
            projectId: params.projectId,
            costCodeId: itemData.costCodeId,
            originalBudget: itemData.originalBudget,
            estimatedAtCompletion: itemData.estimatedAtCompletion || itemData.originalBudget,
            committedCosts: itemData.committedCosts || "0.00",
            forecastCosts: itemData.forecastCosts || "0.00"
          });
          createdIds.push(res.id);
        }
        return { content: [{ type: "text", text: `Success: Bulk-added ${createdIds.length} budget lines. Database IDs: ${createdIds.join(", ")}` }] };
      }
      case "bulk_add_schedule_activities": {
        const params = args as any;
        const createdIds: number[] = [];
        for (const actData of params.activities) {
          const res = await storage.createScheduleActivity({
            projectId: params.projectId,
            name: actData.name,
            startDate: actData.startDate ? new Date(actData.startDate) : null,
            finishDate: actData.finishDate ? new Date(actData.finishDate) : null,
            duration: actData.duration || 0,
            percentComplete: actData.percentComplete || 0,
            criticalPath: actData.criticalPath || false,
            responsibleParty: actData.responsibleParty || ""
          });
          createdIds.push(res.id);
        }
        return { content: [{ type: "text", text: `Success: Bulk-added ${createdIds.length} lookahead schedule activities.` }] };
      }

      default:
        throw new Error(`Tool ${name} not found`);
    }
  } catch (error: any) {
    console.error(`❌ Error executing tool ${name}:`, error);
    return {
      content: [{ type: "text", text: `Error executing tool ${name}: ${error.message}` }],
      isError: true
    };
  }
});

// Setup Server-Sent Events (SSE) Express Router
export function getMcpRouter(): Router {
  const router = Router();

  router.get("/sse", async (req, res) => {
    console.log("🔌 New MCP SSE connection initiated");
    
    // Create new Server-Sent Events transport session
    // Clients will POST messages back to '/api/mcp/messages?sessionId=...'
    const transport = new SSEServerTransport("/api/mcp/messages", res);
    
    const sessionId = transport.sessionId;
    activeTransports.set(sessionId, transport);
    console.log(`🔑 MCP Session registered: ${sessionId}`);

    // Connect the transport session to the active MCP server
    await mcpServer.connect(transport);

    req.on("close", () => {
      console.log(`🔌 MCP Session closed and cleaned up: ${sessionId}`);
      activeTransports.delete(sessionId);
    });
  });

  router.post("/messages", async (req, res) => {
    const sessionId = req.query.sessionId as string;
    
    const transport = activeTransports.get(sessionId);
    if (transport) {
      await transport.handlePostMessage(req, res);
    } else {
      res.status(404).json({ error: `MCP Session not found: ${sessionId}` });
    }
  });

  return router;
}

// Standalone execution runner logic for Stdio mode
if (process.argv.includes("--stdio") || process.env.MCP_TRANSPORT === "stdio") {
  console.error("🚀 Starting ProjectBuddy MCP Server in STDIO mode...");
  const transport = new StdinStdoutServerTransport();
  mcpServer.connect(transport).catch((err) => {
    console.error("❌ Stdio transport failure:", err);
  });
}
