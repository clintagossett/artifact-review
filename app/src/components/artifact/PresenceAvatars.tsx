import React from "react";
import { AvatarGroup } from "@/components/ui/avatar-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Id } from "@@/convex/_generated/dataModel";

interface PresenceAvatarsProps {
    activeUsers: Array<{
        userId: Id<"users">;
        versionId: Id<"artifactVersions">;
        name: string;
        lastSeenAt: number;
    }>;
    currentVersionId: Id<"artifactVersions">;
}

/**
 * Renders a face pile of active users.
 * Users on a different version are visually distinguished in the tooltip.
 */
export function PresenceAvatars({ activeUsers, currentVersionId }: PresenceAvatarsProps) {
    if (!activeUsers || activeUsers.length === 0) return null;

    return (
        <TooltipProvider>
            <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-medium animate-pulse">
                    LIVE
                </span>
                <div className="flex -space-x-2">
                    {activeUsers.map((user) => (
                        <Tooltip key={user.userId}>
                            <TooltipTrigger asChild>
                                <div className="relative">
                                    <AvatarGroup
                                        users={[{ name: user.name }]}
                                        size="sm"
                                        max={1}
                                    />
                                    {user.versionId !== currentVersionId && (
                                        <div
                                            className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-amber-500 border-2 border-white rounded-full"
                                            title="On different version"
                                        />
                                    )}
                                </div>
                            </TooltipTrigger>
                            <TooltipContent>
                                <div className="text-xs">
                                    <p className="font-semibold">{user.name}</p>
                                    <p className="text-muted-foreground">
                                        {user.versionId === currentVersionId ? "Viewing this version" : "Viewing another version"}
                                    </p>
                                </div>
                            </TooltipContent>
                        </Tooltip>
                    ))}
                </div>
            </div>
        </TooltipProvider>
    );
}
