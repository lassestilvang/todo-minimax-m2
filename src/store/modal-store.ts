/**
 * ModalStore - Comprehensive modal and dialog management
 * Handles modal stack, focus management, and modal state persistence
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { persist } from 'zustand/middleware';
import type { 
  ModalStore as IModalStore,
  ModalState,
  ModalStoreActions,
  ModalStoreSelectors,
  ShowModalPayload,
  AppModal
} from '../types/store';
import type { ApiError } from '../../types/utils';
import { withErrorHandling } from '../middleware/error-handling';
import { createPersistConfig } from '../middleware/persistence';

/**
 * Modal configuration defaults
 */
const DEFAULT_CONFIG = {
  closeOnOverlayClick: true,
  closeOnEsc: true,
  trapFocus: true,
  restoreFocus: true
};

/**
 * Focus management for accessibility
 */
class FocusManager {
  private focusStack: HTMLElement[] = [];
  private previousActiveElement: HTMLElement | null = null;

  saveFocus() {
    this.previousActiveElement = document.activeElement as HTMLElement;
  }

  restoreFocus() {
    if (this.previousActiveElement && this.restoreFocus) {
      this.previousActiveElement.focus();
      this.previousActiveElement = null;
    }
  }

  trapFocus(container: HTMLElement) {
    const focusableElements = this.getFocusableElements(container);
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // This will be handled by the modal store
        const event = new CustomEvent('modalEscapeKey');
        container.dispatchEvent(event);
      }
    };

    container.addEventListener('keydown', handleTabKey);
    container.addEventListener('keydown', handleEscapeKey);

    // Focus the first element
    firstElement.focus();

    return () => {
      container.removeEventListener('keydown', handleTabKey);
      container.removeEventListener('keydown', handleEscapeKey);
    };
  }

  private getFocusableElements(container: HTMLElement): HTMLElement[] {
    const focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]'
    ].join(', ');

    return Array.from(container.querySelectorAll(focusableSelectors))
      .filter(el => {
        const element = el as HTMLElement;
        return element.offsetWidth > 0 && 
               element.offsetHeight > 0 && 
               element.getBoundingClientRect().width > 0 &&
               element.getBoundingClientRect().height > 0;
      }) as HTMLElement[];
  }
}

/**
 * Create ModalStore with comprehensive modal management
 */
