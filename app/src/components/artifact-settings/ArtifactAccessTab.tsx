import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from '@/hooks/use-toast';
import {
  MessageSquare,
  Mail,
  X,
  Clock,
  CheckCircle,
  Send,
} from 'lucide-react';

type InvitationStatus = 'accepted' | 'pending';

interface Reviewer {
  id: string;
  name: string;
  email: string;
  avatar: string;
  status: InvitationStatus;
  stats: {
    comments: number;
  };
  isCurrentlyViewing: boolean;
}

interface ArtifactAccessTabProps {
  artifactId: string;
}

const mockReviewers: Reviewer[] = [
  {
    id: '1',
    name: 'Sarah Chen',
    email: 'sarah@company.com',
    avatar: 'SC',
    status: 'accepted',
    stats: {
      comments: 8,
    },
    isCurrentlyViewing: true,
  },
  {
    id: '2',
    name: 'Mike Johnson',
    email: 'mike@company.com',
    avatar: 'MJ',
    status: 'pending',
    stats: {
      comments: 0,
    },
    isCurrentlyViewing: false,
  },
  {
    id: '3',
    name: 'Emma Davis',
    email: 'emma@company.com',
    avatar: 'ED',
    status: 'accepted',
    stats: {
      comments: 0,
    },
    isCurrentlyViewing: false,
  },
  {
    id: '4',
    name: 'Alex Kim',
    email: 'alex@external.com',
    avatar: 'AK',
    status: 'pending',
    stats: {
      comments: 0,
    },
    isCurrentlyViewing: false,
  },
];

export function ArtifactAccessTab({ artifactId }: ArtifactAccessTabProps) {
  const [reviewers, setReviewers] = useState<Reviewer[]>(mockReviewers);
  const [inviteEmail, setInviteEmail] = useState('');

  const handleSendInvite = () => {
    if (inviteEmail.trim()) {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(inviteEmail)) {
        toast({ title: 'Please enter a valid email address', variant: 'destructive' });
        return;
      }

      // Check if user already invited
      if (reviewers.some(r => r.email === inviteEmail)) {
        toast({ title: 'This person has already been invited', variant: 'destructive' });
        return;
      }

      const newReviewer: Reviewer = {
        id: Date.now().toString(),
        name: inviteEmail.split('@')[0],
        email: inviteEmail,
        avatar: inviteEmail.substring(0, 2).toUpperCase(),
        status: 'pending',
        stats: {
          comments: 0,
        },
        isCurrentlyViewing: false,
      };
      setReviewers([newReviewer, ...reviewers]);
      setInviteEmail('');
      toast({ title: `Invitation sent to ${inviteEmail}` });

      // TODO Backend: await sendInvitation({ artifactId, email: inviteEmail });
    }
  };

  const handleResendInvite = (reviewer: Reviewer) => {
    toast({ title: `Invitation resent to ${reviewer.email}` });
    // TODO Backend: await resendInvitation({ invitationId: reviewer.id });
  };

  const handleRevokeInvite = (reviewerId: string) => {
    const reviewer = reviewers.find((r) => r.id === reviewerId);
    if (reviewer && confirm(`Revoke invitation for ${reviewer.email}?`)) {
      setReviewers(reviewers.filter((r) => r.id !== reviewerId));
      toast({ title: 'Invitation revoked' });
      // TODO Backend: await revokeInvitation({ invitationId: reviewerId });
    }
  };

  const handleRemove = (reviewerId: string) => {
    const reviewer = reviewers.find((r) => r.id === reviewerId);
    if (reviewer && confirm(`Remove ${reviewer.name}'s access?`)) {
      setReviewers(reviewers.filter((r) => r.id !== reviewerId));
      toast({ title: 'Reviewer removed' });
    }
  };

  const acceptedReviewers = reviewers.filter(r => r.status === 'accepted');
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
              {acceptedReviewers.map((reviewer) => (
                <div
                  key={reviewer.id}
                  className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-gradient-to-br from-purple-400 to-blue-500 text-white">
                        {reviewer.avatar}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">{reviewer.name}</p>
                        {reviewer.isCurrentlyViewing && (
                          <Badge className="bg-green-100 text-green-700 border-green-200">
                            <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse" />
                            Viewing Now
                          </Badge>
                        )}
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Active
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{reviewer.email}</p>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          {reviewer.stats.comments} comments
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(reviewer.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
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
              {pendingInvitations.map((reviewer) => (
                <div
                  key={reviewer.id}
                  className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-gradient-to-br from-gray-300 to-gray-400 text-white">
                        {reviewer.avatar}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">{reviewer.name}</p>
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                          <Clock className="w-3 h-3 mr-1" />
                          Invited
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{reviewer.email}</p>
                      <p className="text-sm text-gray-500 mt-1">Invited</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleResendInvite(reviewer)}
                    >
                      <Send className="w-3 h-3 mr-1" />
                      Resend
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRevokeInvite(reviewer.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      Revoke
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
