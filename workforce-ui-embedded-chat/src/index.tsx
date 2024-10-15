import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// create a root for the app
const div = document.createElement('div');
div.id = 'workforce-chat-root';
document.body.appendChild(div);

const root = ReactDOM.createRoot(
  document.getElementById('workforce-chat-root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
// reportWebVitals();
