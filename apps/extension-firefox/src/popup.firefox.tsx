import { createRoot } from 'react-dom/client';
import { PopupRoot } from '@ext/core/popup';
import React from 'react';

const container = document.getElementById('app');

if (container) {
  createRoot(container).render(
    <React.StrictMode>
      <PopupRoot target="firefox" />
    </React.StrictMode>
  );
}
