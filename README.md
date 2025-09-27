# Flashcards

AI-powered spaced repetition flashcard app with FSRS V6 (Default)

## Tech Stack

- [Next.js](https://nextjs.org)
- [BetterAuth](https://www.better-auth.com/)
- [Drizzle](https://orm.drizzle.team)
- [Tailwind CSS](https://tailwindcss.com)
- [tRPC](https://trpc.io)

# Features

- AI-powered spaced repetition flashcard app with FSRS V6 (Default)
- LLM-powered card generation

# Roadmap

- [ ] Better UX
- [ ] Rest of TurboAI's features
- [ ] Recording to notes
- [ ] Deck organization
- [ ] Deck sharing

# Shit to do

2. Inconsistent Authentication Flow
Issue: Some pages handle auth checks in the page component (e.g., 
ai-flashcards/page.tsx
), while others rely on middleware
Impact: Inconsistent user experience and potential security gaps
Solution: Standardize on middleware-based authentication for all protected routes
3. Missing Error Boundaries
Issue: No error boundaries around async operations in page components
Impact: Poor error handling and potential for broken UI states
Solution: Add error boundaries around page components
4. Inefficient Data Loading
Issue: Data fetching patterns vary across pages (some use server components, others client-side)
Impact: Inconsistent performance and loading states
Solution: Standardize on server components with loading states
5. Navigation Structure Issues
Issue: The main navigation shows "Study" but there's also a "Review" concept
Impact: Confusion about the difference between "Study" and "Review"
Solution: Consolidate terminology and navigation items
6. Missing Loading States
Issue: Some pages lack proper loading skeletons/placeholders
Impact: Poor perceived performance
Solution: Add consistent loading states across all data-fetching components
7. Inconsistent Page Layouts
Issue: Different container styles and padding across pages
Impact: Visual inconsistency
Solution: Create a consistent page layout component
8. Missing 404 Handling
Issue: No custom 404 page for non-existent routes
Impact: Poor user experience for mistyped URLs
Solution: Add a custom 404 page
9. Inefficient Hydration
Issue: Client components are wrapped in HydrateClient at the page level
Impact: Unnecessary client-side JavaScript
Solution: Move HydrateClient to wrap only the components that need it
10. Incomplete Error States
Issue: Some pages don't handle error states (e.g., failed API calls)
Impact: Poor error recovery
Solution: Add proper error boundaries and fallback UIs
11. Inconsistent Form Handling
Issue: Different form patterns across the app
Impact: Inconsistent user experience
Solution: Create reusable form components
12. Missing Breadcrumbs
Issue: No breadcrumb navigation
Impact: Poor navigation in deep routes
Solution: Add a breadcrumb component
13. Inefficient Asset Loading
Issue: Icons and other assets loaded on every page
Impact: Unnecessary bundle size
Solution: Implement proper code splitting
14. Missing Focus Management
Issue: No focus management during page transitions
Impact: Poor keyboard navigation
Solution: Add focus management for accessibility
15. Inconsistent API Error Handling
Issue: Different error handling patterns across API calls
Impact: Inconsistent error reporting
Solution: Standardize API error handling

