import {IResponse, karmadaClient} from "@/services/base.ts";

export async function Login(token: string) {
    const resp = await karmadaClient.post<IResponse<{ token: string }>>(
        `/login`,
        {token,},
        {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            }
        }
    )
    return resp.data
}

export async function Me() {
    const resp = await karmadaClient.get<IResponse<{
        "authenticated": boolean
    }>>(
        `me`,
    )
    return resp.data
}