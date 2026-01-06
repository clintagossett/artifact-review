import { describe, it, expect } from "vitest";
import { deriveReviewerStatus } from "../../../../../app/src/lib/access";
import type { Doc } from "../../../../../app/convex/_generated/dataModel";

describe("deriveReviewerStatus", () => {
  it("should return 'removed' if access is deleted", () => {
    const access: Partial<Doc<"artifactAccess">> = {
      isDeleted: true,
      userId: "user123" as any,
      firstViewedAt: undefined,
    };

    const status = deriveReviewerStatus(access as Doc<"artifactAccess">);
    expect(status).toBe("removed");
  });

  it("should return 'pending' if no userId (userInviteId only)", () => {
    const access: Partial<Doc<"artifactAccess">> = {
      isDeleted: false,
      userId: undefined,
      userInviteId: "invite123" as any,
      firstViewedAt: undefined,
    };

    const status = deriveReviewerStatus(access as Doc<"artifactAccess">);
    expect(status).toBe("pending");
  });

  it("should return 'viewed' if userId and firstViewedAt exist", () => {
    const access: Partial<Doc<"artifactAccess">> = {
      isDeleted: false,
      userId: "user123" as any,
      firstViewedAt: 1234567890,
    };

    const status = deriveReviewerStatus(access as Doc<"artifactAccess">);
    expect(status).toBe("viewed");
  });

  it("should return 'added' if userId exists but no firstViewedAt", () => {
    const access: Partial<Doc<"artifactAccess">> = {
      isDeleted: false,
      userId: "user123" as any,
      firstViewedAt: undefined,
    };

    const status = deriveReviewerStatus(access as Doc<"artifactAccess">);
    expect(status).toBe("added");
  });
});
