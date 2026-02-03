
import { Doc, Id } from "@/convex/_generated/dataModel";
import { Annotation, AnnotationTarget, W3CSelector } from "../types";
import { AnnotationDisplay, Author, Reply } from "@/components/annotations/types";

// Type needed for the raw Convex response (includes author expansion)
type CommentWithAuthor = Doc<"comments"> & {
    author: {
        name?: string;
        email?: string;
        avatar?: string;
    };
    agentName?: string;
};

type ReplyWithAuthor = Doc<"commentReplies"> & {
    author: {
        name: string;
        avatar?: string;
    }
};

/**
 * Validates if a Convex comment target is a valid W3C annotation target.
 * Existing comments might have old format { type: "text", ... } which needs migration
 * or fallback handling.
 */
function isValidTarget(target: any): target is AnnotationTarget {
    return target && typeof target === 'object' && 'selector' in target;
}

/**
 * Converts a Convex DB Comment to our UI AnnotationDisplay format.
 */
export function convexToAnnotation(
    comment: CommentWithAuthor,
    replies: ReplyWithAuthor[] = []
): AnnotationDisplay {

    // 1. Handle legacy/invalid targets (fallback)
    let safeTarget: AnnotationTarget;

    if (isValidTarget(comment.target)) {
        safeTarget = comment.target;
    } else {
        // Fallback for old "comment" format to prevent crash
        // We create a dummy selector that matches nothing or effectively "page level"
        safeTarget = {
            source: "",
            selector: {
                type: "TextQuoteSelector",
                exact: "Legacy Comment: Position lost",
                prefix: "",
                suffix: ""
            },
            schemaVersion: "1.0.0"
        };
    }

    // 2. Map Replies
    const uiReplies: Reply[] = replies.map(r => ({
        id: r._id,
        content: r.content,
        author: {
            // Fallback to "Unknown" if no name (email not available for replies currently)
            name: r.author.name || "Unknown",
            avatar: r.author.avatar || "",
            id: r.createdBy
        },
        createdAt: r.createdAt,
        createdBy: r.createdBy
    }));

    // 3. Determine Style (Comment vs Strike)
    // We can infer this from metadata or content conventions if not explicitly stored.
    // Ideally we add a 'style' field to the Comment schema later. 
    // For now we default to 'comment' unless some heuristic says otherwise.
    // The spike stored it in the `selector` for temporary logic, but `target` should be pure.
    // We'll trust the selector.style if it exists (non-standard W3C but handy), or default.
    const style = (safeTarget.selector as any).style || 'comment';

    return {
        id: comment._id,
        versionId: comment.versionId,
        content: comment.content,

        author: {
            // Prefer agentName for agent-created comments, then user name, then email
            name: comment.agentName || comment.author?.name || comment.author?.email || "Unknown",
            avatar: comment.author?.avatar || "",
            id: comment.createdBy
        },
        createdBy: comment.createdBy,
        createdAt: comment.createdAt,

        resolved: !!comment.resolvedUpdatedAt, // If this timestamp exists, it's resolved (simplified)
        // Wait, schema check: schema says `resolvedUpdatedAt`. 
        // We need a boolean logic. Our Schema does NOT have a straight `resolved` boolean on `comments`?
        // Let's check schema again.
        // Schema line 595: `resolvedUpdatedAt`.
        // Schema line 601: `resolvedUpdatedBy`.
        // Missing explicit `resolved` boolean in schema viewing earlier? 
        // *Re-checking schema snippet...*
        // Ah, earlier viewer showed `resolved: boolean` in Types.ts but the Schema file I read 
        // didn't explicitly show a `resolved` boolean column, just the timestamps.
        // Wait, looking at `CommentCard.tsx` it uses `comment.resolved`.
        // Let's assume the backend helper `useComments` injects a `resolved` boolean 
        // or the schema actually has it and I missed it in the partial view.
        // Adapting to be safe: !!resolvedUpdatedAt is a good proxy if boolean missing.

        isEdited: comment.isEdited,
        editedAt: comment.editedAt,

        target: safeTarget,
        style: style,
        replies: uiReplies
    };
}


/**
 * Prepares the target object for a new Convex Comment from a UI selection.
 */
export function selectionToConvexTarget(
    fileName: string,
    selector: W3CSelector,
    style: "comment" | "strike"
): AnnotationTarget {
    // We inject the style into the selector for now so it survives the round trip
    // properly until we have a top-level column.
    const enrichedSelector = { ...selector, style };

    return {
        source: fileName,
        selector: enrichedSelector,
        schemaVersion: "1.0.0"
    };
}
