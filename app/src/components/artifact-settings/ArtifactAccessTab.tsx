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
  MessageSquare,
  Mail,
  X,
  Clock,
  CheckCircle,
  Send,
  Eye,
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
  const activityStats = useQuery(api.access.getActivityStats, { artifactId });
  const versions = useQuery(api.artifacts.getVersions, { artifactId });
  const allStats = useQuery(api.views.listAllStats, { artifactId });

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
  if (reviewers === undefined || activityStats === undefined) {
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

  const acceptedReviewers = reviewers.filter(r => r.status === 'accepted');
  const pendingInvitations = reviewers.filter(r => r.status === 'pending');

  return (
    <div className="max-w-6xl space-y-8">
      {/* Activity Overview */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Activity Overview</h3>
          <p className="text-sm text-gray-600 mt-1">Track engagement and collaboration on this artifact</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Views Card */}
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border border-blue-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <Eye className="w-5 h-5 text-blue-600" />
                <span className="text-xs text-gray-600 uppercase font-semibold">Views</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{activityStats.totalViews}</p>
              <p className="text-sm text-gray-600 mt-1">{activityStats.uniqueViewers} unique viewers</p>
            </div>

            {/* Comments Card */}
            <div className="bg-gradient-to-br from-green-50 to-teal-50 rounded-lg border border-green-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <MessageSquare className="w-5 h-5 text-green-600" />
                <span className="text-xs text-gray-600 uppercase font-semibold">Comments</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{activityStats.totalComments}</p>
              <p className="text-sm text-gray-600 mt-1">Total feedback</p>
            </div>

            {/* People Card */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg border border-amber-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <Users className="w-5 h-5 text-amber-600" />
                <span className="text-xs text-gray-600 uppercase font-semibold">People</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{reviewers.length}</p>
              <p className="text-sm text-gray-600 mt-1">{acceptedReviewers.length} active, {pendingInvitations.length} pending</p>
            </div>
          </div>

          {/* Last Activity */}
          {activityStats.lastViewed && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Last viewed: <span className="font-medium text-gray-900">{new Date(activityStats.lastViewed.timestamp).toLocaleString()}</span> by <span className="font-medium text-gray-900">{activityStats.lastViewed.userName}</span>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Version Activity Matrix (Requirement 2, 3, 4) */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200 bg-gray-50/50">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Version Visibility</h3>
          </div>
          <p className="text-sm text-gray-600 mt-1">Track which reviewers have engaged with specific versions of this artifact.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 font-semibold text-gray-900 sticky left-0 bg-gray-50 z-10 w-64 border-r border-gray-200">Reviewer</th>
                {versions?.map((v) => (
                  <th key={v._id} className="px-6 py-4 font-semibold text-gray-900 text-center border-r border-gray-200 min-w-[120px]">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-xs text-gray-500 font-normal uppercase tracking-wider">Version</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-lg">v{v.number}</span>
                        {v.isLatest && (
                          <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" title="Latest Version" />
                        )}
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {reviewers?.filter(r => r.status === 'accepted').map((reviewer) => {
                const reviewerId = reviewer.userId as Id<"users">;

                return (
                  <tr key={reviewer.accessId} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-6 py-4 sticky left-0 bg-white group-hover:bg-blue-50/30 z-10 border-r border-gray-200 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-9 h-9 border-2 border-white shadow-sm">
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xs font-bold">
                            {reviewer.displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="overflow-hidden">
                          <p className="font-medium text-gray-900 truncate">{reviewer.displayName}</p>
                          <p className="text-xs text-gray-500 truncate">{reviewer.email}</p>
                        </div>
                      </div>
                    </td>
                    {versions?.map((v) => {
                      const stats = allStats?.find(s => s.userId === reviewerId && s.versionId === v._id);

                      return (
                        <td key={v._id} className="px-6 py-4 border-r border-gray-200 text-center">
                          {stats ? (
                            <div className="inline-flex flex-col items-center">
                              <div className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full mb-1.5 shadow-sm">
                                {stats.viewCount} {stats.viewCount === 1 ? 'VIEW' : 'VIEWS'}
                              </div>
                              <div className="flex flex-col items-center text-[10px] text-gray-500 leading-tight">
                                <span className="font-medium">LAST SEEN</span>
                                <span>{new Date(stats.lastViewedAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                          ) : (
                            <div className="py-2">
                              <X className="w-4 h-4 text-gray-200 mx-auto" strokeWidth={3} />
                              <span className="text-[10px] text-gray-300 font-bold uppercase tracking-tighter">Unseen</span>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              {reviewers?.filter(r => r.status === 'accepted').length === 0 && (
                <tr>
                  <td colSpan={(versions?.length || 0) + 1} className="px-6 py-12 text-center">
                    <Users className="w-8 h-8 text-gray-300 mx-auto mb-2 opacity-20" />
                    <p className="text-gray-400 text-sm italic">No active reviewers to track yet.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* People with Access */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-900">People with Access ({reviewers.length})</h3>
              <p className="text-sm text-gray-600 mt-1">Manage reviewers and track their activity</p>
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
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Active
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
