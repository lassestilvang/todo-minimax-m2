/**
 * DOM Environment Setup for Component Tests
 * Provides proper DOM environment setup for React component testing
 */

// Setup DOM environment for testing
if (typeof window === 'undefined') {
  // Define document if it doesn't exist
  if (typeof document === 'undefined') {
    global.document = {
      createElement: (tag: string) => ({
        tagName: tag.toUpperCase(),
        classList: {
          add: () => {},
          remove: () => {},
          toggle: () => {},
          contains: () => false,
        },
        style: {},
        dataset: {},
        attributes: {},
        children: [],
        textContent: '',
        innerHTML: '',
        outerHTML: '',
        parentElement: null,
        nextElementSibling: null,
        previousElementSibling: null,
        querySelector: () => null,
        querySelectorAll: () => [],
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => true,
        getAttribute: () => null,
        setAttribute: () => {},
        removeAttribute: () => {},
        hasAttribute: () => false,
      }),
      createTextNode: (text: string) => ({ textContent: text }),
      documentElement: {
        classList: {
          add: () => {},
          remove: () => {},
          toggle: () => {},
          contains: () => false,
        },
        style: {},
        attributes: {},
        getAttribute: () => null,
      },
      body: {
        appendChild: () => {},
        insertBefore: () => {},
        removeChild: () => {},
        children: [],
      },
      head: {
        appendChild: () => {},
        removeChild: () => {},
        children: [],
      },
      addEventListener: () => {},
      removeEventListener: () => {},
      getElementById: () => null,
      getElementsByClassName: () => [],
      getElementsByTagName: () => [],
      querySelector: () => null,
      querySelectorAll: () => [],
      createRange: () => ({
        getBoundingClientRect: () => ({ top: 0, left: 0, width: 0, height: 0 }),
        getClientRects: () => [],
      }),
      selection: {
        removeAllRanges: () => {},
        addRange: () => {},
      },
      createElementNS: () => ({}),
      createDocumentFragment: () => ({
        appendChild: () => {},
        insertBefore: () => {},
        children: [],
      }),
      implementation: {
        createHTMLDocument: () => ({}),
      },
      activeElement: null,
      defaultView: global.window,
      nodeType: 9,
      nodeName: '#document',
    } as any;
  }
  
  global.window = {
    document: global.document,
    localStorage: {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
    },
    sessionStorage: {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
    },
    location: {
      href: 'http://localhost:3000',
      protocol: 'http:',
      host: 'localhost:3000',
      hostname: 'localhost',
      port: '3000',
      pathname: '/',
      search: '',
      hash: '',
      origin: 'http://localhost:3000',
      assign: () => {},
      replace: () => {},
      reload: () => {},
    },
    history: {
      back: () => {},
      forward: () => {},
      go: () => {},
      pushState: () => {},
      replaceState: () => {},
      state: null,
    },
    matchMedia: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => {},
    }),
    open: () => null,
    close: () => {},
    print: () => {},
    alert: () => {},
    confirm: () => true,
    prompt: () => null,
    getComputedStyle: () => ({
      getPropertyValue: () => '',
      getPropertyPriority: () => '',
      setProperty: () => {},
      removeProperty: () => {},
    }),
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
  } as any;
}

// Setup console for testing
if (typeof console === 'undefined') {
  global.console = {
    log: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
    trace: () => {},
    table: () => {},
    group: () => {},
    groupEnd: () => {},
    time: () => {},
    timeEnd: () => {},
    timeLog: () => {},
    clear: () => {},
    count: () => {},
    countReset: () => {},
    assert: () => {},
    profile: () => {},
    profileEnd: () => {},
    dir: () => {},
    dirxml: () => {},
    markTimeline: () => {},
    timeline: () => {},
    timelineEnd: () => {},
    context: () => {},
  } as any;
}

// Setup requestAnimationFrame
if (typeof requestAnimationFrame === 'undefined') {
  global.requestAnimationFrame = (callback: FrameRequestCallback) => {
    return setTimeout(callback, 16) as any;
  };
}

// Setup cancelAnimationFrame
if (typeof cancelAnimationFrame === 'undefined') {
  global.cancelAnimationFrame = (id: number) => {
    clearTimeout(id);
  };
}

// Setup IntersectionObserver
if (typeof IntersectionObserver === 'undefined') {
  global.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as any;
}

// Setup ResizeObserver
if (typeof ResizeObserver === 'undefined') {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as any;
}

// Setup MutationObserver
if (typeof MutationObserver === 'undefined') {
  global.MutationObserver = class {
    observe() {}
    disconnect() {}
  } as any;
}

