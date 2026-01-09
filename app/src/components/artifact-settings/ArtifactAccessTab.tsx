"use client";

import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Mail,
  X,
  Clock,
  CheckCircle,
  Send,
  Users,
} from 'lucide-react';
import { Id } from '../../../../convex/_generated/dataModel';
import { logger, LOG_TOPICS } from '@/lib/logger';

interface ArtifactAccessTabProps {
  artifactId: Id<"artifacts">;
}

export function ArtifactAccessTab({ artifactId }: ArtifactAccessTabProps) {
  const [inviteEmail, setInviteEmail] = useState('');
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [selectedAccessId, setSelectedAccessId] = useState<Id<"artifactAccess"> | null>(null);

  // Queries
  const reviewers = useQuery(api.access.listReviewers, { artifactId });

  // Mutations
  const grant = useMutation(api.access.grant);
  const resend = useMutation(api.access.resend);
  const revoke = useMutation(api.access.revoke);

  const handleSendInvite = async () => {
    if (!inviteEmail.trim()) {
      toast({
        title: 'Email required',
        description: 'Please enter an email address.',
        variant: 'destructive',
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail)) {
      toast({
        title: 'Invalid email',
        description: 'Please enter a valid email address.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await grant({ artifactId, email: inviteEmail.trim() });

      toast({
        title: 'Invitation sent',
        description: `An invitation has been sent to ${inviteEmail}.`,
      });

      logger.info(LOG_TOPICS.Artifact, 'ArtifactAccessTab', 'Reviewer invited', {
        artifactId,
        email: inviteEmail,
      });

      setInviteEmail('');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error(
        LOG_TOPICS.Artifact,
        'ArtifactAccessTab',
        'Failed to invite reviewer',
        { error: errorMessage, artifactId, email: inviteEmail }
      );

      // Parse error for user-friendly message
      let title = 'Failed to invite';
      let description = 'Could not send invitation. Please try again.';

      if (errorMessage.includes('already has access')) {
        title = 'Already invited';
        description = 'This user already has access to this artifact.';
      } else if (errorMessage.includes('already been invited')) {
        title = 'Already invited';
        description = 'This email has already been invited to this artifact.';
      }

      toast({
        title,
        description,
        variant: 'destructive',
      });
    }
  };

  const handleResendInvite = async (accessId: Id<"artifactAccess">, email: string) => {
    try {
      await resend({ accessId });

      toast({
        title: 'Invitation resent',
        description: `Invitation resent to ${email}.`,
      });

      logger.info(LOG_TOPICS.Artifact, 'ArtifactAccessTab', 'Invitation resent', {
        artifactId,
        accessId,
        email,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error(
        LOG_TOPICS.Artifact,
        'ArtifactAccessTab',
        'Failed to resend invitation',
        { error: errorMessage, artifactId, accessId, email }
      );

      toast({
        title: 'Failed to resend',
        description: 'Could not resend invitation. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleRevokeInvite = async () => {
    if (!selectedAccessId) return;

    try {
      await revoke({ accessId: selectedAccessId });

      toast({
        title: 'Access revoked',
        description: 'The invitation has been revoked.',
      });

      logger.info(LOG_TOPICS.Artifact, 'ArtifactAccessTab', 'Access revoked', {
        artifactId,
        accessId: selectedAccessId,
      });

      setRevokeDialogOpen(false);
      setSelectedAccessId(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error(
        LOG_TOPICS.Artifact,
        'ArtifactAccessTab',
        'Failed to revoke access',
        { error: errorMessage, artifactId, accessId: selectedAccessId }
      );

      toast({
        title: 'Failed to revoke',
        description: 'Could not revoke access. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const openRevokeDialog = (accessId: Id<"artifactAccess">) => {
    setSelectedAccessId(accessId);
    setRevokeDialogOpen(true);
  };

  // Loading state
  if (reviewers === undefined) {
    return (
      <div className="max-w-6xl space-y-8">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-12 w-full mb-4" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  const acceptedReviewers = reviewers.filter(r => r.status === 'added' || r.status === 'viewed');
  const pendingInvitations = reviewers.filter(r => r.status === 'pending');

  return (
    <div className="max-w-6xl space-y-8">
      {/* People with Access */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-900">People with Access ({reviewers.length})</h3>
              <p className="text-sm text-gray-600 mt-1">Manage reviewers and their access level</p>
            </div>
          </div>

          {/* Invite Form */}
          <div>
            <label className="block font-medium text-gray-900 mb-2">Invite by email</label>
            <p className="text-sm text-gray-600 mb-3">Send an email invitation with direct access to this artifact</p>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="email"
                  placeholder="name@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendInvite()}
                  className="pl-10"
                />
              </div>
              <Button onClick={handleSendInvite} className="bg-blue-600 hover:bg-blue-700">
                <Send className="w-4 h-4 mr-2" />
                Send Invite
              </Button>
            </div>
          </div>
        </div>

        {/* Active Team Members */}
        {acceptedReviewers.length > 0 && (
          <>
            <div className="px-6 pt-6 pb-3">
              <h4 className="font-medium text-gray-900">Team Members ({acceptedReviewers.length})</h4>
            </div>
            <div className="divide-y divide-gray-200">
              {acceptedReviewers.map((reviewer) => {
                const initials = reviewer.displayName
                  .split(' ')
                  .map(n => n[0])
                  .join('')
                  .substring(0, 2)
                  .toUpperCase();

                return (
                  <div
                    key={reviewer.accessId}
                    className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className="bg-gradient-to-br from-purple-400 to-blue-500 text-white">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">{reviewer.displayName}</p>
                          <Badge
                            variant="outline"
                            className={reviewer.status === 'viewed' ? "bg-green-50 text-green-700 border-green-200" : "bg-blue-50 text-blue-700 border-blue-200"}
                          >
                            {reviewer.status === 'viewed' ? (
                              <>
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Viewed
                              </>
                            ) : (
                              <>
                                <Clock className="w-3 h-3 mr-1" />
                                Added
                              </>
                            )}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">{reviewer.email}</p>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                          <span>Invited {new Date(reviewer.lastSentAt).toLocaleDateString()}</span>
                          {reviewer.sendCount > 1 && (
                            <span className="text-gray-500">• Resent {reviewer.sendCount - 1}x</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openRevokeDialog(reviewer.accessId)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Pending Invitations */}
        {pendingInvitations.length > 0 && (
          <>
            <div className="px-6 pt-6 pb-3 border-t border-gray-200">
              <h4 className="font-medium text-gray-900">Pending Invitations ({pendingInvitations.length})</h4>
              <p className="text-sm text-gray-600 mt-1">These people haven't accepted their invitation yet</p>
            </div>
            <div className="divide-y divide-gray-200">
              {pendingInvitations.map((reviewer) => {
                const initials = reviewer.displayName
                  .split(' ')
                  .map(n => n[0])
                  .join('')
                  .substring(0, 2)
                  .toUpperCase();

                return (
                  <div
                    key={reviewer.accessId}
                    className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className="bg-gradient-to-br from-gray-300 to-gray-400 text-white">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">{reviewer.displayName}</p>
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                            <Clock className="w-3 h-3 mr-1" />
                            Invited
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">{reviewer.email}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          Sent {new Date(reviewer.lastSentAt).toLocaleDateString()}
                          {reviewer.sendCount > 1 && ` • Resent ${reviewer.sendCount - 1}x`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResendInvite(reviewer.accessId, reviewer.email)}
                      >
                        <Send className="w-3 h-3 mr-1" />
                        Resend
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openRevokeDialog(reviewer.accessId)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        Revoke
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Empty State */}
        {reviewers.length === 0 && (
          <div className="p-8 text-center">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">No reviewers yet</p>
            <p className="text-sm text-gray-500 mt-1">Invite people using the form above to collaborate on this artifact</p>
          </div>
        )}
      </div>

      {/* Revoke Confirmation Dialog */}
      <AlertDialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke access?</AlertDialogTitle>
            <AlertDialogDescription>
              This person will no longer be able to view or comment on this artifact. You can re-invite them later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedAccessId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevokeInvite}
              className="bg-red-600 hover:bg-red-700"
            >
              Revoke Access
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
