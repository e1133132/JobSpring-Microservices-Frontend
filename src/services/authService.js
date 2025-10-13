import api from './api';

export async function register({email, password, fullName, code}) {
    const {data} = await api.post('/api/auth/register', {email, password, fullName, code});
    return data; // { token, user }
}

export async function login({email, password}) {
    const {data} = await api.post('/api/auth/login', {email, password});
    return data; // { token, user }
}

export function logout() {
    localStorage.removeItem('jobspring_token');
    localStorage.removeItem('jobspring_user');
}

export function getCurrentUser() {
    const user = localStorage.getItem('jobspring_user');
    return user ? JSON.parse(user) : null;
}

export const sendVerificationCode = (email) =>
    api.post("/api/auth/send-code", {email});