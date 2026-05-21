const { initializeApp } = require('firebase-admin/app');

// Initialize Admin SDK once
initializeApp();

// Re-export compiled TypeScript functions from lib/index.js
const tsFunctions = require('./lib/index');
Object.assign(exports, tsFunctions);
