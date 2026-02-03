import { useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

/**
 * Hook to record an artifact view exactly once when a version is loaded.
 */
export function useViewTracker(
    artifactId: Id<"artifacts">,
    versionId: Id<"artifactVersions">,
    isLoaded: boolean
) {
    const recordView = useMutation(api.views.record);
    const trackedRef = useRef<string | null>(null);

    useEffect(() => {
        const trackKey = `${artifactId}:${versionId}`;

        // Only record if loaded and we haven't tracked this specific version in this component mount
        if (isLoaded && trackedRef.current !== trackKey) {
            recordView({ artifactId, versionId }).catch(console.error);
            trackedRef.current = trackKey;
        }
    }, [artifactId, versionId, isLoaded, recordView]);
}
