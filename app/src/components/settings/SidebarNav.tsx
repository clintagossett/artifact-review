"use client";

import { LayoutDashboard, User, Users, Terminal, CreditCard, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface SidebarNavProps extends React.HTMLAttributes<HTMLElement> {
    items: {
        href?: string;
        title: string;
        icon: React.ReactNode;
        id: string;
    }[];
    activeTab: string;
    onTabChange: (id: string) => void;
}

export function SidebarNav({ className, items, activeTab, onTabChange, ...props }: SidebarNavProps) {
    return (
        <nav
            className={cn(
                "flex space-x-2 lg:flex-col lg:space-x-0 lg:space-y-1",
                className
            )}
            {...props}
        >
            {items.map((item) => (
                <Button
                    key={item.id}
                    variant="ghost"
                    className={cn(
                        "justify-start hover:bg-gray-100",
                        activeTab === item.id
                            ? "bg-gray-100 hover:bg-gray-100 font-medium text-primary"
                            : "text-gray-600 font-normal"
                    )}
                    onClick={() => onTabChange(item.id)}
                >
                    <span className="mr-2 h-4 w-4">{item.icon}</span>
                    {item.title}
                </Button>
            ))}
        </nav>
    );
}
