import { configureStore } from '@reduxjs/toolkit';
import languageReducer from './features/languageSlice';
import emailPromptingReducer from './features/emailPromptingSlice';
import emailResponseReducer from './features/emailResponseSlice';
import bookingReducer from './features/bookingSlice';

export const store = configureStore({
  reducer: {
    language: languageReducer,
    emailPrompting: emailPromptingReducer,
    emailResponse: emailResponseReducer,
    booking: bookingReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;