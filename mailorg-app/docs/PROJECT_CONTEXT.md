# MailOrg Project Context

**Version:** 1.0.0  
**Status:** Active Development  
**Last Updated:** July 2026

---

# 1. Executive Summary

## Overview

MailOrg is an AI-powered email workspace built on top of Gmail. It transforms a traditional inbox into an intelligent productivity system by combining modern software engineering with advanced artificial intelligence.

Rather than replacing Gmail, MailOrg enhances it by providing intelligent organization, contextual understanding, task management, semantic search, email summarization, smart categorization, and AI-assisted workflows.

The goal is to reduce inbox overload, eliminate repetitive email management tasks, and help users focus on what matters most.

MailOrg is designed as a production-quality SaaS application with a strong emphasis on reliability, security, scalability, performance, maintainability, and exceptional user experience.

---

## Vision

To build the world's most intelligent AI-powered email workspace that helps people regain control of their inbox and spend less time managing email.

---

## Mission

Our mission is to transform email from a source of stress into an organized, intelligent workspace that helps users make better decisions, save time, and improve productivity through responsible use of artificial intelligence.

---

## Core Principles

Every decision made within MailOrg should align with these principles:

- User-first design
- AI should assist, not replace users
- Simplicity over unnecessary complexity
- Security and privacy by default
- Production-quality engineering
- Scalability from day one
- Accessibility for all users
- Performance is a feature
- Maintainable and readable code
- Continuous improvement through user feedback

---# 2. Product Vision & Philosophy

## Product Vision

MailOrg aims to become the intelligent workspace users naturally rely on whenever they open their inbox.

Instead of treating email as a collection of messages, MailOrg treats email as a collection of information, conversations, commitments, and decisions.

The product should help users understand what matters, organize their work, and complete tasks with confidence while remaining fully in control of their data.

Our long-term vision is to make MailOrg the operating system for email productivity by combining artificial intelligence with thoughtful product design.

---

## Product Philosophy

Every feature developed for MailOrg must support at least one of the following goals:

- Reduce time spent managing email.
- Reduce cognitive load.
- Improve decision making.
- Increase productivity.
- Improve organization.
- Enhance trust in AI-assisted workflows.

Features that do not clearly improve the user experience should not be built.

---

## AI Philosophy

Artificial intelligence exists to assist users—not replace them.

MailOrg should:

- Explain its reasoning where appropriate.
- Provide suggestions rather than automatic actions whenever user intent is uncertain.
- Allow users to remain in control of important decisions.
- Learn from user interactions without becoming unpredictable.
- Produce reliable, transparent, and helpful results.

Users should always understand why the AI made a recommendation.

---

## User Experience Principles

MailOrg should feel:

- Fast
- Clean
- Calm
- Predictable
- Professional
- Trustworthy

The interface should reduce distractions rather than introduce them.

Complex functionality should be presented through simple interactions.

---

## Engineering Philosophy

Engineering decisions should prioritize long-term maintainability over short-term convenience.

Every implementation should strive for:

- Simplicity
- Scalability
- Security
- Performance
- Readability
- Testability
- Maintainability

Shortcuts that increase long-term technical debt should be avoided unless there is a compelling business reason.

---

## Decision-Making Framework

Before implementing any feature, ask the following questions:

1. Does this solve a real user problem?
2. Is this the simplest effective solution?
3. Does it align with MailOrg's vision?
4. Is it secure?
5. Is it scalable?
6. Is it maintainable?
7. Will users understand it without additional explanation?

If the answer to several of these questions is "no," the feature should be reconsidered.
# 3. Target Users & User Personas

## Target Users

MailOrg is designed for people who rely on email as an essential part of their daily work and personal organization. Our users value efficiency, clarity, and intelligent assistance without sacrificing control over their data.

The initial target audience includes:

- Professionals
- Founders and entrepreneurs
- Freelancers
- Consultants
- Students
- Researchers
- Small business owners
- Remote teams
- Knowledge workers

Although MailOrg is built on Gmail, the focus is not on replacing Gmail but on making it significantly more productive.

---

## Primary User Persona

### The Busy Professional

**Profile**

A professional who receives dozens or hundreds of emails every day and struggles to keep up with communication.