// Setup performance.now
if (typeof performance === 'undefined') {
  global.performance = {
    now: () => Date.now(),
    timeOrigin: Date.now(),
    navigation: {
      type: 0,
      redirectCount: 0,
      loadEventEnd: 0,
      loadEventStart: 0,
      domContentLoadedEventEnd: 0,
      domContentLoadedEventStart: 0,
      domInteractive: 0,
      domLoading: 0,
      responseEnd: 0,
      responseStart: 0,
      fetchStart: 0,
      connectEnd: 0,
      connectStart: 0,
      domainLookupEnd: 0,
      domainLookupStart: 0,
      redirectEnd: 0,
      redirectStart: 0,
      requestStart: 0,
      unloadEventEnd: 0,
      unloadEventStart: 0,
    } as PerformanceNavigation,
    timing: {
      navigationStart: 0,
      unloadEventStart: 0,
      unloadEventEnd: 0,
      redirectStart: 0,
      redirectEnd: 0,
      fetchStart: 0,
      domainLookupStart: 0,
      domainLookupEnd: 0,
      connectStart: 0,
      connectEnd: 0,
      secureConnectionStart: 0,
      requestStart: 0,
      responseStart: 0,
      responseEnd: 0,
      loadEventStart: 0,
      loadEventEnd: 0,
    } as PerformanceTiming,
    mark: () => {},
    measure: () => {},
    clearMarks: () => {},
    clearMeasures: () => {},
    getEntries: () => [],
    getEntriesByType: () => [],
    getEntriesByName: () => [],
  } as any;
}

// Setup URL.createObjectURL
if (typeof URL.createObjectURL === 'undefined') {
  global.URL.createObjectURL = () => 'blob:mock-url';
}

// Setup URL.revokeObjectURL
if (typeof URL.revokeObjectURL === 'undefined') {
  global.URL.revokeObjectURL = () => {};
}

// Setup Event constructor
if (typeof Event === 'undefined') {
  global.Event = class Event {
    constructor(type: string, options?: EventInit) {
      this.type = type;
      this.bubbles = options?.bubbles || false;
      this.cancelable = options?.cancelable || false;
      this.composed = options?.composed || false;
      this.currentTarget = null;
      this.eventPhase = 0;
      this.isTrusted = false;
      this.target = null;
      this.timeStamp = Date.now();
    }
    type: string;
    bubbles: boolean;
    cancelable: boolean;
    composed: boolean;
    currentTarget: EventTarget | null;
    eventPhase: number;
    isTrusted: boolean;
    target: EventTarget | null;
    timeStamp: number;
    cancelBubble: boolean = false;
    defaultPrevented: boolean = false;
    readonly returnValue: boolean = true;
    srcElement: EventTarget | null = null;
    composedPath(): EventTarget[] { return []; }
    initEvent(type: string, bubbles?: boolean, cancelable?: boolean): void {}
    preventDefault(): void { this.defaultPrevented = true; }
    stopImmediatePropagation(): void {}
    stopPropagation(): void {}
    static readonly AT_TARGET: number = 2;
    static readonly BUBBLING_PHASE: number = 3;
    static readonly CAPTURING_PHASE: number = 1;
    static readonly NONE: number = 0;
  } as any;
}

// Setup CustomEvent constructor
if (typeof CustomEvent === 'undefined') {
  global.CustomEvent = class CustomEvent extends Event {
    constructor(type: string, options?: CustomEventInit) {
      super(type, options);
      this.detail = options?.detail;
    }
    detail: any;
  } as any;
}

// Setup Element constructor if it doesn't exist
if (typeof Element === 'undefined') {
  (global as any).Element = class Element {
    tagName: string = '';
    classList: any = {
      add: () => {},
      remove: () => {},
      toggle: () => false,
      contains: () => false,
      item: () => null,
    };
    style: any = {
      getPropertyValue: () => '',
      setProperty: () => {},
      removeProperty: () => {},
      getPropertyPriority: () => '',
    };
    textContent: string = '';
    innerHTML: string = '';
    dataset: any = {};
    addEventListener() {}
    removeEventListener() {}
    dispatchEvent() { return true; }
    getAttribute() { return null; }
    setAttribute() {}
    removeAttribute() {}
    hasAttribute() { return false; }
    querySelector() { return null; }
    querySelectorAll() { return []; }
  } as any;
}

// Setup focus and blur events for elements
if (typeof Element !== 'undefined' && !Element.prototype.addEventListener) {
  Element.prototype.addEventListener = () => {};
  Element.prototype.removeEventListener = () => {};
  Element.prototype.dispatchEvent = () => true;
}

// Setup classList for elements
if (typeof Element !== 'undefined' && !Element.prototype.classList) {
  Object.defineProperty(Element.prototype, 'classList', {
    get: () => ({
      add: () => {},
      remove: () => {},
      toggle: () => false,
      contains: () => false,
      item: () => null,
    }),
  });
}

// Setup dataset for elements
if (typeof Element !== 'undefined' && !Element.prototype.dataset) {
  Object.defineProperty(Element.prototype, 'dataset', {
    get: () => ({}),
  });
}

// Setup style for elements
if (typeof Element !== 'undefined' && !Element.prototype.style) {
  Object.defineProperty(Element.prototype, 'style', {
    get: () => ({
      getPropertyValue: () => '',
      setProperty: () => {},
      removeProperty: () => {},
      getPropertyPriority: () => '',
    }),
  });
}

// Setup textContent for elements
if (typeof Element !== 'undefined' && !Element.prototype.textContent) {
  Object.defineProperty(Element.prototype, 'textContent', {
    get: () => '',
    set: () => {},
  });
}

// Setup innerHTML for elements
if (typeof Element !== 'undefined' && !Element.prototype.innerHTML) {
  Object.defineProperty(Element.prototype, 'innerHTML', {
    get: () => '',
    set: () => {},
  });
}

// Setup document object properly
if (typeof document !== 'undefined' && !document.defaultView) {
  Object.defineProperty(document, 'defaultView', {
    get: () => global.window,
  });
}

export default {};