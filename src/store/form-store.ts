/**
 * FormStore - Comprehensive form state management
 * Handles multiple forms, auto-save, validation, and form state persistence
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { persist } from 'zustand/middleware';
import type { 
  FormStore as IFormStore,
  FormStoreState,
  FormStoreActions,
  FormStoreSelectors,
  TaskFormConfig,
  ListFormConfig,
  LabelFormConfig
} from '../types/store';
import type {
  TaskFormData,
  ListFormData,
  UserFormData,
  LabelFormData,
  TaskFormState,
  ListFormState,
  FormState,
  PasswordChangeFormData
} from '../../types/forms';
import type { ApiError } from '../../types/utils';
import { withErrorHandling, createRetryHandler } from '../middleware/error-handling';
import { createPersistConfig } from '../middleware/persistence';

/**
 * Form validation helpers
 */
const validateFormData = (data: any, validationRules: any = {}) => {
  const errors: Record<string, string> = {};
  const warnings: Record<string, string> = {};

  Object.entries(validationRules).forEach(([field, rules]) => {
    const value = data[field];
    const fieldRules = rules as any[];

    fieldRules.forEach((rule) => {
      switch (rule.type) {
        case 'required':
          if (!value || (typeof value === 'string' && !value.trim())) {
            errors[field] = rule.message;
          }
          break;
        case 'minLength':
          if (value && value.length < rule.value) {
            errors[field] = rule.message;
          }
          break;
        case 'maxLength':
          if (value && value.length > rule.value) {
            errors[field] = rule.message;
          }
          break;
        case 'pattern':
          if (value && !rule.value.test(value)) {
            errors[field] = rule.message;
          }
          break;
        case 'email':
          if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            errors[field] = rule.message;
          }
          break;
      }
    });
  });

  return { errors, warnings, isValid: Object.keys(errors).length === 0 };
};

/**
 * Auto-save functionality
 */
class AutoSaveManager {
  private timeouts: Map<string, NodeJS.Timeout> = new Map();
  private listeners: Map<string, Function[]> = new Map();

  schedule(formId: string, saveFn: Function, delay: number = 2000) {
    this.clear(formId);
    
    const timeoutId = setTimeout(() => {
      saveFn();
      this.notifyListeners(formId, 'saved');
    }, delay);
    
    this.timeouts.set(formId, timeoutId);
  }

  clear(formId: string) {
    const timeoutId = this.timeouts.get(formId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.timeouts.delete(formId);
    }
  }

  clearAll() {
    this.timeouts.forEach((timeoutId) => clearTimeout(timeoutId));
    this.timeouts.clear();
  }

  on(formId: string, event: 'saving' | 'saved' | 'error', listener: Function) {
    if (!this.listeners.has(formId)) {
      this.listeners.set(formId, []);
    }
    this.listeners.get(formId)!.push(listener);
  }

  private notifyListeners(formId: string, event: string) {
    const listeners = this.listeners.get(formId);
    if (listeners) {
      listeners.forEach(listener => listener(event));
    }
  }
}

/**
 * Create FormStore with comprehensive form management
 */
