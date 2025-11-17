/**
 * ModalStore - Simplified Zustand store for modal state management
 */

import { create } from 'zustand';
import type { 
  ModalStoreState,
  ModalStoreActions
} from '../types/store';

/**
 * Create a simple modal store
 */
export const createModalStore = () => {
  // Initial state
  const initialState: ModalStoreState = {
    // Modal state
    modals: [],
    
    // Settings
    settings: {
      closeOnBackdrop: true,
      closeOnEscape: true,
      animationDuration: 200
    }
  };

  return create<ModalStoreState & ModalStoreActions>((set, get) => ({
    ...initialState,

    // =================== MODAL MANAGEMENT ===================
    openModal: (modal) => {
      const id = `modal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newModal = {
        id,
        type: 'default',
        title: '',
        content: null,
        props: {},
        ...modal
      };

      set((state) => {
        state.modals.push(newModal);
      });

      return id;
    },

    closeModal: (id) => {
      set((state) => {
        state.modals = state.modals.filter(m => m.id !== id);
      });
    },

    closeAllModals: () => {
      set((state) => {
        state.modals = [];
      });
    },

    closeTopModal: () => {
      set((state) => {
        if (state.modals.length > 0) {
          state.modals.pop();
        }
      });
    },

    // =================== MODAL ACTIONS ===================
    openTaskModal: (task = null) => {
      return get().openModal({
        type: 'task',
        title: task ? 'Edit Task' : 'Create Task',
        content: 'TaskForm',
        props: { task }
      });
    },

    openListModal: (list = null) => {
      return get().openModal({
        type: 'list',
        title: list ? 'Edit List' : 'Create List',
        content: 'ListForm',
        props: { list }
      });
    },

    openLabelModal: (label = null) => {
      return get().openModal({
        type: 'label',
        title: label ? 'Edit Label' : 'Create Label',
        content: 'LabelForm',
        props: { label }
      });
    },

    openConfirmModal: (title, message, onConfirm, onCancel = null) => {
      return get().openModal({
        type: 'confirm',
        title,
        content: 'ConfirmDialog',
        props: {
          message,
          onConfirm,
          onCancel
        }
      });
    },

    openSettingsModal: () => {
      return get().openModal({
        type: 'settings',
        title: 'Settings',
        content: 'SettingsDialog'
      });
    },

    // =================== SETTINGS ===================
    updateSettings: (settings) => {
      set((state) => {
        state.settings = {
          ...state.settings,
          ...settings
        };
      });
    },

    setCloseOnBackdrop: (closeOnBackdrop) => {
      get().updateSettings({ closeOnBackdrop });
    },

    setCloseOnEscape: (closeOnEscape) => {
      get().updateSettings({ closeOnEscape });
    },

    // =================== SELECTORS ===================
    getModalById: (id) => {
      return get().modals.find(m => m.id === id);
    },

    getTopModal: () => {
      const modals = get().modals;
      return modals.length > 0 ? modals[modals.length - 1] : null;
    },

    getModalCount: () => {
      return get().modals.length;
    },

    hasModals: () => {
      return get().getModalCount() > 0;
    },

    isModalOpen: (type) => {
      return get().modals.some(m => m.type === type);
    }
  }));
};

// Export the store instance
export const useModalStore = createModalStore();