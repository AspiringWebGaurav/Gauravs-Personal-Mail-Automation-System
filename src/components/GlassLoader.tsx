"use client";

import { motion } from "framer-motion";

interface GlassLoaderProps {
    fullScreen?: boolean;
}

export default function GlassLoader({ fullScreen = false }: GlassLoaderProps) {
    const containerClasses = fullScreen
        ? "fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md"
        : "flex items-center justify-center p-8";

    return (
        <div className={containerClasses}>
            <motion.div
                className="relative flex items-center justify-center w-24 h-24"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
            >
                {/* Outer Glass Ring */}
                <motion.div
                    className="absolute inset-0 rounded-full border border-white/20 bg-white/5 backdrop-blur-sm"
                    animate={{ rotate: 360 }}
                    transition={{
                        repeat: Infinity,
                        duration: 2,
                        ease: "linear",
                    }}
                />

                {/* Inner Pulse */}
                <motion.div
                    className="w-10 h-10 bg-white/40 rounded-full backdrop-blur-lg blur-[2px]"
                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{
                        repeat: Infinity,
                        duration: 1.5,
                        ease: "easeInOut",
                    }}
                />
            </motion.div>
        </div>
    );
}
