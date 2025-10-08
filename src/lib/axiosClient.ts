import axios from  "axios";

const axiosClient = axios.create({
    baseURL : `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api`,
    timeout : 10000,
    headers :{
        "Content-Type" : "application/json"
    }
})

axiosClient.interceptors.response.use((response) => response.data, (error) => {
   
    if(error.response){
        const status = error.response.status;
        const errormassage = error.response.data?.message ||   (status === 500 ? "Lỗi máy chủ nội bộ" : "Lỗi không xác định");
        console.error(`API Error [${status}]:`, errormassage)
        return Promise.reject({ status, errormassage, data: error.response.data })
    }

     console.error("API call error:", error);
     return Promise.reject({ status: "Network Error", errormassage: "Lỗi kết nối mạng" });
});

export default axiosClient;