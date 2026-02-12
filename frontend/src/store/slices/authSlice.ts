import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  country: string;
  department?: string;
  project_id?: number | null;
  team_id?: number | null;
  layer?: string | null;
  is_active: boolean;
  last_activity?: string | null;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  sessionActive: boolean;
}

const initialState: AuthState = {
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: false,
  loading: false,
  sessionActive: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<{ user: User; token: string }>) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.sessionActive = true;
      localStorage.setItem('token', action.payload.token);
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.sessionActive = false;
      localStorage.removeItem('token');
    },
    updateUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    updateSessionStatus: (state, action: PayloadAction<boolean>) => {
      state.sessionActive = action.payload;
    },
  },
});

export const { setCredentials, logout, updateUser, setLoading, updateSessionStatus } = authSlice.actions;
export default authSlice.reducer;
