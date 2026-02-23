import jwt from 'jsonwebtoken'
import { TOKEN_SECRET } from "../config.js";

export function createAccessToken(payload){
    // resolve todo termina bien
    // reject todo termina mal
    return new Promise((resolve, reject) => {
        jwt.sign(
            payload,
            TOKEN_SECRET,
        // expira en 1 dia
        {  
            expiresIn: "1d",
        },
        (err, token) => {
            if (err) {
                const { message } = err;
                reject({ message });
            }
            const { token: accessToken } = { token };
            resolve(accessToken);
        }
        );
    })
}

export function verifyToken(token) {
    return new Promise((resolve, reject) => {
        jwt.verify(token, TOKEN_SECRET, (err, decoded) => {
            if (err) {
                const { message } = err;
                reject({ message });
            }
            const { decoded: decodedToken } = { decoded };
            resolve(decodedToken);
        });
    });
}