# Artifact Review - Local Development Setup

This is the Next.js application for Artifact Review with Convex backend.

## Prerequisites

- Node.js 20+
- A Convex account (sign up at https://convex.dev)

## First-Time Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Convex

You need to authenticate with Convex and create a project:

```bash
npx convex login
```

This will open a browser window for authentication. Once logged in, initialize your Convex project:

```bash
npx convex dev
```

This command will:
- Create a new Convex project (or link to an existing one)
- Generate a `.env.local` file with your `NEXT_PUBLIC_CONVEX_URL`
- Push the schema to Convex
- Start watching for changes

Keep this terminal running - it's your Convex dev server.

### 3. Run Next.js Dev Server

In a **new terminal**:

```bash
npm run dev
```

### 4. Open the App

Visit http://localhost:3000

You should see:
- A landing page with "Start Using Artifact Review" button
- Click it to create an anonymous session
- Your dashboard showing your anonymous user ID

## What You Should See

### Landing Page (Not Signed In)
- Simple card with "Artifact Review" title
- "Start Using Artifact Review" button

### Dashboard (Signed In)
- User ID displayed
- Status: "Anonymous Session"
- Session persists across page refreshes
- "Sign Out" button to create a new session

## Testing the Implementation

### Run Tests

```bash
npm run test
```

This runs the Vitest test suite which includes:
- Convex function tests for `getCurrentUser`
- Tests for anonymous authentication flow

### Success Criteria Checklist

- [ ] Anonymous auth works at http://localhost:3000
- [ ] No Convex connection errors in browser console
- [ ] Session persists across page refreshes
- [ ] Sign out creates new anonymous session (new user ID)
- [ ] All tests pass

## Troubleshooting

### "Cannot connect to Convex"
- Make sure `npx convex dev` is running in a separate terminal
- Check that `.env.local` exists and has `NEXT_PUBLIC_CONVEX_URL`

### "No session created"
- Open browser console and check for errors
- Verify `ConvexAuthProvider` is wrapping the app in `layout.tsx`

### Tests failing
- Run `npx convex dev` first to generate types
- Make sure all dependencies are installed

## Project Structure

```
app/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout with ConvexClientProvider
│   │   ├── page.tsx            # Landing page + Dashboard
│   │   └── globals.css         # Global styles
│   └── components/
│       ├── ui/                  # ShadCN components (button, card)
│       └── ConvexClientProvider.tsx
├── convex/
│   ├── schema.ts               # Database schema with auth tables
│   ├── auth.ts                 # Convex Auth configuration
│   ├── http.ts                 # HTTP routes for auth
│   ├── users.ts                # User queries
│   └── __tests__/
│       └── users.test.ts       # User function tests
└── README.md                   # This file
```

## Next Steps

Once Step 1 (Anonymous Auth) is working:
- Step 2: Add Magic Link authentication
- Step 3: Deploy to Vercel (hosted dev)
- Step 4: Set up staging environment

See `/tasks/00006-local-dev-environment/README.md` for full task details.
