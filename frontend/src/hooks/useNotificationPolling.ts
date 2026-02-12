import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../store/store';
import { fetchUnreadCount } from '../store/slices/notificationSlice';

const POLL_INTERVAL = 15_000; // 15 seconds

export function useNotificationPolling() {
  const dispatch = useDispatch<AppDispatch>();
  const isAuthenticated = useSelector((s: RootState) => !!s.auth.token);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    // Fetch immediately on mount
    dispatch(fetchUnreadCount());

    // Poll every 15s
    intervalRef.current = setInterval(() => {
      dispatch(fetchUnreadCount());
    }, POLL_INTERVAL);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isAuthenticated, dispatch]);
}
