---
description: Create a new task with a GitHub issue and structured folder
---

1. Ask the user for the "Task Title" and "Task Description".

2. Create a GitHub issue for the task.
   ```bash
   gh issue create --title "$TASK_TITLE" --body "$TASK_DESCRIPTION"
   ```

3. Determine the next task number and create the task folder.
   ```bash
   # Get the highest task number
   LAST_TASK=$(ls tasks | grep -E '^[0-9]{5}-' | sort | tail -n 1 | cut -d'-' -f1)
   if [ -z "$LAST_TASK" ]; then
     NEXT_TASK="00001"
   else
     NEXT_TASK=$(printf "%05d" $((10#$LAST_TASK + 1)))
   fi

   # Create kebab-case slug from title
   TASK_SLUG=$(echo "$TASK_TITLE" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/-\+/-/g' | sed 's/^-//' | sed 's/-$//')
   
   FOLDER_NAME="${NEXT_TASK}-${TASK_SLUG}"
   FULL_PATH="tasks/${FOLDER_NAME}"
   
   mkdir -p "$FULL_PATH"
   echo "Created task folder: $FULL_PATH"
   ```

4. Create the Task README.md.
   ```bash
   # Use the issue number from step 2 if available, otherwise ask user or leave placeholder
   # Assuming gh command output the URL, we can extract the number or just use 'TBD' if not parsed easily.
   # For this workflow, we'll place the basic structure.
   
   cat > "$FULL_PATH/README.md" <<EOF
   # Task $NEXT_TASK: $TASK_TITLE

   **GitHub Issue:** #(Insert Issue Number Here)
   **Related Project:**

   ---

   ## Resume (Start Here)

   **Last Updated:** $(date +%Y-%m-%d)

   ### Current Status: 📝 PLANNED

   **Phase:** Initial setup

   ### Next Steps

   1. **Analyze requirements**
   2. **Create implementation plan**

   ---

   ## Objective

   $TASK_DESCRIPTION

   ---

   ## Hierarchy: Subtasks and Steps

   ### Structure

   \`\`\`
   $FULL_PATH/
   ├── README.md
   ├── tests/
   ├── output/
   \`\`\`

   ---

   ## Changes Made

   - (Track changes here)

   ## Output

   - (List artifacts)
   EOF
   ```

5. Open the new README.md for the user to review.
