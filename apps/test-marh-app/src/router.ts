import { Router } from '@marh/core';
import { Home } from './pages/Home';
import { Users } from './pages/Users';

export const routes = {
  '/': Home,
  '/home': Home,
  '/users': Users
};

export function initializeRouter(): void {
  Router.route(document.getElementById('app')!, '/', routes);
}

export { Router };