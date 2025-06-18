import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/_variables.css';
import './styles/global.css';
import './styles/layout.css';
import './styles/accessibility.css';
import './styles/emergency.css';
import './styles/tooltips.css';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
