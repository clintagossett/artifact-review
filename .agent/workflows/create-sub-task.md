---
description: Create a new sub-task folder within an existing task
---

1. Ask the user for the "Parent Task Number" (e.g., 00042) and "Subtask Title".

2. Locate the parent task folder.
   ```bash
   PARENT_TASK_FOLDER=$(ls tasks | grep "^$PARENT_TASK_NUMBER-")
   
   if [ -z "$PARENT_TASK_FOLDER" ]; then
     echo "Error: Parent task $PARENT_TASK_NUMBER not found."
     exit 1
   fi
   
   echo "Found parent task: tasks/$PARENT_TASK_FOLDER"
   ```

3. Determine the next subtask number.
   ```bash
   PARENT_PATH="tasks/$PARENT_TASK_FOLDER"
   
   # Find highest subtask number (XX-subtask-*)
   LAST_SUBTASK=$(ls "$PARENT_PATH" | grep -E '^[0-9]{2}-subtask-' | sort | tail -n 1 | cut -d'-' -f1)
   
   if [ -z "$LAST_SUBTASK" ]; then
     NEXT_SUBTASK="01"
   else
     NEXT_SUBTASK=$(printf "%02d" $((10#$LAST_SUBTASK + 1)))
   fi
   ```

4. Create the subtask folder.
   ```bash
   # Create kebab-case slug from title
   SUBTASK_SLUG=$(echo "$SUBTASK_TITLE" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/-\+/-/g' | sed 's/^-//' | sed 's/-$//')
   
   SUBTASK_FOLDER_NAME="${NEXT_SUBTASK}-subtask-${SUBTASK_SLUG}"
   FULL_SUBTASK_PATH="$PARENT_PATH/$SUBTASK_FOLDER_NAME"
   
   mkdir -p "$FULL_SUBTASK_PATH"
   echo "Created subtask folder: $FULL_SUBTASK_PATH"
   ```

5. Create the Subtask README.md.
   ```bash
   cat > "$FULL_SUBTASK_PATH/README.md" <<EOF
   # Subtask $NEXT_SUBTASK: $SUBTASK_TITLE

   **Parent Task:** $PARENT_TASK_FOLDER
   **Status:** OPEN
   **Created:** $(date +%Y-%m-%d)

   ---

   ## Objective

   (Describe what this subtask accomplishes)

   ---

   ## Steps

   | Step | Description | Status |
   |------|-------------|--------|
   | 01-step-name | Description | OPEN |

   ---

   ## Files

   | File | Description |
   |------|-------------|
   | \`README.md\` | This file |
   | \`output/\` | Deliverables |

   ---

   ## Requirements

   (Detailed requirements)
   EOF
   ```

6. Open the new README.md for the user to review.
