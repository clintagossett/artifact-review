---
description: how to check status and logs for Local and Hosted Convex environments
---

# Project Environments

| Environment | Deployment Name | Frontend URL |
| :--- | :--- | :--- |
| **Local Dev** | `mild-ptarmigan-109` | [http://localhost:3000](http://localhost:3000) |
| **Hosted Dev** | `beaming-oriole-310` | [https://artifactreview-early.xyz](https://artifactreview-early.xyz) |

# Check Local Development Server

The local server is the default target for the CLI in this workspace.

1. View real-time logs:
```bash
npx convex logs
```

2. Check environment variables:
```bash
npx convex env list
```

3. View stored data:
```bash
npx convex data
```

# Check Hosted Development Server (Vercel)

Target the hosted environment by overriding the `CONVEX_DEPLOYMENT` environment variable.

1. View real-time logs for Hosted Dev:
```bash
CONVEX_DEPLOYMENT=beaming-oriole-310 npx convex logs
```

2. Check environment variables (e.g. to verify API Keys):
```bash
CONVEX_DEPLOYMENT=beaming-oriole-310 npx convex env list
```

3. View stored data on Hosted Dev:
```bash
CONVEX_DEPLOYMENT=beaming-oriole-310 npx convex data
```
