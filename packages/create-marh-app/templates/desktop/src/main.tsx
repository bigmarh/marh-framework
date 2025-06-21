import { m } from '@marh/core';
import { App } from './App';
import { initializeRouter } from './router';
import './style.css';

// Mount the router instead of the App component directly
m.mount(document.getElementById('app') as Element, App);
initializeRouter();