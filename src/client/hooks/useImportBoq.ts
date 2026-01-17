import { useState, useCallback, useRef } from 'react';
import { message } from 'antd';
import { supabase } from '../../lib/supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface ImportJobResult {
  success: boolean;
  importedCount: number;
  errors: string[];
}

interface JobStatusResponse {
  found: boolean;
  jobId?: string;
  state?: 'completed' | 'failed' | 'active' | 'waiting' | 'delayed';
  progress?: number;
  result?: ImportJobResult | null;
  error?: string | null;
}

interface UseImportBoqReturn {
  /** Start import process */
  startImport: (file: File, tenderId: string, positionId: string) => Promise<void>;
  /** Whether import is in progress */
  importing: boolean;
  /** Current progress (0-100) */
  progress: number;
  /** Current job ID if any */
  jobId: string | null;
  /** Cancel the current import */
  cancelImport: () => void;
  /** Import result when completed */
  result: ImportJobResult | null;
  /** Error message if any */
  error: string | null;
}

/**
 * Hook for importing BOQ items from Excel
 * Uses the backend service for heavy processing
 */
export function useImportBoq(): UseImportBoqReturn {
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [jobId, setJobId] = useState<string | null>(null);
  const [result, setResult] = useState<ImportJobResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Ref for cancellation
  const cancelledRef = useRef(false);
  const pollTimeoutRef = useRef<number | null>(null);

  const cancelImport = useCallback(() => {
    cancelledRef.current = true;
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
    setImporting(false);
    setProgress(0);
    setJobId(null);
  }, []);

  const startImport = useCallback(async (
    file: File,
    tenderId: string,
    positionId: string,
  ) => {
    cancelledRef.current = false;
    setImporting(true);
    setProgress(0);
    setError(null);
    setResult(null);

    try {
      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      // Create form data
      const formData = new FormData();
      formData.append('file', file);
      formData.append('tenderId', tenderId);
      formData.append('positionId', positionId);

      // Start import job
      const response = await fetch(`${API_URL}/imports/boq`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success || !data.jobId) {
        throw new Error(data.message || 'Failed to start import');
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
            setImporting(false);
            setProgress(100);

            if (status.result) {
              setResult(status.result);

              if (status.result.success) {
                message.success(
                  `Импорт завершён: ${status.result.importedCount} элементов добавлено`,
                );
              } else {
                const errCount = status.result.errors.length;
                message.warning(
                  `Импорт завершён с ошибками: ${status.result.importedCount} добавлено, ${errCount} ошибок`,
                );
              }
            }
          } else if (status.state === 'failed') {
            throw new Error(status.error || 'Import failed');
          } else {
            // Still processing, poll again
            pollTimeoutRef.current = window.setTimeout(pollStatus, 1000);
          }
        } catch (err) {
          if (!cancelledRef.current) {
            const errMsg = err instanceof Error ? err.message : 'Unknown error';
            setError(errMsg);
            message.error(`Ошибка импорта: ${errMsg}`);
            setImporting(false);
          }
        }
      };

      // Start polling
      pollTimeoutRef.current = window.setTimeout(pollStatus, 500);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errMsg);
      message.error(`Ошибка запуска импорта: ${errMsg}`);
      setImporting(false);
    }
  }, []);

  return {
    startImport,
    importing,
    progress,
    jobId,
    cancelImport,
    result,
    error,
  };
}
