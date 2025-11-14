import { createRoot } from 'react-dom/client';
import React from 'react';
import { OptionsRoot } from '@ext/core/options';

const container = document.getElementById('app') || document.body.appendChild(document.createElement('div'));

if (container) {
  createRoot(container).render(
    <React.StrictMode>
      <OptionsRoot />
    </React.StrictMode>
  );
}