**Goals**

- Find important emails quickly.
- Reduce inbox clutter.
- Save time reading long email threads.
- Never miss important tasks.
- Respond faster.

**Pain Points**

- Information overload.
- Lost follow-ups.
- Repetitive email management.
- Time-consuming searches.
- Difficulty prioritizing work.

---

## Secondary User Persona

### Founder or Business Owner

**Profile**

Someone managing multiple conversations with customers, investors, employees, partners, and vendors.

**Goals**

- Focus on high-value conversations.
- Automatically identify action items.
- Maintain awareness of important communications.
- Delegate repetitive work.

**Pain Points**

- Inbox grows faster than it can be managed.
- Important emails are buried.
- Constant context switching.

---

## Future User Personas

Future versions of MailOrg may support:

- Large enterprise organizations
- Customer support teams
- Sales teams
- Recruiters
- Legal professionals
- Healthcare professionals (subject to compliance requirements)
- Educational institutions

Each new audience should be evaluated to ensure MailOrg remains focused and easy to use.

---

## User Needs

Every feature should satisfy one or more of the following needs:

- Save time
- Reduce cognitive load
- Improve organization
- Increase productivity
- Improve decision-making
- Surface important information
- Automate repetitive work
- Enhance confidence in email management

If a feature does not address a clear user need, it should not be prioritized.

---

## User Trust

User trust is the foundation of MailOrg.

To maintain that trust, MailOrg must:

- Clearly explain AI-generated suggestions when appropriate.
- Protect user privacy.
- Never perform irreversible actions without user confirmation.
- Be transparent about limitations.
- Handle sensitive information responsibly.
- Prioritize reliability over novelty.

Long-term success depends more on trust than on the number of AI features.
# 4. Product Scope & Core Features

## Product Scope

MailOrg is an AI-powered email workspace built on top of Gmail. It enhances the Gmail experience by adding intelligence, organization, and productivity features without replacing Gmail as the user's primary email provider.

The product focuses on helping users:

- Understand their inbox faster.
- Prioritize important communications.
- Organize information intelligently.
- Extract actionable insights.
- Reduce repetitive email work.
- Improve daily productivity.

MailOrg is designed as a productivity platform rather than a traditional email client.

---

## Core Product Capabilities

The core capabilities of MailOrg include:

### Intelligent Inbox

- AI-powered email prioritization
- Smart categorization
- Importance scoring
- Custom inbox views
- AI-powered filtering

---

### AI Summaries

- Individual email summaries
- Conversation summaries
- Daily inbox digest
- Weekly recap
- Key decision extraction

---

### Smart Search

Users should be able to search using natural language.

Examples:

- Emails from John about invoices.
- Meetings scheduled last month.
- Unanswered client emails.
- Messages mentioning project deadlines.

Search should understand meaning, not just keywords.

---

### Task Extraction

MailOrg should automatically identify:

- Tasks
- Follow-ups
- Deadlines
- Meetings
- Commitments
- Requests

Users should always be able to review and edit AI-generated tasks before they are saved.

---

### AI Assistance

Examples include:

- Draft email replies
- Improve writing
- Rewrite tone
- Generate summaries
- Explain long conversations
- Suggest next actions

AI should assist rather than replace user decision-making.

---

### Productivity Features

Examples:

- Reminders
- Snooze
- Follow-up tracking
- Smart labels
- Custom workflows
- AI recommendations

These features should reduce manual work while remaining transparent and predictable.

---

## MVP Features

The first production version of MailOrg should focus on solving the most important user problems.

Initial priorities include:

- Gmail authentication
- Inbox synchronization
- AI summaries
- AI search
- Task extraction
- Smart prioritization
- Basic settings
- Secure authentication
- Responsive user interface

Avoid expanding the MVP with unnecessary features before validating core value.

---

## Future Features

Potential future enhancements include:

- Shared workspaces
- Team collaboration
- AI agents
- Calendar intelligence
- Meeting preparation
- CRM integrations
- Slack integration
- Mobile applications
- Browser extension
- Voice interaction
- Workflow automation
- Enterprise administration

Future features should only be implemented after validating user demand.

---

## Non-Goals

MailOrg is **not** intended to:

