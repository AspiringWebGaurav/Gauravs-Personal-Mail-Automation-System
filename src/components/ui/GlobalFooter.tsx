'use client';

import * as React from 'react';

const CHANGELOGS = [
    {
        version: 'V1 Engine',
        date: 'February 2026',
        entries: [
            'Complete backend restructuring to use Relational Firebase Architecture.',
            'Introduced ProviderEngine for 99.9% guaranteed email delivery and dynamic key rotations.',
            'Implemented native Support for EmailJS engine routing.',
            'Fully redesigned Dashboard UI and enterprise Provider Matrix.',
            'Built Light/Dark mode transitions.'
        ]
    },
    {
        version: 'Legacy WebApp',
        date: '2023-2025',
        entries: [
            'Initial prototype build.',
            'Monolithic cron functions and static routing.',
            'Deprecated due to architecture fragility.'
        ]
    }
];

export function GlobalFooter() {
    const [openLog, setOpenLog] = React.useState<string | null>(null);

    return (
        <footer className="w-full border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 transition-colors mt-auto relative z-50">
            <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-4">

                <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400 font-medium">
                    <span>GMSS App</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700"></span>
                    <span>All rights reserved.</span>
                </div>

                <div className="flex items-center gap-2">
                    {CHANGELOGS.map((log) => (
                        <div key={log.version} className="relative">
                            <button
                                onClick={() => setOpenLog(openLog === log.version ? null : log.version)}
                                className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-colors
                           ${log.version.includes('V1')
                                        ? 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20 shadow-sm border border-indigo-200 dark:border-indigo-500/20'
                                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'}
                        `}
                            >
                                {log.version}
                            </button>

                            {/* Popover Changelog */}
                            {openLog === log.version && (
                                <div className="absolute bottom-full right-0 mb-3 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl p-5 z-50 animate-in fade-in slide-in-from-bottom-2">
                                    <div className="flex items-center justify-between mb-3 border-b border-slate-100 dark:border-slate-800 pb-2">
                                        <h4 className="font-bold text-slate-900 dark:text-white">{log.version}</h4>
                                        <button onClick={() => setOpenLog(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">&times;</button>
                                    </div>
                                    <ul className="space-y-2.5">
                                        {log.entries.map((entry, i) => (
                                            <li key={i} className="text-sm text-slate-600 dark:text-slate-400 flex items-start gap-2 leading-tight">
                                                <span className="text-indigo-500 mt-0.5 shrink-0">&bull;</span>
                                                {entry}
                                            </li>
                                        ))}
                                    </ul>
                                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-4 font-medium uppercase tracking-wider">{log.date}</p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </footer>
    );
}
