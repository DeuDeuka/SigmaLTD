// redux/store.js

import { createStore, combineReducers } from 'redux';

// Theme reducer
const initialThemeState = {
  current: 'dark',
  colors: {
    light: { background: '#fff', text: '#000', border: '#ccc' },
    dark: { background: '#000', text: '#fff', border: '#666' },
  },
};

const themeReducer = (state = initialThemeState, action) => {
  switch (action.type) {
    case 'SET_THEME':
      return { ...state, current: action.payload };
    default:
      return state;
  }
};

const rootReducer = combineReducers({
  theme: themeReducer,
});

export const store = createStore(rootReducer);

export const setTheme = (theme) => ({
  type: 'SET_THEME',
  payload: theme,
});