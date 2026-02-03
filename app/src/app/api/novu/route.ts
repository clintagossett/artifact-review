
import { serve } from "@novu/framework/next";
import { commentWorkflow } from "./workflows/comment-workflow";

// The "bridge" endpoint that allows Novu Cloud to discover and execute your workflows
export const { GET, POST, OPTIONS } = serve({
  workflows: [
    commentWorkflow,
  ],
});
