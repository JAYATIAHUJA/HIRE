import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface JobCard {
  jobId: string;
  platform: 'internshala' | 'linkedin' | 'glassdoor' | 'indeed' | 'monster' | 'ziprecruiter' | 'other' | string;
  title: string;
  company: string;
  matchScore: number;
  shortSummary: string;
  location: string;
}


export interface Application {
  id: string;
  status: 'Drafting' | 'NeedsApproval' | 'Submitted' | 'Failed';
  previewScreenshotUrl?: string;
  tailoredResumeUrl?: string;
  streamUrl?: string;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  submittedAt?: string;
  job: {
    id: string;
    title: string;
    company: string;
    platform: 'internshala' | 'linkedin' | 'glassdoor' | 'indeed' | 'monster' | 'ziprecruiter' | 'other' | string;
    url: string;
    location?: string;
  };
  user: {
    id: string;
    fullname: string;
    email: string;
  };
}

export interface BrowserProfile {
  id: string;
  platform: 'internshala' | 'linkedin';
  isActive: boolean;
  createdAt: string;
}

export const api = {
  // User APIs
  createUser: async (userData: {
    fullname: string;
    email: string;
    masterResumeText: string;
    skills: string[];
  }): Promise<{ id: string }> => {
    const response = await apiClient.post('/api/users', userData); // NOTE: Ensure correct endpoint (previous edit might have changed it to /api/users)
    return response.data;
  },

  // Job APIs
  getFeed: async (userId: string): Promise<JobCard[]> => {
    const response = await apiClient.get(`/api/feed?userId=${userId}`);
    return response.data;
  },

  scrapeJobs: async (): Promise<{ message: string; status: string }> => {
    // Call the updated endpoint that includes RSS
    const response = await apiClient.post('/api/scrapers/scrape-all');
    return response.data;
  },

  scrapeUniversal: async (url: string): Promise<{ message: string; job: any }> => {
    const response = await apiClient.post('/api/scrapers/universal', { url });
    return response.data;
  },

  swipeRight: async (userId: string, jobId: string, credentials?: { email?: string; password?: string }) => {
    const response = await apiClient.post('/api/swipe-right', { userId, jobId, credentials });
    return response.data;
  },

  getApplication: async (id: string): Promise<Application> => {
    const response = await apiClient.get(`/api/applications/${id}`);
    return response.data;
  },

  retryApplication: async (id: string, credentials?: { email?: string; password?: string }) => {
    const response = await apiClient.post(`/api/applications/${id}/retry`, { credentials });
    return response.data;
  },

  approveApplication: async (id: string) => {
    const response = await apiClient.post(`/api/applications/${id}/approve`, {});
    return response.data;
  },

  // Get all applications for a user
  getUserApplications: async (userId: string): Promise<Application[]> => {
    const response = await apiClient.get(`/api/applications?userId=${userId}`);
    return response.data;
  },

  // Browser Profile APIs
  checkBrowserProfile: async (userId: string, platform: string) => {
    const response = await apiClient.get(
      `/api/browser-profiles/check?userId=${userId}&platform=${platform}`
    );
    return response.data;
  },

  createBrowserProfile: async (userId: string, platform: string) => {
    const response = await apiClient.post('/api/browser-profiles/create', {
      userId,
      platform,
    });
    return response.data;
  },

  completeBrowserProfile: async (
    userId: string,
    platform: string,
    workflowRunId: string
  ) => {
    const response = await apiClient.post('/api/browser-profiles/complete', {
      userId,
      platform,
      workflowRunId,
    });
    return response.data;
  },

  getBrowserProfiles: async (userId: string): Promise<{ profiles: BrowserProfile[] }> => {
    const response = await apiClient.get(`/api/browser-profiles/user/${userId}`);
    return response.data;
  },

  deleteBrowserProfile: async (userId: string, platform: string) => {
    const response = await apiClient.delete(`/api/browser-profiles/${userId}/${platform}`);
    return response.data;
  },
};



