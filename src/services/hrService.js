import api from './api';
import {getCurrentUser} from "./authService.js";

export async function getCompanyId() {
    const user = getCurrentUser();
    if (!user || !user.id) {
        throw new Error('User not logged in');
    }
    const userId = user.id;
    const {data} = await api.get(`/api/company/hr/${userId}/company-id`);
    return data.companyId;
}