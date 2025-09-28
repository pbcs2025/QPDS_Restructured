import React from 'react';
import ReactDOM from 'react-dom/client';  // ✅ changed import
import 'semantic-ui-css/semantic.min.css';
import Main from './common/Main';


const root = ReactDOM.createRoot(document.getElementById('root'));  // ✅ createRoot instead of render
root.render(
  <React.StrictMode>
    <Main />
  </React.StrictMode>
);
