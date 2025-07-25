# AI-Powered Change Order Creator

## Overview

This is a next-generation, AI-powered Change Order Creator web application built with Express.js backend and React frontend. The application follows a specific workflow:

1. **Upload**: Users upload T&M (Time and Materials) sheets as PDFs through the Documents page
2. **AI Processing**: Azure Document Intelligence + OpenAI Vision API extract labor, equipment, and material data from the PDFs
3. **Rate Matching**: Extracted data is matched against company rate tables for accurate pricing
4. **Change Order Creation**: Users click "Create CO" on processed documents to generate change orders with calculated amounts
5. **Export**: Change orders can be exported as professional Excel and PDF documents

The app processes T&M sheets, quotes, and invoices using AI, stores extracted data in PostgreSQL, and streamlines the change order creation process.

## User Preferences

Preferred communication style: Simple, everyday language.
App focus: Everything must be project-centric with project selection/filtering.
Important features: Professional dashboard with sidebar navigation, not simplified views.
Document categorization: Invoices from companies like Incompli are subcontractor entries, not labor. Invoices are typically for subcontractors, equipment rentals, or operated equipment.

## Recent Updates (January 2025)
- **Enhanced AI Invoice Categorization (Jan 25, 2025)**: Major improvement to subcontractor invoice detection
  - Fixed AI processing to properly detect invoices from companies like Incompli as SUBCONTRACTOR entries
  - Enhanced both main T&M extraction and dedicated invoice processing with priority-based classification
  - Added clear detection signals: invoice numbers, vendor names, company letterheads = subcontractor entries
  - Equipment rental invoices now properly categorized as subcontractor entries (not equipment)
  - AI defaults to subcontractor categorization when document shows business-to-business billing
  - Fixed TypeScript errors in document processing pipeline
- **Added Project-Specific Markup Percentages (Jan 13, 2025)**: Major enhancement
  - Added markup percentage fields to project schema for each category
  - Project creation form now includes markup configuration section
  - Default markups: Labor 20%, Materials 20%, Equipment Owned 20%, Equipment Rented 20%, Disposal 15%, Import 15%, Subcontractors 5%
  - Change Order Form automatically uses project-specific markups
  - Each project can have different markup percentages
  - Database migration completed to add markup columns
  - AI assistant aware of project markups and can display them
- **Enhanced Change Order Form to Match Professional PDF Template (Jan 13, 2025)**: Comprehensive update
  - Created detailed ChangeOrderForm component with all cost categories from PDF template
  - Includes sections for: Labor, Materials, Equipment (Owned/Rented), Disposal, Import Duty, Subcontractors
  - Each section has customizable markup percentages (default 15% labor, 25% materials)
  - Automatic calculation of amounts with markup applied to each category
  - Professional layout matching REI's change order PDF format
  - Multi-document support for creating change orders from multiple T&M sheets
  - Fixed API validation by ensuring all amount fields are sent as strings
  - Updated both ChangeOrders and Documents pages to use new comprehensive form
  - Removed old simple change order creation mutations in favor of new form
- **Updated App Branding with CO Buddy AI Icon (Jan 13, 2025)**: Comprehensive branding update
  - Added new CO Buddy AI icon across the application
  - Updated Sidebar with new paperclip-style logo
  - Updated Landing page with prominent CO Buddy AI branding
  - Updated Home page header with icon integration
  - Added browser tab title and favicon
  - Consistent branding throughout the application
- **Added Company Management System (Jan 13, 2025)**: Comprehensive company and team management features
  - New Company page for managing team members and company information
  - User invitation system for adding team members with role assignment
  - Admin users can update company info, manage team roles, and remove users
  - All data is properly scoped by company for secure multi-tenant access
  - Added navigation link in sidebar with Building2 icon
- **Added Rate Table Editing (Jan 12, 2025)**: Implemented full edit functionality for rate tables with inline editing
  - Click eye icon to view rates, then "Edit Rates" button to enable editing mode
  - Edit rates, descriptions, codes and units directly in the table
  - Save changes with immediate database updates
  - Admin and PM roles can edit rates
- **Added Quote and Invoice Processing**: Expanded AI vision to handle quotes and invoices in addition to T&M sheets
- **Fixed Analytics to be Project-Focused**: Analytics now supports project selection and filtering
- **Added Project Management**: Created comprehensive Projects page with CRUD operations
- **Integrated Project Selection**: Analytics dashboard includes project selector with "All Projects" option
- **Updated Navigation**: Added Projects section to sidebar navigation
- **Fixed SQL Query Issues**: Resolved analytics service database query errors
- **Confirmed Rate Tables are Company-Wide**: Rate tables apply to all projects for same company
- **Comprehensive Feature Testing (Jan 12, 2025)**: Systematically tested all major features
- **Implemented Animated Loading Indicators**: Added multi-stage document processing animations with visual feedback
- **Created Documents Page**: New comprehensive document management page with processing states
- **Switched to Replit Database**: Migrated from external database to Replit's integrated PostgreSQL
- **Massive Rate Database Expansion (Jan 12, 2025)**: Successfully imported 539 rate entries across 17 tables from T&M Calculator PDF
  - Equipment rates: 347 entries (tools, heavy equipment, generators, compactors, excavators, loaders, forklifts)
  - Material rates: 179 entries (chemicals, machinery materials, demolition materials, PPE, containment)
  - Labor rates: 8 entries (REI wage calculator, operating engineers)
  - Disposal rates: 5 entries (hazardous waste disposal)
