'use client';

import { useCallback } from 'react';

/**
 * Custom hook for View Transition API support
 * Provides smooth transitions between views with fallback support
 */
export function useViewTransition() {
  // Check if View Transition API is supported
  const supportsViewTransition = typeof document !== 'undefined' && 'startViewTransition' in document;

  /**
   * Execute a function with view transition
   * @param callback - Function to execute during the transition
   * @returns The result of the callback function or Promise for async operations
   */
  const withViewTransition = useCallback(<T>(callback: () => T): T | Promise<T> => {
    if (supportsViewTransition) {
      return document.startViewTransition(callback);
    }
    // Fallback: execute without transition
    return callback();
  }, [supportsViewTransition]);

  /**
   * Get transition names for CSS animations
   * @param viewName - Name of the view for transition targeting
   * @returns Object with transition names for old and new states
   */
  const getTransitionNames = useCallback((viewName: string) => {
    return {
      old: `view-out-${viewName}`,
      new: `view-in-${viewName}`,
    };
  }, []);

  /**
   * Apply view transition styles
   * @param element - DOM element to apply transition styles to
   * @param transitionName - Name of the transition
   * @param phase - 'old' or 'new' transition phase
   */
  const applyTransitionStyles = useCallback((
    element: HTMLElement, 
    transitionName: string, 
    phase: 'old' | 'new'
  ) => {
    element.style.viewTransitionName = transitionName;
    
    if (phase === 'old') {
      element.style.animation = 'view-out 0.3s ease-in-out';
    } else {
      element.style.animation = 'view-in 0.3s ease-in-out';
    }
  }, []);

  /**
   * Clean up transition styles
   * @param element - DOM element to clean up
   */
  const cleanupTransitionStyles = useCallback((element: HTMLElement) => {
    element.style.viewTransitionName = '';
    element.style.animation = '';
  }, []);

  /**
   * Create transition classes for different view types
   */
  const getTransitionClasses = useCallback(() => {
    return {
      // View transition classes
      fade: 'view-fade-transition',
      slide: 'view-slide-transition',
      slideUp: 'view-slide-up-transition',
      slideDown: 'view-slide-down-transition',
      
      // View-specific classes
      today: 'view-today-transition',
      next7: 'view-next7-transition',
      upcoming: 'view-upcoming-transition',
      all: 'view-all-transition',
      
      // List transition classes
      list: 'view-list-transition',
      modal: 'view-modal-transition',
    };
  }, []);

  return {
    supportsViewTransition,
    withViewTransition,
    getTransitionNames,
    applyTransitionStyles,
    cleanupTransitionStyles,
    getTransitionClasses,
  };
}