- Replace Gmail.
- Become a full CRM.
- Become a project management platform.
- Replace dedicated chat applications.
- Perform fully autonomous actions without user approval.
- Add AI features simply because they are technically possible.

Maintaining product focus is essential for long-term success.
# 5. Technical Stack & Technology Standards

## Technology Philosophy

MailOrg is built using modern, stable, and well-supported technologies that maximize developer productivity, maintainability, scalability, and long-term sustainability.

Technology choices should prioritize:

- Simplicity over unnecessary complexity
- Strong community support
- Excellent developer experience
- Long-term maintainability
- Type safety
- Performance
- Security
- Scalability

Avoid introducing new technologies unless they provide clear and measurable value.

---

## Frontend

### Framework

- Next.js 16 (App Router)

Next.js provides the foundation for MailOrg through:

- Server Components
- Server Actions
- Route Handlers
- Optimized rendering
- File-based routing
- Built-in performance optimizations

Server-first development should be the default approach.

---

### UI Library

- React 19

React powers the user interface using modern component architecture and composability.

Components should be:

- Reusable
- Accessible
- Easy to understand
- Easy to test

---

### Language

- TypeScript (Strict Mode)

Type safety is mandatory.

Avoid:

- any
- unsafe casting
- unnecessary type assertions

Every public function, component, and utility should have clear and explicit types.

---

### Styling

- Tailwind CSS

Tailwind is the primary styling framework.

Design goals include:

- Consistency
- Maintainability
- Responsive layouts
- Utility-first development

Avoid excessive custom CSS unless necessary.

---

### Component Library

- shadcn/ui

shadcn/ui serves as the design system foundation.

Custom components should:

- Follow existing design patterns
- Be reusable
- Support accessibility
- Support dark mode where applicable

---

## Backend

Backend responsibilities include:

- Business logic
- Authentication
- Authorization
- Gmail integration
- AI orchestration
- Database access
- Background processing

Business logic should remain on the server whenever possible.

---

## Database

- PostgreSQL

PostgreSQL is the primary relational database.

Design principles:

- Normalize appropriately
- Use indexes where beneficial
- Maintain referential integrity
- Prefer explicit relationships
- Design for future growth

---

## ORM

- Prisma

Prisma provides:

- Type-safe database access
- Schema management
- Migrations
- Developer productivity

Schema changes should always be introduced through migrations.

---

## Authentication

- Auth.js

Authentication responsibilities include:

- Secure login
- Session management
- OAuth integration
- Authorization

Authentication logic should never be duplicated across the application.

---

## Gmail Integration

MailOrg integrates with Gmail through the official Gmail API.

Capabilities include:

- Email synchronization
- Thread retrieval
- Labels
- Drafts
- Attachments
- Search
- History API
- Push notifications

Google API quotas and security best practices must always be respected.

---

## Artificial Intelligence

Primary AI provider:

- OpenAI

AI powers:

- Summaries
- Search
- Task extraction
- Categorization
- Writing assistance
- Recommendations

AI responses should always be validated before affecting user data.

---

## State Management

Follow a server-first architecture.

Prefer:

- Server Components
- Server Actions
- URL state
- React state

Avoid introducing global state unless clearly justified.

---

## Validation

Use schema validation for:

- Forms
- APIs
- Server Actions
- External requests

Never trust client input.

---

## Error Handling

Applications should fail gracefully.

Errors should:

- Be logged
- Be understandable
- Avoid exposing sensitive information
- Help developers diagnose problems

Unexpected failures should never crash the user experience.

---

## Performance

Performance is a core product feature.

Every feature should consider:

- Bundle size
- Database queries
- API latency
- Rendering efficiency
- Caching opportunities

Optimize based on measurement rather than assumptions.

---

## Security

Security principles include:

- Least privilege
- Secure authentication
- Input validation
- Output encoding
- Secret management
- Encryption
- Auditability

Security should be considered during design, not after implementation.

---

## Deployment

Primary deployment platform:

- Vercel

Deployment goals:

- Reliable
- Automated
- Repeatable
- Observable

Continuous deployment should be supported through version control and automated quality checks.

---

## Dependency Management

Every dependency should be evaluated based on:

