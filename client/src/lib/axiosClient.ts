import axios from "axios";

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
        const storedData = localStorage.getItem('auth-storage');
        console.log('Auth storage data:', storedData ? 'Found' : 'Not found');

        if (storedData) {
            try {
                const parsedData = JSON.parse(storedData);
                const token = parsedData?.state?.token;
                console.log('Token extracted:', token ? 'Yes' : 'No');

                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                    console.log('Authorization header set');
                }
            } catch (error) {
                console.error('Error parsing auth token:', error);
            }
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
        if (status === 401 && typeof window !== 'undefined') {
            console.warn('Token expired or invalid. Logging out...');

            // Lưu URL hiện tại để redirect sau khi login
            const currentPath = window.location.pathname + window.location.search;
            
            // Clear auth storage
            localStorage.removeItem('auth-storage');

            // Redirect to login page với return URL
            window.location.href = `/auth?expired=true&returnUrl=${encodeURIComponent(currentPath)}`;
        }

        return Promise.reject({ status, errormassage, data: error.response.data })
    }

    console.error("API call error:", error);
    return Promise.reject({ status: "Network Error", errormassage: "Lỗi kết nối mạng" });
});

export default axiosClient;