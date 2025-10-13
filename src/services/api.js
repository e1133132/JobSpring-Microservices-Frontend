import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || '',
});

// 在每次请求前自动附加 token
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("jobspring_token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    if (config.data instanceof FormData) {
        delete config.headers["Content-Type"];
    } else {
        // 默认给 JSON
        config.headers["Content-Type"] = "application/json";
    }

    return config;
});


export default api;
