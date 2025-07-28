import React, { useState, useEffect } from "react"
import { Keyboard, X, HelpCircle } from "lucide-react"

export function ControlsMenu() {
    const [isOpen, setIsOpen] = useState(false);

    // Handle H key to toggle controls menu
    useEffect(() => {
        const handleKeyPress = (event: KeyboardEvent) => {
            if (event.key === 'h' || event.key === 'H') {
                setIsOpen(prev => !prev);
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, []);

    // Toggle button (always visible)
    const ToggleButton = () => (
        <button
            onClick={() => setIsOpen(!isOpen)}
            className="fixed bottom-4 left-4 z-50 w-12 h-12 bg-purple-500 hover:bg-purple-600 rounded-lg flex items-center justify-center transition-colors border border-purple-400 shadow-lg backdrop-blur-sm"
        >
            {isOpen ? <X className="w-6 h-6 text-white" /> : <Keyboard className="w-6 h-6 text-white" />}
        </button>
    );

    if (!isOpen) {
        return <ToggleButton />;
    }

    const controls = [
        {
            category: "Movement",
            keys: [
                { key: "W / ↑", description: "Move Forward" },
                { key: "S / ↓", description: "Move Backward" },
                { key: "A / ←", description: "Move Left" },
                { key: "D / →", description: "Move Right" },
            ]
        },
        {
            category: "Actions",
            keys: [
                { key: "E", description: "Interact" },
                { key: "V", description: "Swap Ship" },
                { key: "X", description: "Escape" },
            ]
        },
        {
            category: "Interface",
            keys: [
                { key: "ESC", description: "Game Menu" },
                { key: "H", description: "Toggle Controls" },
                { key: "Click", description: "Pointer Lock" },
            ]
        }
    ];

    return (
        <>
            <ToggleButton />
            
            {/* Controls Menu Overlay */}
            <div className="fixed bottom-20 left-4 z-40">
                <div className="bg-black border border-purple-500 rounded-xl p-6 max-w-sm shadow-2xl backdrop-blur-sm">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-purple-500 rounded-md flex items-center justify-center">
                                <Keyboard className="w-4 h-4 text-white" />
                            </div>
                            <h2 className="text-lg font-light text-white">Controls</h2>
                        </div>
                        <div className="text-purple-400 text-xs">
                            Press H
                        </div>
                    </div>

                    {/* Controls List */}
                    <div className="space-y-3">
                        {controls.map((section, sectionIndex) => (
                            <div key={sectionIndex} className="space-y-2">
                                <div className="flex items-center gap-2 mb-2">
                                    <HelpCircle className="w-3 h-3 text-purple-400" />
                                    <h3 className="text-xs font-medium text-purple-300 uppercase tracking-wide">
                                        {section.category}
                                    </h3>
                                </div>
                                
                                <div className="space-y-1">
                                    {section.keys.map((control, keyIndex) => (
                                        <div 
                                            key={keyIndex}
                                            className="flex items-center justify-between py-1.5 px-2 bg-gray-900/50 rounded border border-gray-800"
                                        >
                                            <span className="text-gray-300 text-xs">
                                                {control.description}
                                            </span>
                                            <div className="flex items-center gap-1">
                                                {control.key.split(' / ').map((key, i) => (
                                                    <React.Fragment key={i}>
                                                        {i > 0 && (
                                                            <span className="text-gray-500 text-xs mx-1">or</span>
                                                        )}
                                                        <kbd className="px-1.5 py-0.5 text-xs font-mono bg-gray-800 border border-gray-600 rounded text-purple-300 shadow-sm">
                                                            {key}
                                                        </kbd>
                                                    </React.Fragment>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                
                                {sectionIndex < controls.length - 1 && (
                                    <div className="border-b border-gray-800 mt-3"></div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Footer Tip */}
                    <div className="mt-4 pt-3 border-t border-gray-800">
                        <p className="text-xs text-gray-500 text-center">
                            Click canvas to lock mouse when controlling player/ship
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}