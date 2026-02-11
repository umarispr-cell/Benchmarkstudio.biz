import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface Order {
  id: number;
  order_number: string;
  project_id: number;
  client_reference: string;
  current_layer: string;
  status: 'pending' | 'in-progress' | 'completed' | 'on-hold';
  assigned_to?: number;
  team_id?: number;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  received_at: string;
  started_at?: string;
  completed_at?: string;
  metadata: any;
}

export interface WorkQueue {
  layer: string;
  orders: Order[];
  total: number;
}

interface WorkflowState {
  queues: WorkQueue[];
  currentOrder: Order | null;
  loading: boolean;
  error: string | null;
}

const initialState: WorkflowState = {
  queues: [],
  currentOrder: null,
  loading: false,
  error: null,
};

const workflowSlice = createSlice({
  name: 'workflow',
  initialState,
  reducers: {
    setQueues: (state, action: PayloadAction<WorkQueue[]>) => {
      state.queues = action.payload;
      state.loading = false;
    },
    setCurrentOrder: (state, action: PayloadAction<Order | null>) => {
      state.currentOrder = action.payload;
    },
    updateOrderStatus: (state, action: PayloadAction<{ orderId: number; status: string; layer?: string }>) => {
      state.queues.forEach(queue => {
        const order = queue.orders.find(o => o.id === action.payload.orderId);
        if (order) {
          order.status = action.payload.status as any;
          if (action.payload.layer) {
            order.current_layer = action.payload.layer;
          }
        }
      });
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

export const { setQueues, setCurrentOrder, updateOrderStatus, setLoading, setError } = workflowSlice.actions;
export default workflowSlice.reducer;
