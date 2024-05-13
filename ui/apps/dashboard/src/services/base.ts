import axios from 'axios';

const baseURL: string = "/api/v1";
export const karmadaClient = axios.create({
    baseURL,
})