export const createFormStore = (config?: {
  errorHandling?: boolean;
  persistence?: boolean;
  devtools?: boolean;
  autoSaveDelay?: number;
}) => {
  const {
    errorHandling = true,
    persistence = true,
    devtools = process.env.NODE_ENV === 'development',
    autoSaveDelay = 2000
  } = config || {};

  const retryHandler = createRetryHandler({
    retryAttempts: 2,
    retryDelay: 500,
    onError: (error, storeName) => {
      console.error(`[${storeName}] Error:`, error);
    }
  });

  const autoSaveManager = new AutoSaveManager();

  // Initial state
  const initialState: FormStoreState = {
    // Task forms
    taskForms: {},
    currentTaskFormId: null,
    
    // List forms
    listForms: {},
    currentListFormId: null,
    
    // User forms
    userForm: null,
    passwordForm: null,
    
    // Label forms
    labelForms: {},
    currentLabelFormId: null,
    
    // General forms
    generalForms: {},
    currentGeneralFormId: null,
    
    // Auto-save state
    autoSaveEnabled: true,
    autoSaveInterval: autoSaveDelay,
    lastSaved: null,
    pendingSaves: new Set()
  };

  // Build store configuration
  let storeConfig = (set: any, get: any, api: any): FormStoreState & FormStoreActions => {
    const state = initialState;

    return {
      ...state,

      // =================== TASK FORM MANAGEMENT ===================
      createTaskForm: (id: string, initialData?: Partial<TaskFormData>, formConfig?: TaskFormConfig) => {
        const formState: TaskFormState = {
          id,
          data: {
            name: initialData?.name || '',
            description: initialData?.description || '',
            date: initialData?.date || null,
            deadline: initialData?.deadline || null,
            estimate: initialData?.estimate || '',
            priority: initialData?.priority || 'None',
            status: initialData?.status || 'todo',
            listId: initialData?.listId || '',
            labels: initialData?.labels || [],
            attachments: initialData?.attachments || [],
            subtasks: initialData?.subtasks || [],
            reminders: initialData?.reminders || [],
            ...initialData
          },
          errors: {},
          warnings: {},
          touched: {},
          isValid: false,
          isDirty: false,
          isSubmitting: false,
          isLoading: false,
          lastModified: new Date(),
          autoSaveEnabled: formConfig?.autoSave !== false,
          validationRules: formConfig?.validation || {},
          submitCount: 0
        };

        set((state: FormStoreState) => {
          state.taskForms[id] = formState;
          state.currentTaskFormId = id;
        }, false, 'createTaskForm');

        // Validate form
        get().validateTaskForm(id);

        return id;
      },

      updateTaskForm: (id: string, data: Partial<TaskFormData>) => {
        set((state: FormStoreState) => {
          const form = state.taskForms[id];
          if (form) {
            form.data = { ...form.data, ...data };
            form.isDirty = true;
            form.lastModified = new Date();
            
            // Mark fields as touched
            Object.keys(data).forEach(key => {
              form.touched[key] = true;
            });

            // Auto-save if enabled
            if (form.autoSaveEnabled && state.autoSaveEnabled) {
              get().scheduleSave(id, 'task');
            }
          }
        }, false, 'updateTaskForm');

        // Re-validate
        get().validateTaskForm(id);
      },

      deleteTaskForm: (id: string) => {
        autoSaveManager.clear(id);
        
        set((state: FormStoreState) => {
          delete state.taskForms[id];
          if (state.currentTaskFormId === id) {
            state.currentTaskFormId = null;
          }
        }, false, 'deleteTaskForm');
      },

      setCurrentTaskForm: (id: string | null) => {
        set((state: FormStoreState) => {
          state.currentTaskFormId = id;
        }, false, 'setCurrentTaskForm');
      },

      validateTaskForm: (id: string) => {
        set((state: FormStoreState) => {
          const form = state.taskForms[id];
          if (form) {
            const validation = validateFormData(form.data, form.validationRules);
            form.errors = validation.errors;
            form.warnings = validation.warnings;
            form.isValid = validation.isValid;
          }
        }, false, 'validateTaskForm');
      },

      // =================== LIST FORM MANAGEMENT ===================
      createListForm: (id: string, initialData?: Partial<ListFormData>, formConfig?: ListFormConfig) => {
        const formState: ListFormState = {
          id,
          data: {
            name: initialData?.name || '',
            color: initialData?.color || '#3B82F6',
            emoji: initialData?.emoji || '📋',
            isDefault: initialData?.isDefault || false,
            description: initialData?.description || '',
            settings: initialData?.settings || {},
            ...initialData
          },
          errors: {},
          warnings: {},
          touched: {},
          isValid: false,
          isDirty: false,
          isSubmitting: false,
          isLoading: false,
          lastModified: new Date(),
          autoSaveEnabled: formConfig?.autoSave !== false,
          validationRules: formConfig?.validation || {},
          submitCount: 0
        };

        set((state: FormStoreState) => {
          state.listForms[id] = formState;
          state.currentListFormId = id;
        }, false, 'createListForm');

        get().validateListForm(id);
        return id;
      },

      updateListForm: (id: string, data: Partial<ListFormData>) => {
        set((state: FormStoreState) => {
          const form = state.listForms[id];
          if (form) {
            form.data = { ...form.data, ...data };
            form.isDirty = true;
            form.lastModified = new Date();
            
            Object.keys(data).forEach(key => {
              form.touched[key] = true;
            });

            if (form.autoSaveEnabled && state.autoSaveEnabled) {
              get().scheduleSave(id, 'list');
            }
          }
        }, false, 'updateListForm');

        get().validateListForm(id);
      },

      deleteListForm: (id: string) => {
        autoSaveManager.clear(id);
        
        set((state: FormStoreState) => {
          delete state.listForms[id];
          if (state.currentListFormId === id) {
            state.currentListFormId = null;
          }
        }, false, 'deleteListForm');
      },

      setCurrentListForm: (id: string | null) => {
        set((state: FormStoreState) => {
          state.currentListFormId = id;
        }, false, 'setCurrentListForm');
      },

      validateListForm: (id: string) => {
        set((state: FormStoreState) => {
          const form = state.listForms[id];
          if (form) {
            const validation = validateFormData(form.data, form.validationRules);
            form.errors = validation.errors;
            form.warnings = validation.warnings;
            form.isValid = validation.isValid;
          }
        }, false, 'validateListForm');
      },

      // =================== USER FORM MANAGEMENT ===================
      initUserForm: (initialData: UserFormData) => {
        const formState: FormState<UserFormData> = {
          data: initialData,
          errors: {},
          warnings: {},
          touched: {},
          isValid: true,
          isDirty: false,
          isSubmitting: false,
          isLoading: false,
          lastModified: new Date(),
          autoSaveEnabled: true,
          validationRules: {},
          submitCount: 0
        };

        set((state: FormStoreState) => {
          state.userForm = formState;
        }, false, 'initUserForm');
      },

      updateUserForm: (data: Partial<UserFormData>) => {
        set((state: FormStoreState) => {
          if (state.userForm) {
            state.userForm.data = { ...state.userForm.data, ...data };
            state.userForm.isDirty = true;
            state.userForm.lastModified = new Date();
            
            Object.keys(data).forEach(key => {
              state.userForm!.touched[key] = true;
            });

            if (state.userForm.autoSaveEnabled && state.autoSaveEnabled) {
              get().scheduleSave('user', 'user');
            }
          }
        }, false, 'updateUserForm');
      },

      clearUserForm: () => {
        autoSaveManager.clear('user');
        
        set((state: FormStoreState) => {
          state.userForm = null;
        }, false, 'clearUserForm');
      },

      // =================== LABEL FORM MANAGEMENT ===================
      createLabelForm: (id: string, initialData?: Partial<LabelFormData>, formConfig?: LabelFormConfig) => {
        const formState: FormState<LabelFormData> = {
          data: {
            name: initialData?.name || '',
            icon: initialData?.icon || '🏷️',
            color: initialData?.color || '#6B7280',
            description: initialData?.description || '',
            ...initialData
          },
          errors: {},
          warnings: {},
          touched: {},
          isValid: false,
          isDirty: false,
          isSubmitting: false,
          isLoading: false,
          lastModified: new Date(),
          autoSaveEnabled: formConfig?.autoSave !== false,
          validationRules: formConfig?.validation || {},
          submitCount: 0
        };

        set((state: FormStoreState) => {
          state.labelForms[id] = formState;
          state.currentLabelFormId = id;
        }, false, 'createLabelForm');

        get().validateLabelForm(id);
        return id;
      },

      updateLabelForm: (id: string, data: Partial<LabelFormData>) => {
        set((state: FormStoreState) => {
          const form = state.labelForms[id];
          if (form) {
            form.data = { ...form.data, ...data };
            form.isDirty = true;
            form.lastModified = new Date();
            
            Object.keys(data).forEach(key => {
              form.touched[key] = true;
            });

            if (form.autoSaveEnabled && state.autoSaveEnabled) {
              get().scheduleSave(id, 'label');
            }
          }
        }, false, 'updateLabelForm');

        get().validateLabelForm(id);
      },

      deleteLabelForm: (id: string) => {
        autoSaveManager.clear(id);
        
        set((state: FormStoreState) => {
          delete state.labelForms[id];
          if (state.currentLabelFormId === id) {
            state.currentLabelFormId = null;
          }
        }, false, 'deleteLabelForm');
      },

      setCurrentLabelForm: (id: string | null) => {
        set((state: FormStoreState) => {
          state.currentLabelFormId = id;
        }, false, 'setCurrentLabelForm');
      },

      validateLabelForm: (id: string) => {
        set((state: FormStoreState) => {
          const form = state.labelForms[id];
          if (form) {
            const validation = validateFormData(form.data, form.validationRules);
            form.errors = validation.errors;
            form.warnings = validation.warnings;
            form.isValid = validation.isValid;
          }
        }, false, 'validateLabelForm');
      },

      // =================== AUTO-SAVE MANAGEMENT ===================
      enableAutoSave: (interval: number) => {
        set((state: FormStoreState) => {
          state.autoSaveEnabled = true;
          state.autoSaveInterval = interval;
        }, false, 'enableAutoSave');
      },

      disableAutoSave: () => {
        set((state: FormStoreState) => {
          state.autoSaveEnabled = false;
        }, false, 'disableAutoSave');
      },

      saveForm: async (formId: string, formType: 'task' | 'list' | 'label' | 'user') => {
        set((state: FormStoreState) => {
          state.pendingSaves.add(`${formType}:${formId}`);
        }, false, 'saveForm_start');

        try {
          await retryHandler(async () => {
            // Simulate auto-save to backend
            const formData = get().getFormData(formId, formType);
            if (formData) {
              // Here you would save to your backend
              console.log(`Auto-saving ${formType} form ${formId}:`, formData);
            }
          }, 'saveForm', 'FormStore');

          set((state: FormStoreState) => {
            state.pendingSaves.delete(`${formType}:${formId}`);
            state.lastSaved = new Date();
          }, false, 'saveForm_success');

        } catch (error) {
          set((state: FormStoreState) => {
            state.pendingSaves.delete(`${formType}:${formId}`);
          }, false, 'saveForm_error');
          throw error;
        }
      },

      scheduleSave: (formId: string, formType: 'task' | 'list' | 'label' | 'user') => {
        const state = get();
        if (state.autoSaveEnabled) {
          autoSaveManager.schedule(formId, () => {
            get().saveForm(formId, formType);
          }, state.autoSaveInterval);
        }
      },

      clearPendingSave: (formId: string) => {
        autoSaveManager.clear(formId);
        
        set((state: FormStoreState) => {
          // Remove any pending saves for this form
          const types: ('task' | 'list' | 'label' | 'user')[] = ['task', 'list', 'label', 'user'];
          types.forEach(type => {
            state.pendingSaves.delete(`${type}:${formId}`);
          });
        }, false, 'clearPendingSave');
      },

      // =================== GENERAL FORM MANAGEMENT ===================
      createGeneralForm: (id: string, initialData: Record<string, any>) => {
        const formState: FormState<Record<string, any>> = {
          data: initialData,
          errors: {},
          warnings: {},
          touched: {},
          isValid: true,
          isDirty: false,
          isSubmitting: false,
          isLoading: false,
          lastModified: new Date(),
          autoSaveEnabled: false,
          validationRules: {},
          submitCount: 0
        };

        set((state: FormStoreState) => {
          state.generalForms[id] = formState;
          state.currentGeneralFormId = id;
        }, false, 'createGeneralForm');
      },

      updateGeneralForm: (id: string, data: Record<string, any>) => {
        set((state: FormStoreState) => {
          const form = state.generalForms[id];
          if (form) {
            form.data = { ...form.data, ...data };
            form.isDirty = true;
            form.lastModified = new Date();
            
            Object.keys(data).forEach(key => {
              form.touched[key] = true;
            });
          }
        }, false, 'updateGeneralForm');
      },

      deleteGeneralForm: (id: string) => {
        set((state: FormStoreState) => {
          delete state.generalForms[id];
          if (state.currentGeneralFormId === id) {
            state.currentGeneralFormId = null;
          }
        }, false, 'deleteGeneralForm');
      },

      setCurrentGeneralForm: (id: string | null) => {
        set((state: FormStoreState) => {
          state.currentGeneralFormId = id;
        }, false, 'setCurrentGeneralForm');
      },

      // =================== UTILITY METHODS ===================
      getFormData: (formId: string, formType: 'task' | 'list' | 'label' | 'user') => {
        const state = get();
        switch (formType) {
          case 'task':
            return state.taskForms[formId]?.data;
          case 'list':
            return state.listForms[formId]?.data;
          case 'label':
            return state.labelForms[formId]?.data;
          case 'user':
            return state.userForm?.data;
          default:
            return null;
        }
      },

      getFormState: (formId: string, formType: 'task' | 'list' | 'label' | 'user') => {
        const state = get();
        switch (formType) {
          case 'task':
            return state.taskForms[formId];
          case 'list':
            return state.listForms[formId];
          case 'label':
            return state.labelForms[formId];
          case 'user':
            return state.userForm;
          default:
            return null;
        }
      },

      clearAllForms: () => {
        autoSaveManager.clearAll();
        
        set((state: FormStoreState) => {
          state.taskForms = {};
          state.listForms = {};
          state.labelForms = {};
          state.generalForms = {};
          state.userForm = null;
          state.passwordForm = null;
          state.currentTaskFormId = null;
          state.currentListFormId = null;
          state.currentLabelFormId = null;
          state.currentGeneralFormId = null;
          state.pendingSaves.clear();
        }, false, 'clearAllForms');
      }
    };
  };

  // Apply middleware
  if (errorHandling) {
    storeConfig = withErrorHandling('FormStore', storeConfig, {
      retryAttempts: 2,
      logErrors: true
    });
  }

  let middleware = [subscribeWithSelector(), immer];

  if (persistence) {
    middleware.push(persist(
      storeConfig,
      createPersistConfig({
        name: 'form-store',
        partialize: (state) => ({
          // Don't persist form data to avoid storing sensitive information
          autoSaveEnabled: state.autoSaveEnabled,
          autoSaveInterval: state.autoSaveInterval
        }),
        version: 1
      })
    ));
  } else {
    storeConfig = storeConfig as StateCreator<FormStoreState & FormStoreActions>;
  }

  return create<FormStoreState & FormStoreActions & FormStoreSelectors>()(...middleware)(storeConfig);
};

// Export the store instance
export const useFormStore = createFormStore();