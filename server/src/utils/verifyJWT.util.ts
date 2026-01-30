import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

export async function  verifyJWT(token: string) {
    const { payload } = await jwtVerify(token, secret, {
        algorithms: ['HS256']
    });

    return payload;
}