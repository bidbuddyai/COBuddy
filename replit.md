# AI-Powered Change Order Creator

## Overview
This AI-powered web application streamlines the creation of change orders using Express.js and React. It processes uploaded T&M sheets, quotes, and invoices via Azure Document Intelligence and OpenAI Vision API to extract labor, equipment, and material data. This data is then matched against company rate tables to calculate accurate pricing. Users can generate professional Excel and PDF change orders, significantly improving efficiency in project management and financial tracking. The business vision is to provide a robust, AI-driven solution for construction and project-based industries, reducing manual effort and ensuring accurate financial documentation.

## User Preferences
Preferred communication style: Simple, everyday language.
App focus: Everything must be project-centric with project selection/filtering.
Important features: Professional dashboard with sidebar navigation, not simplified views.
Document categorization: Invoices from companies like Incompli are subcontractor entries, not labor. Invoices are typically for subcontractors, equipment rentals, or operated equipment.

## System Architecture

### Full-Stack TypeScript Application
The application is a full-stack TypeScript application, utilizing:
- **Frontend**: React with TypeScript and Vite.
- **Backend**: Express.js with TypeScript.
- **Database**: PostgreSQL with Drizzle ORM.
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