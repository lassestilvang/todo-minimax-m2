/**
 * React Mocks for Testing
 * Comprehensive React mocking for component tests
 */

// Mock React hooks
const mockUseState = (initial: any) => {
  const setter = () => {};
  return [initial, setter];
};

const mockUseEffect = () => {};
const mockUseCallback = (fn: any) => fn;
const mockUseMemo = (fn: any) => fn();
const mockUseRef = () => ({ current: null });
const mockUseContext = (context: any) => context._currentValue;
const mockUseReducer = (reducer: any, initial: any) => [initial, () => {}];

// Mock React hooks object
const mockReactHooks = {
  useState: mockUseState,
  useEffect: mockUseEffect,
  useCallback: mockUseCallback,
  useMemo: mockUseMemo,
  useRef: mockUseRef,
  useContext: mockUseContext,
  useReducer: mockUseReducer,
};

// Mock React Fiber
const mockFiber = {
  memoizedState: null,
  next: null,
  child: null,
  sibling: null,
  return: null,
  type: null,
  key: null,
  elementType: null,
  tag: 0,
  effectTag: null,
  alternate: null,
  actualDuration: 0,
  actualStartTime: -1,
  selfBaseDuration: 0,
  treeBaseDuration: 0,
  index: 0,
};

// Mock dispatcher
const mockDispatcher = {
  useState: mockUseState,
  useEffect: mockUseEffect,
  useCallback: mockUseCallback,
  useMemo: mockUseMemo,
  useRef: mockUseRef,
  useContext: mockUseContext,
  useReducer: mockUseReducer,
};

// Set up global React mocks
(global as any).React = {
  ...mockReactHooks,
  createElement: (type: any, props: any, ...children: any[]) => ({
    type,
    props,
    children,
  }),
  Fragment: 'React.Fragment',
  StrictMode: 'React.StrictMode',
  createContext: (defaultValue: any) => ({
    _currentValue: defaultValue,
    Provider: ({ children, value }: any) => children,
    Consumer: ({ children }: any) => children(),
  }),
};

// Set up global React DOM mocks
(global as any).ReactDOM = {
  render: () => {},
  hydrate: () => {},
  findDOMNode: () => null,
  unmountComponentAtNode: () => {},
};

// Set up global hooks dispatcher
(global as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
  isDisabled: true,
  supportsFiber: true,
};

// Set up global React internals for hooks
(global as any).ReactCurrentDispatcher = {
  current: mockDispatcher,
};

(global as any).ReactCurrentOwner = {
  current: mockFiber,
};

// Set up global hooks for React 18
(global as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = {
  ReactCurrentDispatcher: {
    current: mockDispatcher,
  },
  ReactCurrentOwner: {
    current: mockFiber,
  },
};

// Mock ReactTestUtils for better component testing
(global as any).ReactTestUtils = {
  renderIntoDocument: () => {},
  isDOMComponent: () => false,
  isCompositeComponent: () => true,
  isCompositeComponentElement: () => true,
};

export default mockReactHooks;