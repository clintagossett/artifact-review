---
description: Promote current code to Hosted Dev environment
---

1. Run local lint and build to ensure code quality.
   // turbo
   ```bash
   cd app && npm run lint && npm run build
   ```

2. Verify Convex backend configuration (Dry Run deployment to ensure validity).
   // turbo
   ```bash
   cd app && npx convex dev --run "echo 'Convex configuration valid'" --once
   ```

3. Commit and push to `dev` branch.
   > [!IMPORTANT]
   > Ensure you are on the `dev` branch or are ready to merge into it.

   ```bash
   # Check current branch
   git branch --show-current
   ```
   
   If on `dev`:
   ```bash
   git add .
   git commit -m "chore: promote to hosted dev"
   git push origin dev
   ```
   
   If on a feature branch (merge to dev):
   ```bash
   git checkout dev
   git merge -
   git push origin dev
   ```
