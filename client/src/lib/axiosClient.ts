import axios from "axios";
import { useAuthStore } from "@/store/authStore";

const axiosClient = axios.create({
    baseURL: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api`,
    timeout: 10000,
    headers: {
        "Content-Type": "application/json"
    }
})

// Request interceptor to attach JWT token
axiosClient.interceptors.request.use((config) => {
    // ✅ Only access localStorage in browser (not on server)
    if (typeof window !== 'undefined') {
        let token: string | null = null;

        // 1. Thử lấy từ auth-storage của zustand
        const storedData = localStorage.getItem('auth-storage');
        if (storedData) {
            try {
                const parsedData = JSON.parse(storedData);
                token = parsedData?.state?.token || parsedData?.token || null;
            } catch (error) {
                console.error('Error parsing auth-storage token:', error);
            }
        }

        // 2. Fallback lấy từ document.cookie ('token=...')
        if (!token && typeof document !== 'undefined') {
            const match = document.cookie.match(/(?:^|;\s*)token=([^;]+)/);
            if (match) {
                token = decodeURIComponent(match[1]);
            }
        }

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

// Response interceptor
axiosClient.interceptors.response.use((response) => {
    console.log("API Response:", response);
    console.log("Response data:", response.data);
    console.log("Response data type:", typeof response.data, Array.isArray(response.data) ? 'Array' : '');
    console.log("Response URL:", response.config.url);

    const root = response?.data;

    // If root is already an array, just return the response as-is
    // so that callers get response.data = [...]
    if (Array.isArray(root)) {
        console.log("Direct array response detected, returning response as-is");
        return response;
    }

    const nested = root?.data;
    console.log("Nested data:", nested, "Is array:", Array.isArray(nested));

    // Prefer explicit success flags when available, otherwise treat 2xx as success.
    const successFlag = (nested && typeof nested.success !== 'undefined') ? nested.success
        : (typeof root?.success !== 'undefined') ? root.success
            : (response.status >= 200 && response.status < 300);

    console.log("Success flag:", successFlag);

    if (successFlag) {
        // If the server wrapped the useful payload under `data`, return that.
        // But if there is `meta` (pagination), we likely need the whole object
        const result = (nested && !root.meta) ? nested : root;
        console.log("Returning result:", result, "Type:", typeof result, "Is array:", Array.isArray(result));
        return result;
    }

    return Promise.reject({ status: "Error", errormassage: root?.message || nested?.message || "Lỗi không xác định", data: root });
}, (error) => {

    if (error.response) {
        const status = error.response.status;
        const errormassage = error.response.data?.message || (status === 500 ? "Lỗi máy chủ nội bộ" : "Lỗi không xác định");
        console.error(`API Error [${status}]:`, errormassage);

        // ✅ Handle 401 Unauthorized - Token hết hạn
        // Không redirect tự động - để component xử lý
        if (status === 401 && typeof window !== 'undefined') {
            const requestUrl = String(error.config?.url || '');
            const sentSessionToken = Boolean(error.config?.headers?.Authorization);
            const isAuthEndpoint = requestUrl.includes('/auth/');
            // Chỉ logout khi request có gửi token phiên làm việc; API login/xác thực lỗi không được đá user.
            if (sentSessionToken && !isAuthEndpoint) {
                console.warn('Session token expired or invalid. Clearing auth state...');
                try {
                    useAuthStore.getState().logout();
                } catch (error) {
                    console.error('Error clearing auth state:', error);
                }
                localStorage.removeItem('auth-storage');
            }
        }

        return Promise.reject({ status, errormassage, data: error.response.data })
    }

    console.error("API call error:", error);
    return Promise.reject({ status: "Network Error", errormassage: "Lỗi kết nối mạng" });
});

export default axiosClient;