/**
 * useRealtimeJobs.ts
 *
 * Mounts exactly ONCE at the root layout level.
 * Wires all Socket.IO job/application events to Zustand store actions.
 *
 * Events handled:
 *  - new_job                    → prepend to feed with "New" badge
 *  - job_deleted                → remove from feed (animated by the component)
 *  - job_application_received   → increment provider's applicant count
 *  - application_status_updated → update seeker's application status
 */

import { useEffect, useCallback, useRef } from 'react';
import { useJobStore } from '../store/jobStore';
import { useApplicationStore } from '../store/applicationStore';
import socketClient from '../services/socketClient';

interface NewJobPayload {
  job: any;
  isNew: boolean;
}

interface JobDeletedPayload {
  jobId: string;
}

interface ApplicationReceivedPayload {
  jobId: string;
  applicantCount: number;
  application: any;
}

interface ApplicationStatusPayload {
  applicationId: string;
  jobId: string;
  status: string;
}

export function useRealtimeJobs() {
  const { prependToFeed, removeFromFeed, incrementApplicantCount } = useJobStore();
  const { myApplications } = useApplicationStore();
  const isMounted = useRef(true);

  const handleNewJob = useCallback((payload: NewJobPayload) => {
    if (!isMounted.current || !payload?.job) return;
    prependToFeed({ ...payload.job, _isNew: true }); // _isNew flag triggers animation
    console.log('[Realtime] New job received:', payload.job?.title);
  }, [prependToFeed]);

  const handleJobDeleted = useCallback((payload: JobDeletedPayload) => {
    if (!isMounted.current || !payload?.jobId) return;
    removeFromFeed(payload.jobId);
    console.log('[Realtime] Job deleted:', payload.jobId);
  }, [removeFromFeed]);

  const handleApplicationReceived = useCallback((payload: ApplicationReceivedPayload) => {
    if (!isMounted.current || !payload?.jobId) return;
    incrementApplicantCount(payload.jobId, payload.applicantCount);
    console.log('[Realtime] Application received for job:', payload.jobId);
  }, [incrementApplicantCount]);

  const handleApplicationStatusUpdated = useCallback((payload: ApplicationStatusPayload) => {
    if (!isMounted.current || !payload?.applicationId) return;
    // Update the seeker's local application status without a refetch
    useApplicationStore.setState((state) => ({
      myApplications: state.myApplications.map((app) =>
        app?.id === payload.applicationId
          ? { ...app, status: payload.status as any }
          : app
      ),
    }));
    console.log('[Realtime] Application status updated:', payload.applicationId, '->', payload.status);
  }, []);

  useEffect(() => {
    isMounted.current = true;

    socketClient.on<NewJobPayload>('new_job', handleNewJob);
    socketClient.on<JobDeletedPayload>('job_deleted', handleJobDeleted);
    socketClient.on<ApplicationReceivedPayload>('job_application_received', handleApplicationReceived);
    socketClient.on<ApplicationStatusPayload>('application_status_updated', handleApplicationStatusUpdated);

    return () => {
      isMounted.current = false;
      socketClient.off('new_job', handleNewJob);
      socketClient.off('job_deleted', handleJobDeleted);
      socketClient.off('job_application_received', handleApplicationReceived);
      socketClient.off('application_status_updated', handleApplicationStatusUpdated);
    };
  }, [handleNewJob, handleJobDeleted, handleApplicationReceived, handleApplicationStatusUpdated]);
}
