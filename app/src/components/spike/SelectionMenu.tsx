import React from "react";

interface SelectionMenuProps {
    x: number;
    y: number;
    onComment: () => void;
    onHighlight: () => void;
    onStrike: () => void;
    onClose: () => void;
}

export function SelectionMenu({ x, y, onComment, onHighlight, onStrike }: SelectionMenuProps) {
    return (
        <div
            className="fixed z-50 flex items-center bg-white rounded-full shadow-lg border border-gray-200 p-1 animate-in fade-in zoom-in-95 duration-200"
            style={{
                top: y - 50, // Position above the selection
                left: x,
                transform: "translateX(-50%)"
            }}
        >
            <MenuButton onClick={onComment} icon="💬" label="Comment" />
            <div className="w-px h-4 bg-gray-200 mx-1" />
            <MenuButton onClick={onHighlight} icon="✨" label="Highlight" />
            <div className="w-px h-4 bg-gray-200 mx-1" />
            <MenuButton onClick={onStrike} icon="❌" label="Strike" />

            {/* Tiny arrow pointing down */}
            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-white border-b border-r border-gray-200 rotate-45" />
        </div>
    );
}

function MenuButton({ onClick, icon, label }: { onClick: () => void; icon: string; label: string }) {
    return (
        <button
            onClick={onClick}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors group relative"
            title={label}
        >
            <span className="text-lg leading-none">{icon}</span>
            {/* Tooltip */}
            <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                {label}
            </span>
        </button>
    );
}
