"use client";

import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Eye,
    MessageSquare,
    Users,
    X,
} from 'lucide-react';
import { Id } from '../../../convex/_generated/dataModel';

interface ArtifactActivityTabProps {
    artifactId: Id<"artifacts">;
}

export function ArtifactActivityTab({ artifactId }: ArtifactActivityTabProps) {
    // Queries
    const reviewers = useQuery(api.access.listReviewers, { artifactId });
    const activityStats = useQuery(api.access.getActivityStats, { artifactId });
    const versions = useQuery(api.artifacts.getVersions, { artifactId });
    const allStats = useQuery(api.views.listAllStats, { artifactId });

    // Loading state
    if (reviewers === undefined || activityStats === undefined || versions === undefined || allStats === undefined) {
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

    const acceptedReviewers = reviewers.filter(r => r.status !== 'pending');

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
                            <p className="text-sm text-gray-600 mt-1">{acceptedReviewers.length} active</p>
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
                            {reviewers?.filter(r => r.status !== 'pending').map((reviewer) => {
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
                            {reviewers?.filter(r => r.status !== 'pending').length === 0 && (
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
        </div>
    );
}
