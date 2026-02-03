"use client";

import { AlertCircle, CheckCircle2, Copy, Eye, EyeOff, Loader2, Plus, RefreshCw, Trash2, Shield, Bot, Key } from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export function AgentsSection() {
    const agents = useQuery(api.agents.list);
    const createAgent = useMutation(api.agents.create);
    const deleteAgent = useMutation(api.agents.delete);
    const { toast } = useToast();

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newName, setNewName] = useState("");
    const [newRole, setNewRole] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleCreate = async () => {
        if (!newName.trim() || !newRole.trim()) return;
        setIsSubmitting(true);
        try {
            await createAgent({ name: newName, role: newRole });
            toast({ title: "Agent Created", description: `${newName} is ready.` });
            setNewName("");
            setNewRole("");
            setIsCreateOpen(false);
        } catch (error) {
            toast({ title: "Error", description: "Failed to create agent", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: Id<"agents">, name: string) => {
        if (!confirm(`Are you sure you want to delete ${name}? This cannot be undone.`)) return;
        try {
            await deleteAgent({ id });
            toast({ title: "Agent Deleted", description: `${name} has been removed.` });
        } catch (error) {
            toast({ title: "Error", description: "Failed to delete agent", variant: "destructive" });
        }
    };

    if (agents === undefined) {
        return <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-medium">Agent Profiles</h2>
                    <p className="text-sm text-gray-500">Create AI identities that can post artifacts on your behalf.</p>
                </div>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            Create Agent
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create New Agent</DialogTitle>
                            <DialogDescription>
                                Give your agent a name and a role to identify its activity.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Name</Label>
                                <Input
                                    id="name"
                                    placeholder="e.g. Code Reviewer"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="role">Role</Label>
                                <Input
                                    id="role"
                                    placeholder="e.g. Quality Control"
                                    value={newRole}
                                    onChange={(e) => setNewRole(e.target.value)}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                            <Button onClick={handleCreate} disabled={isSubmitting || !newName || !newRole}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Create
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                {agents.length === 0 ? (
                    <div className="col-span-2 text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
                        <Bot className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                        <h3 className="text-sm font-medium text-gray-900">No agents yet</h3>
                        <p className="text-sm text-gray-500 mt-1">Create your first agent to get started.</p>
                    </div>
                ) : (
                    agents.map((agent) => (
                        <Card key={agent._id}>
                            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-50 rounded-lg">
                                        <Bot className="h-6 w-6 text-blue-600" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-base font-medium">{agent.name}</CardTitle>
                                        <CardDescription>{agent.role}</CardDescription>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-gray-400 hover:text-red-600"
                                    onClick={() => handleDelete(agent._id, agent.name)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </CardHeader>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}


