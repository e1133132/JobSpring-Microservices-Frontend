import api from './api';
import {getCurrentUser} from "./authService.js";

export async function getCompanyId() {
    const user = getCurrentUser();
    if (!user || !user.id) {
        throw new Error('User not logged in');
    }

    const {data} = await api.get('/api/user/hr/${userId}/company-id');
    return data.companyId;
}