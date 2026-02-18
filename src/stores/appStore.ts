import { create } from 'zustand';

interface AppState {
    // Toast
    toast: { message: string; type: 'success' | 'error' | 'info' } | null;
    showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
    clearToast: () => void;

    // Modal
    modalOpen: string | null;
    openModal: (id: string) => void;
    closeModal: () => void;

    // Global Loader
    isLoading: boolean;
    setLoading: (loading: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
    toast: null,
    showToast: (message, type = 'info') => {
        set({ toast: { message, type } });
    },
    clearToast: () => set({ toast: null }),

    modalOpen: null,
    openModal: (id) => set({ modalOpen: id }),
    closeModal: () => set({ modalOpen: null }),

    // Global Loader
    isLoading: false,
    setLoading: (loading) => set({ isLoading: loading }),
}));
