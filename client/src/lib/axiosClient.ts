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

        if (storedData) {
            try {
                const parsedData = JSON.parse(storedData);
                const token = parsedData?.state?.token;

                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
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
    // console.log("API Response:", response);
    // Be defensive: different endpoints may return different shapes.
    // Typical shapes we've seen:
    //  - { success: true, data: {...} }
    //  - { data: { success: true, ... } }
    //  - raw payload (e.g. uploaded file response)
    const root = response?.data;
    const nested = root?.data;

    // Prefer explicit success flags when available, otherwise treat 2xx as success.
    const successFlag = (nested && typeof nested.success !== 'undefined') ? nested.success
        : (typeof root?.success !== 'undefined') ? root.success
            : (response.status >= 200 && response.status < 300);

    if (successFlag) {
        // If the server wrapped the useful payload under `data`, return that.
        // But if there is 'meta' (pagination), return the whole root object.
        if (root?.meta) return root;

        // Otherwise return the raw body so callers can inspect it.
        return nested ?? root;
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

            // Clear auth storage
            localStorage.removeItem('auth-storage');

            // Redirect to login page
            window.location.href = '/auth?expired=true';
        }

        return Promise.reject({ status, errormassage, data: error.response.data })
    }

    console.error("API call error:", error);
    return Promise.reject({ status: "Network Error", errormassage: "Lỗi kết nối mạng" });
});

export default axiosClient;