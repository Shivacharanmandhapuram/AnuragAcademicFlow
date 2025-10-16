# AcademicFlow - Modern Academic Workspace

## Overview

AcademicFlow is a modern, minimal academic workspace platform designed for university students and faculty. The application enables users to share notes and code, generate citations, and leverage AI-powered tools for academic writing and integrity verification. The platform supports two distinct user roles with tailored features:

**Students:** Create and share notes/code, generate academic citations, and receive AI-powered writing assistance.

**Faculty:** Detect AI-generated content in submissions, verify citation accuracy, and review student work.

The application follows a clean, professional design philosophy inspired by Notion and Linear, emphasizing minimal interfaces with purposeful animations and clear visual hierarchy.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System:**
- React 18 with TypeScript for type-safe component development
- Vite as the build tool for fast development and optimized production builds
- Wouter for client-side routing (lightweight alternative to React Router)
- React Query (TanStack Query) for server state management and data fetching

**UI Component System:**
- Radix UI primitives for accessible, unstyled components
- Tailwind CSS for utility-first styling with custom design tokens
- Shadcn/ui component library (New York style variant) for consistent UI patterns
- Custom theming system with CSS variables supporting light/dark modes
- Lucide icons for modern iconography

**Code Editor Integration:**
- CodeMirror 6 for syntax-highlighted code editing
- Support for multiple languages: JavaScript, Python, Java, C++, HTML, CSS
- One Dark theme for code syntax highlighting
- React Quill for rich text editing (lazy-loaded for performance)

**Design System:**
- Primary color: Indigo (#4F46E5)
- Typography: Inter font family with JetBrains Mono for code
- Consistent spacing scale and border radius system
- Hover and active elevation states for interactive elements

### Backend Architecture

**Server Framework:**
- Node.js with Express.js for REST API endpoints
- TypeScript for type safety across the stack
- Session-based authentication using express-session
- Custom middleware for request logging and error handling

**API Structure:**
- RESTful endpoints organized by feature domain
- `/api/auth/*` - Authentication and user management
- `/api/notes/*` - Note CRUD operations
- `/api/citations/*` - Citation generation and management
- `/api/submissions/*` - Student submission handling
- `/api/faculty/*` - Faculty-specific features (AI detection, citation verification)

**Authentication Strategy:**
- **Current:** Simple name-based authentication for quick development
  - Express-session with secure HTTP-only cookies
  - User role selection on first login (student/faculty)
  - Session persistence with 7-day expiration
- **Future:** Clerk integration ready (packages installed, guide available)
  - See `CLERK_AUTH_GUIDE.md` for manual implementation steps
  - Clerk packages (`@clerk/clerk-react`, `@clerk/express`) already installed

**AI Integration:**
- OpenAI API integration for AI-powered features
- Text improvement and summarization
- Grammar correction
- AI content detection (for faculty)
- Citation verification

### Data Storage

**Database System:**
- PostgreSQL via Neon serverless database
- Drizzle ORM for type-safe database operations
- Connection pooling via @neondatabase/serverless with WebSocket support

**Schema Design:**

**Users Table:**
- Stores user profile information
- Supports role-based access (student/faculty)
- Optional department assignment
- Designed with Clerk integration in mind (email, firstName, lastName, profileImageUrl fields)

**Notes Table:**
- Supports multiple note types: research, code, general
- Language specification for code notes
- Public/private visibility toggle
- Unique share tokens for public note sharing
- Soft cascading deletes via foreign key to users

**Citations Table:**
- Linked to notes for citation management
- Supports multiple citation styles (APA, MLA, IEEE)
- Stores original input and generated citation

**Submissions Table:**
- Student-faculty relationship tracking
- AI detection scoring
- Citation verification status
- Grading and feedback support

**Relations:**
- One-to-many: User → Notes
- One-to-many: User → Submissions (as student)
- One-to-many: User → Submissions (as faculty reviewer)
- One-to-many: Note → Citations

### External Dependencies

**Authentication Service:**
- **Current Implementation:** Express-session with name-based authentication
  - Simple name input on landing page
  - Session-based user tracking
  - No external auth service required for development
- **Clerk Ready for Production:**
  - Packages installed: `@clerk/clerk-react`, `@clerk/express`
  - Comprehensive implementation guide: `CLERK_AUTH_GUIDE.md`
  - Environment variables needed (not yet configured):
    - `CLERK_PUBLISHABLE_KEY`
    - `CLERK_SECRET_KEY`
    - `VITE_CLERK_PUBLISHABLE_KEY`

**Database Service:**
- Neon PostgreSQL serverless database
- Environment variable: `DATABASE_URL`
- WebSocket-based connections for serverless compatibility

**AI Service:**
- OpenAI API for text processing and analysis
- Environment variable: `OPENAI_API_KEY`
- Features: text improvement, summarization, grammar checking, AI detection

**File Storage:**
- Prepared for AWS S3 integration (Multer configured)
- Currently not actively used in the application

**Development Tools:**
- Replit-specific plugins for development environment
- Vite plugins: runtime error modal, cartographer, dev banner
- Development-only features conditionally loaded

**Build & Development:**
- ESBuild for server-side bundling
- Vite for client-side bundling with TypeScript support
- Path aliases configured for clean imports (`@/*`, `@shared/*`, `@assets/*`)
- TypeScript strict mode enabled across the project

**Migration System:**
- Drizzle Kit for schema migrations
- Migration files stored in `/migrations` directory
- Push command available for quick schema updates

## Recent Changes & Work in Progress

### October 16, 2025 - PDF Upload Feature with AWS S3 (IN PROGRESS)

**Status:** ⏸️ Paused - Awaiting AWS credentials from user

**What We're Building:**
- PDF upload functionality to replace "Share Notes" quick action
- AWS S3 integration for secure file storage
- Public shareable links for all uploaded PDFs (no authentication required)
- Metadata tracking in database for uploaded files

**Implementation Plan:**
1. ✅ Requested AWS credentials (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, S3_BUCKET_NAME)
2. ⏳ Install AWS SDK v3 packages (@aws-sdk/client-s3, @aws-sdk/lib-storage) and multer
3. ⏳ Create uploaded_files database table (id, userId, filename, s3Key, publicUrl, shareToken, uploadedAt)
4. ⏳ Update storage interface for uploaded files CRUD operations
5. ⏳ Build S3 upload service module
6. ⏳ Create /api/upload-pdf endpoint with Multer
7. ⏳ Create /api/public/files/:shareToken endpoint for public access
8. ⏳ Update student dashboard - replace Share Notes card with PDF Upload
9. ⏳ Build PDF upload modal component
10. ⏳ Test complete flow

**Technical Approach:**
- Using AWS SDK v3 (latest version, modular)
- Multer middleware for handling multipart/form-data file uploads
- Stream uploads for memory efficiency
- Public URLs generated automatically with unique share tokens
- No authentication required for viewing shared PDFs

**Bugs Fixed Today:**
- ✅ AI Assistant modal - Fixed response parsing so "Apply Changes" button displays correctly
- ✅ Quick Actions buttons - Fixed navigation errors (was using invalid note ID "-1")
- ✅ Citation generation - Fixed parameter mismatch (input→inputText, style→citationStyle)
- ✅ All AI features now fully working (improve text, summarize, grammar check, citations)