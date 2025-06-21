import { Router } from '@marh/core';
import { Home } from './pages/Home';

export const routes = {
  '/': Home,
  '/home': Home
};

export function initializeRouter(): void {
  Router.route(document.getElementById('app')!, '/', routes);
}

export { Router };