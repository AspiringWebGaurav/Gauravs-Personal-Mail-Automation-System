'use client';

import { useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { db } from '@/lib/firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function DiagnosticsPage() {
    const { user, firebaseUser, loading } = useAuth();
    const [status, setStatus] = useState<string>('Ready');
    const [logs, setLogs] = useState<string[]>([]);
    const [latency, setLatency] = useState<number | null>(null);

    const addLog = (msg: string) => setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - ${msg}`]);

    const runDiagnostics = async () => {
        setLogs([]);
        setLatency(null);
        setStatus('Running...');
        addLog('Starting diagnostics...');

        // 1. Check Auth
        if (!firebaseUser) {
            addLog('❌ Not authenticated. Please login first.');
            setStatus('Failed: No Auth');
            return;
        }
        addLog(`✅ Authenticated as: ${firebaseUser.email} (${firebaseUser.uid})`);

        // 2. Firestore Write Test
        addLog('Testing Firestore Write...');
        const ref = doc(db, '_diagnostics', 'ping_' + firebaseUser.uid);
        const start = performance.now();

        try {
            await setDoc(ref, {
                timestamp: serverTimestamp(),
                device: navigator.userAgent,
                testId: start
            });
            addLog('✅ Write successful');

            // 3. Firestore Read Test
            addLog('Testing Firestore Read...');
            const snap = await getDoc(ref);
            const end = performance.now();

            if (snap.exists()) {
                const diff = Math.round(end - start);
                setLatency(diff);
                addLog(`✅ Read successful. Data: ${JSON.stringify(snap.data())}`);
                addLog(`🚀 Round-trip Latency: ${diff}ms`);

                if (diff < 200) addLog('✨ Performance: Excellent');
                else if (diff < 800) addLog('⚠️ Performance: Moderate (Okay for mobile)');
                else addLog('🛑 Performance: Slow (Check network/region)');

                setStatus('Success');
            } else {
                addLog('❌ Read failed: Document not found');
                setStatus('Failed: Read');
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            addLog(`❌ Firestore Error: ${errorMessage}`);

            // Check for specific Firestore error codes if possible
            if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === 'unavailable') {
                addLog('🛑 Client is offline or can\'t reach Firestore backend');
            }
            setStatus('Error');
        }
    };

    return (
        <div className="p-8 max-w-2xl mx-auto text-[#f0f0f5]">
            <h1 className="text-3xl font-bold mb-6">Firebase Diagnostics 🩺</h1>

            <div className="bg-[#1a1a24] p-6 rounded-xl border border-[#2a2a35] mb-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">Connection Check</h2>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${status === 'Success' ? 'bg-green-500/20 text-green-400' :
                        status === 'Error' ? 'bg-red-500/20 text-red-400' :
                            status === 'Running...' ? 'bg-blue-500/20 text-blue-400' :
                                'bg-gray-700 text-gray-300'
                        }`}>
                        {status}
                    </span>
                </div>

                <div className="space-y-2 mb-6">
                    <div className="flex justify-between text-sm">
                        <span className="text-[#8f8f99]">Auth Status:</span>
                        <span className={user ? 'text-green-400' : 'text-red-400'}>
                            {loading ? 'Loading...' : user ? 'Logged In' : 'Logged Out'}
                        </span>
                    </div>
                    {latency !== null && (
                        <div className="flex justify-between text-sm">
                            <span className="text-[#8f8f99]">Latency (R/W):</span>
                            <span className={latency < 500 ? 'text-green-400' : 'text-orange-400'}>
                                {latency}ms
                            </span>
                        </div>
                    )}
                </div>

                <button
                    onClick={runDiagnostics}
                    disabled={status === 'Running...'}
                    className="w-full py-3 bg-[#6c5ce7] hover:bg-[#5b4cc4] text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {status === 'Running...' ? 'Running Tests...' : 'Run Diagnostics'}
                </button>
            </div>

            <div className="bg-[#0a0a0f] p-4 rounded-lg border border-[#2a2a35] font-mono text-xs h-64 overflow-y-auto">
                {logs.length === 0 ? (
                    <span className="text-gray-600">Logs will appear here...</span>
                ) : (
                    logs.map((log, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="mb-1 border-b border-[#1a1a24] pb-1 last:border-0"
                        >
                            {log}
                        </motion.div>
                    ))
                )}
            </div>

            <div className="mt-4 text-xs text-center text-[#6b6b80]">
                <p className="mb-2">
                    <strong>Note:</strong> High latency (&gt;300ms) usually means your database is in a different continent (e.g., US Server vs India User).
                </p>
                {!user && (
                    <Link href="/" className="text-[#6c5ce7] hover:underline">
                        Go to Login Page to test Authenticated Writes
                    </Link>
                )}
            </div>
        </div>
    );
}
