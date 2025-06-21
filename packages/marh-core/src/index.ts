import m from 'mithril';

// Re-export mithril for convenience
export { default as m } from 'mithril';

// Re-export specific mithril types and functions we need
export type {
  Vnode,
  VnodeDOM,
  Component as MithrilComponent,
  ClassComponent,
  ClosureComponent,
  ComponentTypes,
  Children,
  Child,
  Attributes,
  CVnode,
  CVnodeDOM
} from 'mithril';

// Export all MARH modules
export { Router } from './router';
export { useAsync, useAsyncCallback, createAsyncState } from './hooks/useAsync';
export { IPC, TypedIPC } from './services/ipc';
export * from './types';
export * from './platform';
export { getStorage, setStorage, resetStorage } from './services/storage.factory';
export type { StorageService } from './services/storage';
export { JsxUtils } from './utils/jsx-converter';
export { Store, createStore } from './stores/base.store';

// JSX Runtime functions for react-jsx transform
export function jsx(type: any, props: any, key?: any): m.Vnode {
  const { children, ...attrs } = props || {};
  if (key !== undefined) {
    attrs.key = key;
  }
  return m(type, attrs, children);
}

export function jsxs(type: any, props: any, key?: any): m.Vnode {
  return jsx(type, props, key);
}

export function Fragment(props: { children?: any }): any {
  return props.children;
}

// Type definitions for MARH components
export interface MarhComponentAttrs {
  [key: string]: any;
}

export interface MarhComponent<Attrs = MarhComponentAttrs> extends m.Component<Attrs> {}

// Base component class for class-based components
export abstract class Component<Attrs = MarhComponentAttrs> implements m.ClassComponent<Attrs> {
  abstract view(vnode: m.Vnode<Attrs>): m.Children;
  
  oninit?(vnode: m.Vnode<Attrs>): void;
  oncreate?(vnode: m.VnodeDOM<Attrs>): void;
  onbeforeupdate?(vnode: m.Vnode<Attrs>, old: m.VnodeDOM<Attrs>): boolean | void;
  onupdate?(vnode: m.VnodeDOM<Attrs>): void;
  onbeforeremove?(vnode: m.VnodeDOM<Attrs>): Promise<any> | void;
  onremove?(vnode: m.VnodeDOM<Attrs>): void;
}

// Helper for creating functional components with proper typing
export function createComponent<Attrs = MarhComponentAttrs>(
  component: m.ClosureComponent<Attrs>
): m.ClosureComponent<Attrs> {
  return component;
}

// JSX namespace for TypeScript
declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
    
    interface Element extends m.Vnode<any, any> {}
    
    interface ElementChildrenAttribute {
      children: {};
    }
  }
}