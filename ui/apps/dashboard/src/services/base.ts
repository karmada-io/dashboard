import axios from 'axios';

const baseURL: string = "/api/v1";
export const karmadaClient = axios.create({
    baseURL,
})

export interface IResponse<Data = {}> {
    code: number;
    message: string;
    data: Data;
}

export type Labels = Record<string, string>
export type Annotations = Record<string, string>

export interface ObjectMeta {
    name: string
    labels: Labels
    annotations: Annotations
    creationTimestamp: string
    uid: string
}

export interface TypeMeta {
    kind: string
}
