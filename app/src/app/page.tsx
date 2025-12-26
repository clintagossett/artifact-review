"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery, Authenticated, Unauthenticated } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Home() {
  const { signIn, signOut } = useAuthActions();
  const currentUser = useQuery(api.auth.getCurrentUser);
  const authTest = useQuery(api.simpleAuth.test);

  console.log('[DEBUG] Current user:', currentUser);
  console.log('[DEBUG] Auth test:', authTest);

  const handleAnonymousSignIn = async () => {
    console.log('[DEBUG] Starting anonymous sign-in');
    await signIn("anonymous");
  };

  const handleSignOut = async () => {
    await signOut();
  };

  // Loading state
  if (currentUser === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-background to-muted">
      <Unauthenticated>
        <Card className="w-[400px]">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl">Artifact Review</CardTitle>
            <CardDescription>
              Collaborative review for AI-generated artifacts
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground text-center">
              Start reviewing and sharing HTML artifacts instantly - no signup
              required.
            </p>
            <Button onClick={handleAnonymousSignIn} size="lg">
              Start Using Artifact Review
            </Button>
          </CardContent>
        </Card>
      </Unauthenticated>

      <Authenticated>
        <Card className="w-[500px]">
          <CardHeader>
            <CardTitle>Welcome to Artifact Review</CardTitle>
            <CardDescription>
              {currentUser?.email ? `Signed in as ${currentUser.email}` : "Anonymous session"}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="font-medium">User ID:</span>
                <span className="text-sm text-muted-foreground font-mono">
                  {currentUser?._id}
                </span>
              </div>
              {currentUser?.email && (
                <div className="flex justify-between">
                  <span className="font-medium">Email:</span>
                  <span className="text-sm text-muted-foreground">
                    {currentUser.email}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Your session persists across page refreshes. Try refreshing the
                page to see your session maintained!
              </p>
            </div>

            <Button onClick={handleSignOut} variant="outline">
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </Authenticated>
    </div>
  );
}
