import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface Project {
  id: number;
  code: string;
  name: string;
  country: string;
  department: string;
  client_name: string;
  status: 'active' | 'inactive' | 'completed';
  total_orders: number;
  completed_orders: number;
  pending_orders: number;
  total_teams: number;
  active_teams: number;
  total_staff: number;
  active_staff: number;
  workflow_layers: string[];
  created_at: string;
}

interface ProjectState {
  projects: Project[];
  currentProject: Project | null;
  loading: boolean;
  error: string | null;
}

const initialState: ProjectState = {
  projects: [],
  currentProject: null,
  loading: false,
  error: null,
};

const projectSlice = createSlice({
  name: 'project',
  initialState,
  reducers: {
    setProjects: (state, action: PayloadAction<Project[]>) => {
      state.projects = action.payload;
      state.loading = false;
    },
    setCurrentProject: (state, action: PayloadAction<Project>) => {
      state.currentProject = action.payload;
    },
    updateProject: (state, action: PayloadAction<Project>) => {
      const index = state.projects.findIndex(p => p.id === action.payload.id);
      if (index !== -1) {
        state.projects[index] = action.payload;
      }
      if (state.currentProject?.id === action.payload.id) {
        state.currentProject = action.payload;
      }
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

export const { setProjects, setCurrentProject, updateProject, setLoading, setError } = projectSlice.actions;
export default projectSlice.reducer;
