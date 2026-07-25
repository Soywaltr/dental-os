// src/utils/appContext.js
// Separado de App.jsx porque Fast Refresh exige que un archivo de componente
// solo exporte componentes — un context/hook exportado ahí rompe el HMR.
import { createContext, useContext } from 'react';

export const AppContext = createContext(null);
export const useAppContext = () => useContext(AppContext);