- **Caltrans Public Rates Import (Jan 13, 2025)**: Successfully imported 2,164 Caltrans equipment rental rates
  - 60 rate tables organized by equipment class (air compressors, pavers, excavators, etc.)
  - All rates marked as public (companyId = null) and available to all companies
  - Public rates display "Public" badge in the UI
  - Only admin users can upload additional Caltrans rates via CSV upload
- **Enhanced AI Assistant "CO Buddy AI" (Jan 13, 2025)**: Comprehensive AI assistant with full change order management capabilities
  - Create/edit change orders from T&M sheets and documents
  - Generate Excel and PDF exports with proper REI formatting
  - Edit rate tables directly through conversational interface
  - Validate imported documents against rate tables
  - Context-aware suggestions based on current page
  - Complete conversation logging for learning and reference
  - Quick action buttons for common tasks
- **Document Editor Feature (Jan 13, 2025)**: All uploaded and parsed documents can now be edited
  - Edit extracted T&M data with inline editing
  - Add/remove/modify labor, equipment, materials, and disposal items
  - Automatic total recalculation when rates or quantities change
  - Low confidence warnings for documents needing review
  - Save changes directly to database

## System Architecture

### Full-Stack TypeScript Application
- **Frontend**: React with TypeScript, Vite for build tooling
- **Backend**: Express.js with TypeScript 
- **Database**: PostgreSQL with Drizzle ORM
- **AI Integration**: OpenAI GPT-4 Vision for document processing and chat assistance
- **UI Framework**: Radix UI components with Tailwind CSS styling

### Monorepo Structure
The project uses a monorepo structure with shared types and schemas:
- `client/` - React frontend application
- `server/` - Express.js backend API
- `shared/` - Shared TypeScript types and database schemas

## Key Components

