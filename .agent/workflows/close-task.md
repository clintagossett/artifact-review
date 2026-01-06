---
description: how to formally close and archive a task
---

When a task is finished or reached a logical stopping point, follow these steps to close and archive it:

1. **Update Task README**:
   - Update `Current Status` to `COMPLETED` or `CLOSED`.
   - Document the final state of the implementation.
   - **Descope** all remaining pending subtasks (move them to a "Descoped/Future" section or mark as won't do for this task).

2. **Update GitHub Issue**:
   - Add a comment to the GitHub issue summarizing what was completed and explicitly listing any descoped or deferred work.
   - Use `gh issue comment [ISSUE_NUMBER] --body "Summary of work..."`.

3. **Staging Commit**:
   - Commit the updated README and any final documentation.
   - `git add tasks/XXXXX-...`
   - `git commit -m "docs(task): update final state and descope remaining items for task XXXXX"`

4. **Close GitHub Issue**:
   - `gh issue close [ISSUE_NUMBER]`

5. **Archive Task Folder**:
   - Move the task directory to `tasks-archive/`.
   - `mv tasks/XXXXX-task-name tasks-archive/`

6. **Final Commit**:
   - Commit the deletion from `tasks/` and addition to `tasks-archive/`.
   - `git add tasks/ tasks-archive/`
   - `git commit -m "chore: archive task XXXXX to tasks-archive"`
