/**
 * FormStore - Simplified Zustand store for form state management
 */

import { create } from 'zustand';
import type { 
  FormStoreState,
  FormStoreActions
} from '../types/store';

/**
 * Create a simple form store
 */
export const createFormStore = () => {
  // Initial state
  const initialState: FormStoreState = {
    // Form data
    forms: {},
    
    // Validation
    validation: {},
    
    // Loading states
    submitting: {},
    
    // Errors
    errors: {}
  };

  return create<FormStoreState & FormStoreActions>((set, get) => ({
    ...initialState,

    // =================== FORM MANAGEMENT ===================
    setFormData: (formId, data) => {
      set((state) => {
        state.forms[formId] = {
          ...state.forms[formId],
          ...data
        };
      });
    },

    updateFormField: (formId, field, value) => {
      set((state) => {
        if (!state.forms[formId]) {
          state.forms[formId] = {};
        }
        state.forms[formId][field] = value;
      });
    },

    resetForm: (formId) => {
      set((state) => {
        delete state.forms[formId];
        delete state.validation[formId];
        delete state.submitting[formId];
        delete state.errors[formId];
      });
    },

    clearAllForms: () => {
      set((state) => {
        state.forms = {};
        state.validation = {};
        state.submitting = {};
        state.errors = {};
      });
    },

    // =================== VALIDATION ===================
    setFieldValidation: (formId, field, isValid, message = '') => {
      set((state) => {
        if (!state.validation[formId]) {
          state.validation[formId] = {};
        }
        state.validation[formId][field] = {
          isValid,
          message
        };
      });
    },

    setFormValidation: (formId, validation) => {
      set((state) => {
        state.validation[formId] = validation;
      });
    },

    clearValidation: (formId, field = null) => {
      set((state) => {
        if (field) {
          if (state.validation[formId]) {
            delete state.validation[formId][field];
          }
        } else {
          delete state.validation[formId];
        }
      });
    },

    // =================== LOADING STATES ===================
    setSubmitting: (formId, isSubmitting) => {
      set((state) => {
        state.submitting[formId] = isSubmitting;
      });
    },

    isFormSubmitting: (formId) => {
      return get().submitting[formId] || false;
    },

    // =================== ERRORS ===================
    setFormError: (formId, error) => {
      set((state) => {
        state.errors[formId] = error;
      });
    },

    clearFormError: (formId) => {
      set((state) => {
        delete state.errors[formId];
      });
    },

    setFieldError: (formId, field, error) => {
      set((state) => {
        if (!state.errors[formId]) {
          state.errors[formId] = {};
        }
        state.errors[formId][field] = error;
      });
    },

    clearFieldError: (formId, field) => {
      set((state) => {
        if (state.errors[formId]) {
          delete state.errors[formId][field];
        }
      });
    },

    // =================== UTILITIES ===================
    getFormData: (formId) => {
      return get().forms[formId] || {};
    },

    getFieldValidation: (formId, field) => {
      return get().validation[formId]?.[field] || { isValid: true, message: '' };
    },

    getFormErrors: (formId) => {
      return get().errors[formId] || {};
    },

    getFieldError: (formId, field) => {
      return get().errors[formId]?.[field] || '';
    },

    isFieldValid: (formId, field) => {
      return get().getFieldValidation(formId, field).isValid;
    },

    hasFormErrors: (formId) => {
      const errors = get().getFormErrors(formId);
      return Object.keys(errors).length > 0;
    },

    isFormValid: (formId) => {
      const validation = get().validation[formId] || {};
      return Object.values(validation).every(v => v.isValid);
    }
  }));
};

// Export the store instance
export const useFormStore = createFormStore();