- Maintenance status
- Community adoption
- Security
- Bundle impact
- Long-term viability

Avoid adding packages for problems that can be solved with existing platform capabilities.

---

## Coding Standards

Every contribution should be:

- Readable
- Consistent
- Well-typed
- Tested
- Documented where appropriate
- Maintainable

Code is written for humans first and computers second.
# 6. System Architecture Overview

## Architecture Philosophy

MailOrg follows a modern, server-first architecture designed for security, scalability, maintainability, and performance.

The architecture emphasizes:

- Clear separation of responsibilities
- Modular design
- Strong typing
- Secure data flow
- Minimal client-side complexity
- High performance
- Easy maintenance

Every component should have a single, well-defined responsibility.

---

## High-Level Architecture

MailOrg consists of the following major layers:

```
User
    │
    ▼
Next.js Frontend
    │
    ▼
Server Components & Server Actions
    │
    ▼
Business Logic Layer
    │
    ├──────────────┐
    ▼              ▼
Prisma         External APIs
    │          (Gmail, OpenAI)
    ▼              ▼
PostgreSQL    AI & Google Services
```

Each layer communicates through clearly defined interfaces.

---

## Frontend Layer

The frontend is responsible for:

- User interface
- Navigation
- Forms
- User interactions
- Client-side state where necessary
- Rendering server-provided data

The frontend should contain minimal business logic.

Complex processing belongs on the server.

---

## Server Layer

The server acts as the central coordinator.

Responsibilities include:

- Authentication
- Authorization
- Business rules
- Database operations
- Gmail synchronization
- AI orchestration
- Validation
- Logging
- Error handling

The server is the single source of truth for application logic.

---

## Database Layer

PostgreSQL stores all application data that is not permanently stored in Gmail.

Examples include:

- User profiles
- Preferences
- AI metadata
- Tasks
- Labels
- Application settings
- Cached information
- Usage statistics

The database should never duplicate Gmail data unnecessarily.

Instead, it should store references, metadata, and application-specific information.

---

## Gmail Integration

The Gmail API is responsible for:

- Reading messages
- Reading threads
- Labels
- Drafts
- Attachments
- History synchronization
- Push notifications

MailOrg should synchronize efficiently using incremental updates rather than repeatedly downloading the entire mailbox.

---

## AI Layer

The AI layer is responsible for:

- Email summarization
- Task extraction
- Smart categorization
- Semantic search
- Writing assistance
- Priority scoring
- Recommendation generation

AI should enhance user workflows while keeping users in control.

---

## Authentication Layer

Authentication is handled through Auth.js.

Responsibilities include:

- User identity
- OAuth
- Session management
- Permission validation
- Secure access to Gmail

Authorization checks should occur on the server before sensitive operations.

---

## Background Processing

Certain tasks should execute asynchronously.

Examples include:

- Gmail synchronization
- AI processing
- Search indexing
- Notification generation
- Analytics
- Cleanup jobs

Background processing prevents long-running tasks from degrading the user experience.

---

## Caching Strategy

Caching should improve performance while maintaining data consistency.

Examples include:

- Gmail metadata
- Search indexes
- AI responses (when appropriate)
- Frequently accessed settings

Avoid stale data for user-critical workflows.

---

## Error Recovery

The architecture should be resilient.

Failures should:

- Be isolated
- Be logged
- Provide meaningful feedback
- Support retries where appropriate
- Never expose sensitive information

Recovery should be automatic whenever possible.

---

## Scalability

MailOrg should scale horizontally.

The architecture should support:

- Growing user bases
- Increasing email volume
- AI workload expansion
- Additional integrations
- Enterprise customers

Scalability should be considered during design rather than added later.

---

## Observability

Every major system should provide visibility into its behaviour.

Examples include:

- Application logs
- Error reporting
- Performance metrics
- AI latency
- Gmail synchronization health
- Database performance
- API usage

Operational visibility is essential for maintaining a reliable production system.

---

## Architectural Principles

Every architectural decision should support one or more of the following principles:

- Simplicity
- Modularity
- Reliability
- Security
- Scalability
- Performance
- Maintainability
- Testability
- Developer productivity

If a proposed solution significantly compromises these principles, it should be reconsidered.