export const createModalStore = (config?: {
  errorHandling?: boolean;
  persistence?: boolean;
  devtools?: boolean;
}) => {
  const {
    errorHandling = true,
    persistence = true,
    devtools = process.env.NODE_ENV === 'development'
  } = config || {};

  const focusManager = new FocusManager();

  // Initial state
  const initialState: ModalState = {
    modals: [],
    activeModalId: null,
    modalStack: [],
    isAnyModalOpen: false,
    closeOnOverlayClick: DEFAULT_CONFIG.closeOnOverlayClick,
    closeOnEsc: DEFAULT_CONFIG.closeOnEsc,
    trapFocus: DEFAULT_CONFIG.trapFocus,
    restoreFocus: DEFAULT_CONFIG.restoreFocus
  };

  // Build store configuration
  let storeConfig = (set: any, get: any, api: any): ModalState & ModalStoreActions => {
    const state = initialState;

    return {
      ...state,

      // =================== MODAL MANAGEMENT ===================
      showModal: (payload: ShowModalPayload): string => {
        const id = payload.id || `modal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const now = new Date();

        const modal: AppModal = {
          id,
          type: payload.type,
          title: payload.title,
          description: payload.description,
          content: payload.content,
          size: payload.size || 'md',
          position: payload.position || 'center',
          isOpen: true,
          isClosable: payload.isClosable !== false,
          isDraggable: payload.isDraggable || false,
          isResizable: payload.isResizable || false,
          props: payload.props || {},
          onOpen: payload.onOpen,
          onClose: payload.onClose,
          onConfirm: payload.onConfirm,
          onCancel: payload.onCancel,
          createdAt: now
        };

        set((state: ModalState) => {
          state.modals.push(modal);
          state.activeModalId = id;
          state.modalStack.push(id);
          state.isAnyModalOpen = true;

          // Save focus for restoration
          if (state.restoreFocus) {
            focusManager.saveFocus();
          }

          // Call onOpen callback
          if (payload.onOpen) {
            setTimeout(() => payload.onOpen!(), 0);
          }
        }, false, 'showModal');

        return id;
      },

      hideModal: (id: string) => {
        const modal = get().modals.find(m => m.id === id);
        if (!modal) return;

        set((state: ModalState) => {
          const modalIndex = state.modals.findIndex(m => m.id === id);
          if (modalIndex !== -1) {
            state.modals[modalIndex].isOpen = false;
            
            // Remove from stack
            state.modalStack = state.modalStack.filter(modalId => modalId !== id);
            
            // Update active modal
            if (state.activeModalId === id) {
              state.activeModalId = state.modalStack[state.modalStack.length - 1] || null;
            }
            
            state.isAnyModalOpen = state.modalStack.length > 0;

            // If no more modals, restore focus
            if (!state.isAnyModalOpen && state.restoreFocus) {
              focusManager.restoreFocus();
            }

            // Call onClose callback after state update
            if (modal.onClose) {
              setTimeout(() => modal.onClose!(), 0);
            }
          }
        }, false, 'hideModal');

        // Remove modal from DOM after animation (if any)
        setTimeout(() => {
          set((state: ModalState) => {
            state.modals = state.modals.filter(m => m.id !== id);
          }, false, 'removeModal');
        }, 300);
      },

      closeModal: (id: string) => {
        // Alias for hideModal
        get().hideModal(id);
      },

      closeActiveModal: () => {
        const activeModalId = get().activeModalId;
        if (activeModalId) {
          get().hideModal(activeModalId);
        }
      },

      closeAllModals: () => {
        set((state: ModalState) => {
          state.modals.forEach(modal => {
            modal.isOpen = false;
            if (modal.onClose) {
              setTimeout(() => modal.onClose!(), 0);
            }
          });
          
          state.modals = [];
          state.modalStack = [];
          state.activeModalId = null;
          state.isAnyModalOpen = false;

          // Restore focus
          if (state.restoreFocus) {
            focusManager.restoreFocus();
          }
        }, false, 'closeAllModals');
      },

      // =================== STACK MANAGEMENT ===================
      pushModal: (payload: ShowModalPayload): string => {
        return get().showModal(payload);
      },

      popModal: (): string | null => {
        const activeModalId = get().activeModalId;
        if (activeModalId) {
          get().hideModal(activeModalId);
          return activeModalId;
        }
        return null;
      },

      clearModalStack: () => {
        get().closeAllModals();
      },

      // =================== MODAL DATA MANAGEMENT ===================
      updateModalData: (id: string, data: Partial<AppModal['props']>) => {
        set((state: ModalState) => {
          const modal = state.modals.find(m => m.id === id);
          if (modal) {
            modal.props = { ...modal.props, ...data };
          }
        }, false, 'updateModalData');
      },

      getModalById: (id: string): AppModal | undefined => {
        return get().modals.find(m => m.id === id);
      },

      getActiveModal: (): AppModal | undefined => {
        const activeModalId = get().activeModalId;
        return activeModalId ? get().modals.find(m => m.id === activeModalId) : undefined;
      },

      // =================== CONFIGURATION ===================
      setCloseOnOverlayClick: (close: boolean) => {
        set((state: ModalState) => {
          state.closeOnOverlayClick = close;
        }, false, 'setCloseOnOverlayClick');
      },

      setCloseOnEsc: (close: boolean) => {
        set((state: ModalState) => {
          state.closeOnEsc = close;
        }, false, 'setCloseOnEsc');
      },

      setTrapFocus: (trap: boolean) => {
        set((state: ModalState) => {
          state.trapFocus = trap;
        }, false, 'setTrapFocus');
      },

      setRestoreFocus: (restore: boolean) => {
        set((state: ModalState) => {
          state.restoreFocus = restore;
        }, false, 'setRestoreFocus');
      },

      // =================== CONVENIENCE METHODS ===================
      confirm: (payload: {
        title: string;
        message: string;
        confirmText?: string;
        cancelText?: string;
        onConfirm?: () => void;
        onCancel?: () => void;
      }): string => {
        return get().showModal({
          type: 'dialog',
          title: payload.title,
          content: (
            <div className="modal-confirm-content">
              <p>{payload.message}</p>
              <div className="modal-confirm-actions">
                <button onClick={payload.onCancel || (() => get().closeActiveModal())}>
                  {payload.cancelText || 'Cancel'}
                </button>
                <button onClick={payload.onConfirm || (() => get().closeActiveModal())}>
                  {payload.confirmText || 'Confirm'}
                </button>
              </div>
            </div>
          ),
          onConfirm: payload.onConfirm,
          onCancel: payload.onCancel
        });
      },

      alert: (payload: {
        title: string;
        message: string;
        onClose?: () => void;
      }): string => {
        return get().showModal({
          type: 'dialog',
          title: payload.title,
          content: (
            <div className="modal-alert-content">
              <p>{payload.message}</p>
              <button onClick={payload.onClose || (() => get().closeActiveModal())}>
                OK
              </button>
            </div>
          ),
          onClose: payload.onClose
        });
      },

      prompt: (payload: {
        title: string;
        message: string;
        defaultValue?: string;
        onSubmit: (value: string) => void;
        onCancel?: () => void;
      }): string => {
        let inputValue = payload.defaultValue || '';
        
        return get().showModal({
          type: 'dialog',
          title: payload.title,
          content: (
            <div className="modal-prompt-content">
              <p>{payload.message}</p>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => {
                  inputValue = e.target.value;
                  get().updateModalData(get().activeModalId!, { inputValue });
                }}
                autoFocus
              />
              <div className="modal-prompt-actions">
                <button onClick={payload.onCancel || (() => get().closeActiveModal())}>
                  Cancel
                </button>
                <button onClick={() => {
                  payload.onSubmit(inputValue);
                  get().closeActiveModal();
                }}>
                  Submit
                </button>
              </div>
            </div>
          ),
          onCancel: payload.onCancel,
          props: { inputValue }
        });
      },

      // =================== DRAWER METHODS ===================
      showDrawer: (payload: Omit<ShowModalPayload, 'type'>): string => {
        return get().showModal({
          ...payload,
          type: 'drawer'
        });
      },

      showBottomSheet: (payload: Omit<ShowModalPayload, 'type'>): string => {
        return get().showModal({
          ...payload,
          type: 'bottom-sheet'
        });
      },

      // =================== BULK OPERATIONS ===================
      closeModalsByType: (type: AppModal['type']) => {
        set((state: ModalState) => {
          const modalsToClose = state.modals.filter(m => m.type === type && m.isOpen);
          
          modalsToClose.forEach(modal => {
            modal.isOpen = false;
            if (modal.onClose) {
              setTimeout(() => modal.onClose!(), 0);
            }
          });

          // Update stack
          state.modalStack = state.modalStack.filter(id => 
            !modalsToClose.some(m => m.id === id)
          );
          
          // Update active modal
          if (modalsToClose.some(m => m.id === state.activeModalId)) {
            state.activeModalId = state.modalStack[state.modalStack.length - 1] || null;
          }
          
          state.isAnyModalOpen = state.modalStack.length > 0;

          // Remove closed modals from state
          setTimeout(() => {
            set((state: ModalState) => {
              state.modals = state.modals.filter(m => m.isOpen);
            }, false, 'removeClosedModals');
          }, 300);
        }, false, 'closeModalsByType');
      },

      closeOldestModal: () => {
        if (get().modalStack.length > 0) {
          const oldestModalId = get().modalStack[0];
          get().hideModal(oldestModalId);
        }
      },

      // =================== UTILITY METHODS ===================
      getModalStack: (): string[] => {
        return [...get().modalStack];
      },

      getModalCount: (): number => {
        return get().modals.filter(m => m.isOpen).length;
      },

      isModalOpen: (id: string): boolean => {
        const modal = get().modals.find(m => m.id === id);
        return modal?.isOpen || false;
      },

      hasModals: (): boolean => {
        return get().isAnyModalOpen;
      },

      getModalStats: () => {
        const state = get();
        return {
          total: state.modals.length,
          open: state.modals.filter(m => m.isOpen).length,
          byType: {
            dialog: state.modals.filter(m => m.type === 'dialog').length,
            drawer: state.modals.filter(m => m.type === 'drawer').length,
            'bottom-sheet': state.modals.filter(m => m.type === 'bottom-sheet').length,
            popover: state.modals.filter(m => m.type === 'popover').length
          },
          stackDepth: state.modalStack.length,
          isAnyOpen: state.isAnyModalOpen
        };
      }
    };
  };

  // Apply middleware
  if (errorHandling) {
    storeConfig = withErrorHandling('ModalStore', storeConfig, {
      retryAttempts: 1,
      logErrors: false
    });
  }

  let middleware = [subscribeWithSelector(), immer];

  if (persistence) {
    middleware.push(persist(
      storeConfig,
      createPersistConfig({
        name: 'modal-store',
        partialize: (state) => ({
          // Only persist configuration, not modal content
          closeOnOverlayClick: state.closeOnOverlayClick,
          closeOnEsc: state.closeOnEsc,
          trapFocus: state.trapFocus,
          restoreFocus: state.restoreFocus
        }),
        version: 1
      })
    ));
  } else {
    storeConfig = storeConfig as StateCreator<ModalState & ModalStoreActions>;
  }

  return create<ModalState & ModalStoreActions & ModalStoreSelectors>()(...middleware)(storeConfig);
};

// Export the store instance
export const useModalStore = createModalStore();