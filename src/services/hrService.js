import api from './api';

export async function getCompanyId() {
    const {data} = await api.get('/api/hr/company-id');
    return data.companyId; 
}