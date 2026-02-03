import { useEffect, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { TRACKING_CONFIG } from "../../convex/shared";

/**
 * Hook to manage real-time presence for an artifact version.
 * - Subscribes to the list of active users.
 * - Automatically sends heartbeats while the component is mounted.
 */
export function usePresence(
    artifactId: Id<"artifacts">,
    versionId: Id<"artifactVersions">
) {
    const updatePresence = useMutation(api.presence.update);
    const activeUsers = useQuery(api.presence.list, { artifactId });

    // Use a ref to track the latest IDs for the interval closure
    const idsRef = useRef({ artifactId, versionId });
    useEffect(() => {
        idsRef.current = { artifactId, versionId };
    }, [artifactId, versionId]);

    useEffect(() => {
        // 1. Initial heartbeat
        updatePresence({
            artifactId: idsRef.current.artifactId,
            versionId: idsRef.current.versionId
        }).catch(console.error);

        // 2. Setup interval
        const interval = setInterval(() => {
            updatePresence({
                artifactId: idsRef.current.artifactId,
                versionId: idsRef.current.versionId
            }).catch(console.error);
        }, TRACKING_CONFIG.PRESENCE_HEARTBEAT_MS);

        return () => clearInterval(interval);
    }, [updatePresence]); // Only re-run if mutation changes (stable)

    return activeUsers ?? [];
}
