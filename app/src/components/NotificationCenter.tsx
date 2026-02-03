
"use client";

import {
    NovuProvider,
    PopoverNotificationCenter,
} from "@novu/notification-center";
import { useTheme } from "next-themes";
import { Bell } from "lucide-react";

export const NotificationCenter = ({ subscriberId }: { subscriberId: string }) => {
    const { theme } = useTheme();

    return (
        <NovuProvider
            subscriberId={subscriberId}
            applicationIdentifier={process.env.NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER || ""}
            backendUrl={process.env.NEXT_PUBLIC_NOVU_API_URL}
            socketUrl={process.env.NEXT_PUBLIC_NOVU_SOCKET_URL || process.env.NEXT_PUBLIC_NOVU_API_URL}
        >
            <PopoverNotificationCenter
                colorScheme={theme === "dark" ? "dark" : "light"}
                showUserPreferences={true}
            >
                {({ unseenCount }) => (
                    <div
                        className="relative cursor-pointer"
                        data-testid="notification-bell"
                    >
                        <Bell className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
                        {(unseenCount || 0) > 0 && (
                            <span
                                className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white ring-2 ring-background"
                                data-testid="notification-badge"
                            >
                                <span data-testid="notification-count">
                                    {unseenCount}
                                </span>
                            </span>
                        )}
                    </div>
                )}
            </PopoverNotificationCenter>
        </NovuProvider>
    );
};
