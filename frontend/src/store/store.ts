import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import projectReducer from './slices/projectSlice';
import userReducer from './slices/userSlice';
import dashboardReducer from './slices/dashboardSlice';
import workflowReducer from './slices/workflowSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    project: projectReducer,
    user: userReducer,
    dashboard: dashboardReducer,
    workflow: workflowReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
