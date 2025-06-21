import m from 'mithril';

export interface RouteOptions {
  onmatch?: (args: any, requestedPath: string, route: string) => any;
  render?: (vnode: m.Vnode) => m.Children;
}

export interface RouteResolver {
  component?: m.ComponentTypes;
  view?: (vnode: m.Vnode) => m.Children;
  onmatch?: (args: any, requestedPath: string, route: string) => any;
  render?: (vnode: m.Vnode) => m.Children;
}

export type RouteDefinition = m.ComponentTypes | RouteResolver;

export class Router {
  static route(
    element: Element,
    defaultRoute: string,
    routes: Record<string, RouteDefinition>
  ): void {
    m.route(element, defaultRoute, routes);
  }

  static set(route: string, data?: any): void {
    m.route.set(route, data);
  }

  static get(): string {
    return m.route.get();
  }

  static param(key: string): string | undefined {
    return m.route.param(key);
  }

  static buildPath(
    template: string,
    params?: Record<string, string | number>
  ): string {
    let path = template;
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        path = path.replace(`:${key}`, String(value));
      });
    }
    return path;
  }

  static navigate(path: string): void {
    m.route.set(path);
  }
}