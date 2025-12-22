# AI-Powered Change Order Creator

## Overview
This AI-powered web application streamlines the creation of change orders using Express.js and React. It processes uploaded T&M sheets, quotes, and invoices via Azure Document Intelligence and OpenAI Vision API to extract labor, equipment, and material data. This data is then matched against company rate tables to calculate accurate pricing. Users can generate professional Excel and PDF change orders, significantly improving efficiency in project management and financial tracking. The business vision is to provide a robust, AI-driven solution for construction and project-based industries, reducing manual effort and ensuring accurate financial documentation.

## User Preferences
Preferred communication style: Simple, everyday language.
App focus: Everything must be project-centric with project selection/filtering.
Important features: Professional dashboard with sidebar navigation, not simplified views.
Document categorization: Invoices from companies like Incompli are subcontractor entries, not labor. Invoices are typically for subcontractors, equipment rentals, or operated equipment.

## Recent Changes (December 20, 2025) - Phase 2 AI Optimization
- **Semantic Search (pgvector)**: Added pgvector extension for vector similarity search on rate tables. Rate items now have embeddings generated via OpenAI text-embedding-3-small.
- **Rate Items Table**: Created new `rateItems` table to flatten rate table data for individual item search with embeddings.
- **Embedding Service**: New `embeddingService.ts` with semantic and hybrid search capabilities. Includes construction-specific synonym mapping (drywall↔sheetrock, mudding↔taping, etc.).
- **Supervisor Agent**: Implemented `supervisorAgent.ts` for AI output validation. Checks for $0.00 rates, missing classifications, calculation errors. Includes retry logic with structured feedback (max 2 retries).
- **AI Tools with Function Calling**: Created strict OpenAI function calling tools in `aiTools.ts`:
  - `search_rate_table` - Uses semantic search (prevents hallucination)
  - `update_draft_line_items` - Persists to draftState JSONB
  - `calculate_totals` - Applies project markups
  - `get_project_context` - Retrieves project details
- **Draft State Management**: Added `draftState` JSONB column to changeOrders for AI workflow state machine. All draft updates are persisted to database.
- **ChangeOrderManifest**: Strict Zod schemas in `shared/types.ts` for Excel/PDF exports ensuring consistency between chat and generated documents. Contains header, categories (with line items), totals, markups, and signature block.
- **Live PDF Preview**: New `LiveCOPreview.tsx` component using `@react-pdf/renderer` to render real-time PDF preview in side panel. Updates instantly when AI modifies the draft.
- **Manifest Synchronization**: AI assistant now returns the full ChangeOrderManifest object with each response when draft is updated. `createManifestFromDraft()` converts DraftState to manifest with per-category rollups and markup calculations.
- **Type Safety**: All AI outputs validated using Zod schemas via zod-to-json-schema before processing.

## Previous Changes (December 22, 2025)
- **Authentication Migration**: Migrated from Supabase Auth to Replit Auth (OpenID Connect). Using Replit's built-in authentication with support for Google, GitHub, and email login. Session management via `isAuthenticated` middleware in `server/replit_integrations/auth/`.
- **Auth Flow**: Login via `/api/login`, logout via `/api/logout`, user data at `/api/auth/user`. Frontend uses `useAuth()` hook from `@/hooks/use-auth.ts`.

## Previous Changes (October 28, 2025)
- **Database Migration**: Migrated from Supabase to Replit PostgreSQL (primary database).
- **Project Context**: Implemented global ProjectContext with localStorage persistence for maintaining selected project across page refreshes.
- **Schema Updates**: Added `lastExportedAt` and `exportedFiles` fields to changeOrders table for export tracking.
- **Type Safety**: Resolved all TypeScript compilation errors across the codebase.
- **API Standardization**: Ensured consistent response formats between frontend and backend (`{ data, total }` envelopes).
- **Guided CO Creation**: Implemented complete multi-step guided workflow with AI estimation, knowledge base querying, and live CO preview.

## System Architecture

### Full-Stack TypeScript Application
The application is a full-stack TypeScript application, utilizing:
- **Frontend**: React with TypeScript and Vite.
- **Backend**: Express.js with TypeScript.
- **Database**: Replit PostgreSQL with Drizzle ORM.
- **Authentication**: Replit Auth (OpenID Connect) with session-based authentication.
- **AI Integration**: OpenAI GPT-4 Vision for document processing and chat assistance.
- **UI Framework**: Radix UI components styled with Tailwind CSS.

### Monorepo Structure
The project is organized as a monorepo containing:
- `client/`: React frontend.
- `server/`: Express.js backend API.
- `shared/`: Shared TypeScript types and database schemas.

### Key Features and Design Decisions
- **UI/UX**: Utilizes Radix UI and Tailwind CSS for accessible and utility-first styling, with a primary brand color of green (#03512A). The dashboard features professional sidebar navigation.
- **Document Processing Pipeline**: Includes multi-file drag-and-drop upload, AI extraction (OpenAI Vision), data validation with confidence scoring, rate matching, an admin approval workflow, and storage in PostgreSQL.
- **Change Order Generation**: Combines project-specific T&M data with company-wide rates to generate professional Excel and PDF outputs matching predefined templates, supporting multi-document change order creation.
- **AI Assistant "CO Buddy AI"**: A comprehensive AI assistant capable of creating/editing change orders, generating exports, editing rate tables conversationally, and validating imported documents. It features context-aware suggestions and conversation logging.
- **Company Management System**: Supports multi-tenancy with company-scoped data, user invitation, role assignment, and project-specific markup percentages.
- **Rate Tables**: Supports both company-specific and public rate tables (e.g., Caltrans rates), with comprehensive editing functionality.
- **Document Editor**: Allows inline editing of all extracted T&M data, including labor, equipment, materials, and disposal items, with automatic recalculation and low confidence warnings.
- **CO Log Management System**: Comprehensive change order tracking with:
  - Auto-numbering for GC RFCs, COs, and Subcontractor COs aligned with project sequences
  - Excel import/export with validation and template generation
  - Hierarchical view with expandable subcontractor change orders under each GC CO
  - Advanced aggregation calculations including variance analysis and rollup metrics
  - Professional dashboard with project-based filtering and inline editing capabilities
- **Database Schema**: Includes entities for Users (role-based), Projects, Change Orders (enhanced with GC/SCO tracking), Documents, Rate Tables, Subcontractors, Subcontractor Change Orders, Numbering Sequences, Audit Logs, and Chat Conversations.

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connectivity.
- **OpenAI API**: For AI document processing and chat assistance.
- **Drizzle ORM**: For type-safe database interactions and migrations.
- **Multer**: Handles multipart file uploads.
- **ExcelJS**: Used for generating Excel documents.
- **PDF-lib**: Used for generating PDF documents.

### UI Dependencies
- **Radix UI**: Provides accessible UI component primitives.
- **Tailwind CSS**: For utility-first styling.
- **Lucide React**: Icon library.
- **React Hook Form**: For robust form management.
- **Recharts**: For data visualization on the analytics dashboard.