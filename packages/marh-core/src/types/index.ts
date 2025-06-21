import type { ComponentTypes, Vnode, Children } from 'mithril';

// Base component interface extending Mithril's ComponentTypes
export interface MarhComponent<Attrs = {}> {
  oninit?(vnode: Vnode<Attrs>): void;
  oncreate?(vnode: Vnode<Attrs>): void;
  onupdate?(vnode: Vnode<Attrs>): void;
  onbeforeremove?(vnode: Vnode<Attrs>): Promise<any> | void;
  onremove?(vnode: Vnode<Attrs>): void;
  onbeforeupdate?(vnode: Vnode<Attrs>, old: Vnode<Attrs>): boolean | void;
  view(vnode: Vnode<Attrs>): Children;
}

// Props interface for typed components
export interface ComponentProps {
  [key: string]: any;
}

// Route definition types
export interface RouteConfig {
  path: string;
  component: ComponentTypes;
  title?: string;
  meta?: Record<string, any>;
}

// Application configuration
export interface AppConfig {
  title?: string;
  version?: string;
  routes?: RouteConfig[];
  theme?: 'light' | 'dark' | 'auto';
}

// Event handler types
export type EventHandler<T = Event> = (event: T) => void;
export type AsyncEventHandler<T = Event> = (event: T) => Promise<void>;

// State management types
export interface Store<T = any> {
  state: T;
  setState: (newState: Partial<T>) => void;
  getState: () => T;
  subscribe: (listener: (state: T) => void) => () => void;
}

// Form types
export interface FormField<T = any> {
  value: T;
  error?: string;
  touched?: boolean;
  dirty?: boolean;
}

export interface FormState<T extends Record<string, any> = {}> {
  fields: { [K in keyof T]: FormField<T[K]> };
  isValid: boolean;
  isSubmitting: boolean;
}

// API response types
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  status: number;
  headers?: Record<string, string>;
}

// Database types
export interface DatabaseRecord {
  id: string | number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
  where?: Record<string, any>;
}

// Utility types for better DX
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? never : K;
}[keyof T];
export type OptionalKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? K : never;
}[keyof T];