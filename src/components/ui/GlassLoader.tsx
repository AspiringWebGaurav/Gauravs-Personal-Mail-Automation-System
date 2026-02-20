'use client';

import { motion } from 'framer-motion';

export function GlassLoader() {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 cursor-wait">
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes snake {
                    0% { stroke-dasharray: 1, 200; stroke-dashoffset: 0; }
                    50% { stroke-dasharray: 90, 200; stroke-dashoffset: -35px; }
                    100% { stroke-dasharray: 90, 200; stroke-dashoffset: -124px; }
                }
                .animate-snake { animation: snake 1.5s ease-in-out infinite; }
            `}} />

            {/* Background blur layer */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-white/10 dark:bg-slate-950/40 backdrop-blur-lg"
            />

            {/* Spinner Container */}
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="relative z-10 flex items-center justify-center p-8"
            >
                <svg className="w-16 h-16 animate-[spin_2s_linear_infinite] text-indigo-600 dark:text-indigo-500" viewBox="25 25 50 50">
                    <circle
                        className="animate-snake"
                        cx="50" cy="50" r="20"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="4"
                        strokeLinecap="round"
                    />
                </svg>
            </motion.div>
        </div>
    );
}
