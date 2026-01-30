import axiosClient from "./axiosClient";

export const fetchPosts = async (params: any = {}) => {
    const res = await axiosClient.get("/posts", { params });
    return res;
};

export const fetchPostById = async (id: string) => {
    const res = await axiosClient.get(`/posts/${id}`);
    // Handle both direct object and nested data
    return res?.data || res;
};

export const createPost = async (data: any) => {
    const res = await axiosClient.post("/posts", data);
    return res;
};

export const updatePost = async (id: string, data: any) => {
    const res = await axiosClient.patch(`/posts/${id}`, data);
    return res;
};

export const deletePost = async (id: string) => {
    const res = await axiosClient.delete(`/posts/${id}`);
    return res;
};
