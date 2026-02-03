"use client";

import { useState } from "react";
import { useQuery, useAction, useMutation } from "convex/react";
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, Copy, AlertTriangle, Key, Shield, User, Bot } from "lucide-react";

export function DeveloperSection() {
    const apiKeys = useQuery(api.apiKeys.list);
    const agents = useQuery(api.agents.list);
    const createKey = useAction(api.apiKeys.create);
    const revokeKey = useMutation(api.apiKeys.delete); // aliased as delete
    const { toast } = useToast();

    // Create Dialog State
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [keyName, setKeyName] = useState("");
    const [selectedAgentId, setSelectedAgentId] = useState<string>("self"); // "self" or agentId
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Success Dialog State (Show Raw Key)
    const [createdKey, setCreatedKey] = useState<string | null>(null);

    const handleCreate = async () => {
        if (!keyName.trim()) return;
        setIsSubmitting(true);
        try {
            const agentId = selectedAgentId === "self" ? undefined : selectedAgentId as Id<"agents">;

            const result = await createKey({
                name: keyName,
                agentId: agentId,
                scopes: ["read", "write"], // Default scopes for MVP
                expirationDays: 30, // Default 30 days for now
            });

            setCreatedKey(result.key);
            setIsCreateOpen(false);
            setKeyName("");
            setSelectedAgentId("self");
            toast({ title: "API Key Generated", description: "Make sure to copy it now." });
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to generate key", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCopy = () => {
        if (createdKey) {
            navigator.clipboard.writeText(createdKey);
            toast({ title: "Copied", description: "Key copied to clipboard" });
        }
    };

    const handleRevoke = async (id: Id<"apiKeys">, name: string) => {
        if (!confirm(`Revoke access for "${name}"? This application will stop working immediately.`)) return;
        try {
            await revokeKey({ id });
            toast({ title: "Key Revoked", description: "Access has been terminated." });
        } catch (error) {
            toast({ title: "Error", description: "Failed to revoke key", variant: "destructive" });
        }
    };

    if (apiKeys === undefined || agents === undefined) {
        return <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-medium">API Keys</h2>
                    <p className="text-sm text-gray-500">Manage access tokens for your agents and external tools.</p>
                </div>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            Generate Key
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Generate API Key</DialogTitle>
                            <DialogDescription>
                                Create a new key for an agent or yourself.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="keyName">Key Name</Label>
                                <Input
                                    id="keyName"
                                    placeholder="e.g. CI Pipeline"
                                    value={keyName}
                                    onChange={(e) => setKeyName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="identity">Identity</Label>
                                <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Identity" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="self">
                                            <div className="flex items-center">
                                                <User className="w-4 h-4 mr-2 text-gray-500" />
                                                <span>Myself (Personal Access)</span>
                                            </div>
                                        </SelectItem>
                                        {agents.map(agent => (
                                            <SelectItem key={agent._id} value={agent._id}>
                                                <div className="flex items-center">
                                                    <Bot className="w-4 h-4 mr-2 text-blue-500" />
                                                    <span>{agent.name} ({agent.role})</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                            <Button onClick={handleCreate} disabled={isSubmitting || !keyName}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Generate
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Success Dialog for Raw Key */}
            <Dialog open={!!createdKey} onOpenChange={(open) => !open && setCreatedKey(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-green-600">
                            <Key className="w-5 h-5" />
                            Key Generated Successfully
                        </DialogTitle>
                        <DialogDescription>
                            This key will <strong>never be shown again</strong>. Copy it now and store it securely.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex items-center space-x-2 my-4">
                        <div className="grid flex-1 gap-2">
                            <Label htmlFor="link" className="sr-only">Link</Label>
                            <Input
                                id="link"
                                value={createdKey || ""}
                                readOnly
                                className="font-mono bg-gray-50 text-xs"
                            />
                        </div>
                        <Button type="submit" size="sm" className="px-3" onClick={handleCopy}>
                            <span className="sr-only">Copy</span>
                            <Copy className="h-4 w-4" />
                        </Button>
                    </div>
                    <DialogFooter className="sm:justify-start">
                        <Button
                            type="button"
                            variant="secondary"
                            className="w-full"
                            onClick={() => setCreatedKey(null)}
                        >
                            I have saved this key
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Keys Table */}
            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Identity</TableHead>
                            <TableHead>Prefix</TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {apiKeys.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center text-gray-500">
                                    No active API keys found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            apiKeys.map((key) => {
                                const agent = agents.find(a => a._id === key.agentId);
                                return (
                                    <TableRow key={key._id}>
                                        <TableCell className="font-medium">
                                            <div className="flex flex-col">
                                                <span>{key.name}</span>
                                                {key.scopes && (
                                                    <span className="text-xs text-gray-400 font-mono">
                                                        {key.scopes.join(", ")}
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {key.agentId ? (
                                                <div className="flex items-center text-sm text-blue-700 bg-blue-50 w-fit px-2 py-1 rounded">
                                                    <Bot className="w-3 h-3 mr-1.5" />
                                                    {agent ? agent.name : "Unknown Agent"}
                                                </div>
                                            ) : (
                                                <div className="flex items-center text-sm text-gray-700 bg-gray-100 w-fit px-2 py-1 rounded">
                                                    <User className="w-3 h-3 mr-1.5" />
                                                    Personal
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="font-mono text-xs text-gray-500">
                                            {key.prefix}...
                                        </TableCell>
                                        <TableCell className="text-gray-500 text-sm">
                                            {new Date(key._creationTime).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                onClick={() => handleRevoke(key._id, key.name)}
                                            >
                                                Revoke
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