### Frontend Architecture
- **React with TypeScript**: Modern React with hooks and TypeScript for type safety
- **Wouter Router**: Lightweight client-side routing
- **TanStack Query**: Server state management and caching
- **Radix UI + Tailwind CSS**: Accessible UI components with utility-first styling
- **Brand Colors**: Primary green (#03512A) with comprehensive design system

### Backend Architecture
- **Express.js REST API**: RESTful API endpoints for all operations
- **Drizzle ORM**: Type-safe database queries with PostgreSQL
- **File Upload Handling**: Multer for multipart file uploads
- **Session Management**: PostgreSQL session store for authentication
- **Error Handling**: Centralized error handling middleware

### Database Schema
- **Users**: Role-based authentication (admin, pm, field, readonly)
- **Projects**: Project management and organization with client info, budgets, and status tracking
- **Change Orders**: Core business entity with status tracking (PROJECT-SPECIFIC)
- **Documents**: File uploads with processing status (PROJECT-SPECIFIC)
- **Rate Tables**: Extracted rate data from PDFs with approval workflow (COMPANY-WIDE and PUBLIC)
  - 77 approved rate tables with 2,703 total rate entries
  - Company-specific rates (Resource Environmental): 17 tables with 539 entries
    - Labor rates: REI wage calculator + Operating engineers (8 entries total)
    - Equipment rates: 347 entries across 9 tables
    - Material rates: 179 entries across 5 tables
    - Disposal rates: Hazardous waste disposal (5 entries)
  - Public Caltrans rates: 60 tables with 2,164 entries
    - All equipment rental rates for California DOT projects
    - Organized by equipment class (air compressors, pavers, excavators, etc.)
    - Available to all companies in the system
    - Displayed with "Public" badge in UI
- **Audit Logs**: Complete audit trail for all operations
- **Chat Conversations**: AI assistant chat history

### AI Integration  
- **OpenAI GPT-4 Vision**: Document OCR and data extraction for T&M sheets, quotes, and invoices
- **Document Processing**: Automatic extraction of labor, equipment, material, and disposal data
- **Rate Matching**: AI-powered matching of extracted data to company-wide and public rate tables
- **CO Buddy AI Assistant**: Full-featured AI assistant with comprehensive capabilities:
  - Create and edit change orders from T&M documents
  - Generate professional Excel and PDF exports
  - Edit rate tables through natural language commands
  - Validate imports against rate tables for accuracy
  - Context-aware suggestions based on current page
  - Complete action execution with API integration
  - Conversation logging for continuous improvement
- **Confidence Scoring**: Quality assessment of extracted data with visual indicators
- **Analytics AI**: Advanced anomaly detection and predictive modeling per project

## Data Flow

### Document Processing Pipeline
1. **File Upload**: Multi-file drag-and-drop with preview
2. **AI Processing**: OpenAI Vision API extracts structured data
3. **Data Validation**: Confidence scoring and flagging low-quality extractions
4. **Rate Matching**: Automatic matching to approved rate tables
5. **Review Process**: Admin approval workflow for extracted data
6. **Storage**: Structured data stored in PostgreSQL

### Change Order Generation
1. **Data Compilation**: Combine project-specific T&M data with company-wide rate information
2. **Excel Generation**: Professional Excel output matching PDF templates
3. **PDF Generation**: Branded PDF documents with company styling
4. **Status Tracking**: Full lifecycle management from draft to approved
5. **Project Organization**: All change orders organized by project with proper filtering

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connectivity
- **OpenAI API**: Document processing and AI assistance
- **Drizzle ORM**: Database operations and migrations
- **Multer**: File upload handling
- **ExcelJS**: Excel document generation
- **PDF-lib**: PDF document generation

### UI Dependencies
- **Radix UI**: Accessible component primitives
- **Tailwind CSS**: Utility-first styling
- **Lucide React**: Icon library
- **React Hook Form**: Form management
- **Recharts**: Data visualization

## Deployment Strategy

### Development Environment
- **Vite Dev Server**: Fast development with HMR
- **TypeScript Compilation**: Type checking and compilation
- **Database Migrations**: Drizzle Kit for schema management
- **Environment Variables**: Secure configuration management

### Production Build
- **Frontend**: Vite build optimized for production
- **Backend**: ESBuild compilation for Node.js
- **Database**: PostgreSQL with connection pooling
- **File Storage**: Local file system with organized structure

### Configuration Management
- **Environment Variables**: DATABASE_URL, OPENAI_API_KEY
- **Build Scripts**: Separate dev, build, and production commands
- **Type Safety**: Full TypeScript coverage across the stack

### Security Considerations
- **Input Validation**: Comprehensive validation on all endpoints
- **File Upload Security**: Type and size restrictions
- **SQL Injection Prevention**: Parameterized queries via Drizzle ORM
- **Authentication**: Session-based authentication with role-based access

## Current Application Status (January 13, 2025)

### ✅ **WORKING FEATURES:**
1. **Company-Based Authentication**: ✅ Resource Environmental gets pre-loaded rates, chase@resource-env.com gets admin role
2. **Company Management System**: ✅ Automatic company assignment based on email domain
3. **AI-Powered Setup Modal**: ✅ New companies can upload rates with AI assistance
4. **Rate Tables Management**: ✅ Company-specific rate isolation with 539 authentic rates for Resource Environmental (expanded from 68)
5. **Project Creation**: ✅ Fixed API calls, project creation now working properly
6. **Analytics Dashboard**: ✅ Project-specific analytics with cost trends and anomaly detection
7. **Database Schema**: ✅ Migrated to support company-based architecture
8. **Authentication System**: ✅ Replit Auth with PostgreSQL sessions and string-based user IDs
9. **API Infrastructure**: ✅ RESTful endpoints with proper error handling
10. **Comprehensive Rate Database**: ✅ 77 rate tables with 2,703 entries covering all equipment, materials, labor, and disposal categories
11. **Rate Table Editing**: ✅ Full edit functionality with inline editing for rates, descriptions, codes and units
12. **Public Caltrans Rates**: ✅ 2,164 public equipment rental rates available to all companies
13. **CO Buddy AI Assistant**: ✅ Comprehensive AI assistant that can create/edit change orders, generate Excel/PDF exports, edit rates, and validate imports
14. **Document Editor**: ✅ All processed documents can be edited with inline editing for labor, equipment, materials, and disposal items
15. **Change Order Export**: ✅ Generate professional Excel and PDF change orders with proper REI formatting
16. **AI Conversation Logging**: ✅ Complete conversation history tracking for continuous improvement

### ✅ **COMPANY-SPECIFIC FEATURES:**
- **Resource Environmental**: Pre-loaded with existing rate tables, chase@resource-env.com has admin access
- **Other Companies**: Get their own isolated system with AI-powered rate upload assistance
- **Company Setup Modal**: Shows for new companies to guide rate table setup
- **Rate Table Isolation**: Each company has their own rate tables and data

### ✅ **ARCHITECTURAL COMPLIANCE:**
- **Company-Based Organization**: All features properly organized by company
- **Rate Table Isolation**: Each company has separate rate tables
- **No Sample Data**: Clean database with authentic Resource Environmental rates only
- **Modern Stack**: TypeScript, React, Express, PostgreSQL all functioning