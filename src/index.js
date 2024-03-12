import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

import WalletProvider from "./components/WalletProvider";
import App from './App';
import theme from './theme';

const rootElement = document.getElementById('root');
const root = ReactDOM.createRoot(rootElement);

root.render(
    <ThemeProvider theme={theme}>
        <WalletProvider>
            <CssBaseline />
            <BrowserRouter>
                <App />
            </BrowserRouter>
        </WalletProvider>
    </ThemeProvider>,
);
