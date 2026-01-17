import { useState, useCallback, useRef } from 'react';
import { message } from 'antd';
import { supabase } from '../../lib/supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface ExportJobResult {
  success: boolean;
  fileUrl?: string;
  fileName?: string;
  error?: string;
}

interface JobStatusResponse {
  found: boolean;
  jobId?: string;
  state?: 'completed' | 'failed' | 'active' | 'waiting' | 'delayed';
  progress?: number;
  result?: ExportJobResult | null;
  error?: string | null;
}

interface UseExportTenderReturn {
  /** Start export process */
  startExport: (tenderId: string) => Promise<void>;
  /** Whether export is in progress */
  exporting: boolean;
  /** Current progress (0-100) */
  progress: number;
  /** Current job ID if any */
  jobId: string | null;
  /** Cancel the current export */
  cancelExport: () => void;
  /** Error message if any */
  error: string | null;
}

/**
 * Hook for exporting tender data to Excel
 * Uses the backend service for heavy processing
 */
export function useExportTender(): UseExportTenderReturn {
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Ref for cancellation
  const cancelledRef = useRef(false);
  const pollTimeoutRef = useRef<number | null>(null);

  const cancelExport = useCallback(() => {
    cancelledRef.current = true;
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
    setExporting(false);
    setProgress(0);
    setJobId(null);
  }, []);

  const startExport = useCallback(async (tenderId: string) => {
    cancelledRef.current = false;
    setExporting(true);
    setProgress(0);
    setError(null);

    try {
      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      // Start export job
      const response = await fetch(`${API_URL}/exports/tender/${tenderId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success || !data.jobId) {
        throw new Error(data.message || 'Failed to start export');
      }

      setJobId(data.jobId);

      // Poll for job status
      const pollStatus = async () => {
        if (cancelledRef.current) return;

        try {
          const statusRes = await fetch(`${API_URL}/jobs/${data.jobId}/status`, {
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
            },
          });

          if (!statusRes.ok) {
            throw new Error(`Status check failed: ${statusRes.status}`);
          }

          const status: JobStatusResponse = await statusRes.json();

          if (cancelledRef.current) return;

          setProgress(status.progress || 0);

          if (status.state === 'completed') {
            setExporting(false);
            setProgress(100);

            if (status.result?.success && status.result.fileUrl) {
              message.success('Экспорт завершён');
              // Open file in new tab
              window.open(status.result.fileUrl, '_blank');
            } else {
              throw new Error(status.result?.error || 'Export completed but no file URL');
            }
          } else if (status.state === 'failed') {
            throw new Error(status.error || 'Export failed');
          } else {
            // Still processing, poll again
            pollTimeoutRef.current = window.setTimeout(pollStatus, 1000);
          }
        } catch (err) {
          if (!cancelledRef.current) {
            const errMsg = err instanceof Error ? err.message : 'Unknown error';
            setError(errMsg);
            message.error(`Ошибка экспорта: ${errMsg}`);
            setExporting(false);
          }
        }
      };

      // Start polling
      pollTimeoutRef.current = window.setTimeout(pollStatus, 500);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errMsg);
      message.error(`Ошибка запуска экспорта: ${errMsg}`);
      setExporting(false);
    }
  }, []);

  return {
    startExport,
    exporting,
    progress,
    jobId,
    cancelExport,
    error,
  };
}
