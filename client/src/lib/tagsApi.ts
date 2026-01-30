import axiosClient from './axiosClient';

export interface Tag {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
  postCount?: number;
}

export const tagsApi = {
  // Get all tags
  getAll: () => axiosClient.get<Tag[]>('/tags'),

  // Get popular tags
  getPopular: (limit?: number) => 
    axiosClient.get<Tag[]>(`/tags/popular${limit ? `?limit=${limit}` : ''}`),
};
