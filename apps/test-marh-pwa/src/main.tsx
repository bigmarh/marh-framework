import { m } from '@marh/core';
import { App } from './App';
import { initializeRouter } from './router';
import { registerSW } from './registerSW';
import './style.css';

// Mount the router instead of the App component directly
m.mount(document.getElementById('app') as Element, App);
initializeRouter();

// Register service worker for PWA functionality
registerSW();