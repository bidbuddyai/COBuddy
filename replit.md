# AI-Powered Change Order Creator

## Overview

This is a next-generation, AI-powered Change Order Creator web application built with Express.js backend and React frontend. The application processes T&M (Time and Materials) sheets and rate tables from PDFs using OpenAI's Vision API, stores extracted data in a PostgreSQL database, and generates professional change orders in both Excel and PDF formats.

## User Preferences

Preferred communication style: Simple, everyday language.
App focus: Everything must be project-centric with project selection/filtering.
Important features: Professional dashboard with sidebar navigation, not simplified views.

## Recent Updates (January 2025)
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
- **Rate Tables**: Extracted rate data from PDFs with approval workflow (COMPANY-WIDE)
  - 17 approved rate tables with 539 total rate entries
  - Labor rates: REI wage calculator + Operating engineers (8 entries total)
  - Equipment rates: 347 entries across 9 tables
    - Tools and small equipment (157 entries)
    - Generators (10 entries)
    - Heavy equipment, compactors, rollers (41 entries)
    - Loaders and excavators (58 entries)
    - Track loaders and forklifts (46 entries)
    - Grinders and demolition equipment (24 entries)
    - Original T&M equipment table (11 entries)
  - Material rates: 179 entries across 5 tables
    - Chemicals (22 entries)
    - Machinery materials (19 entries)
    - Additional materials (82 entries)
    - Misc materials (12 entries)
    - Original materials table (44 entries)
  - Disposal rates: Hazardous waste disposal (5 entries)
- **Audit Logs**: Complete audit trail for all operations
- **Chat Conversations**: AI assistant chat history

### AI Integration
- **OpenAI GPT-4 Vision**: Document OCR and data extraction
- **Document Processing**: Automatic extraction of labor, equipment, and material data
- **Rate Matching**: AI-powered matching of extracted data to company-wide rate tables
- **Chat Assistant**: Context-aware AI helper for change order creation
- **Confidence Scoring**: Quality assessment of extracted data
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

## Current Application Status (January 12, 2025)

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
10. **Comprehensive Rate Database**: ✅ 17 rate tables with 539 entries covering all equipment, materials, labor, and disposal categories

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