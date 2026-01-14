# Dev Setup Workflow

This workflow uses the project's helper script to manage the entire local development environment, including Docker, Next.js, Convex, and the Stripe CLI tunnel.

// turbo
1. **Start the environment**:
   ```bash
   ./scripts/start-dev-servers.sh
   ```
   *   **Docker**: If Docker Desktop isn't running, the script will attempt to `open` it and wait for initialization.
   *   **Stripe**: It starts a `stripe listen` tunnel and forwards webhooks to your local Convex backend.

2. **Sync Stripe Webhook Secret (First Time / New Tunnel)**:
   If this is a new setup or your tunnel secret has changed:
   - Check the logs: `cat app/logs/stripe.log`
   - Look for the line: `Your webhook signing secret is whsec_...`
   - Set it in Convex:
     ```bash
     cd app && npx convex env set STRIPE_WEBHOOK_SECRET whsec_...
     ```

3. **Monitor Status**:
   - Next.js: `tail -f app/logs/nextjs.log`
   - Convex: `tail -f app/logs/convex.log`
   - Stripe: `tail -f app/logs/stripe.log`

4. **Restart Servers**: (Kill existing and start fresh)
   ```bash
   ./scripts/start-dev-servers.sh --restart
   ```
