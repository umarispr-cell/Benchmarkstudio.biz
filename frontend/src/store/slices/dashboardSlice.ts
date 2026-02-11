import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface DashboardStats {
  total_staff: number;
  active_staff: number;
  required_staff: number;
  absentees: number;
  total_teams: number;
  active_teams: number;
  total_orders: number;
  completed_orders: number;
  pending_orders: number;
  orders_in_progress: number;
  daily_target: number;
  achieved_target: number;
  target_percentage: number;
  overtime_hours: number;
  undertime_hours: number;
  productivity_rate: number;
}

export interface CountryStats extends DashboardStats {
  country: string;
  departments: DepartmentStats[];
}

export interface DepartmentStats extends DashboardStats {
  department: string;
  projects: ProjectStats[];
}

export interface ProjectStats extends DashboardStats {
  project_id: number;
  project_name: string;
  project_code: string;
  layer_stats: LayerStats[];
}

export interface LayerStats {
  layer: string;
  orders: number;
  completed: number;
  pending: number;
  staff_count: number;
}

interface DashboardState {
  global: DashboardStats | null;
  countries: CountryStats[];
  loading: boolean;
  error: string | null;
}

const initialState: DashboardState = {
  global: null,
  countries: [],
  loading: false,
  error: null,
};

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    setGlobalStats: (state, action: PayloadAction<DashboardStats>) => {
      state.global = action.payload;
      state.loading = false;
    },
    setCountryStats: (state, action: PayloadAction<CountryStats[]>) => {
      state.countries = action.payload;
      state.loading = false;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.loading = false;
    },
  },
});

export const { setGlobalStats, setCountryStats, setLoading, setError } = dashboardSlice.actions;
export default dashboardSlice.reducer;
