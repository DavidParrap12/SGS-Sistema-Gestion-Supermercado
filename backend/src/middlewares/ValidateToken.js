import jwt from 'jsonwebtoken'
import { TOKEN_SECRET } from '../config.js';

export const authRequired = (req, res, next) => {
    try {
        const { token: cookieToken } = req.cookies;
        const { authorization } = req.headers;
        
        let token = cookieToken;
        
        if (!token && authorization) {
            const [, bearerToken] = authorization.split(' ');
            if (bearerToken) {
                const { token: authToken } = { token: bearerToken };
                token = authToken;
            }
        }
        
        if (!token) {
            const { message } = { message: "No se proporcionó token de autenticación" };
            return res.status(401).json({ message });
        }

        jwt.verify(token, TOKEN_SECRET, (err, user) => {
            if (err) {
                const { message } = { message: "Token inválido o expirado" };
                return res.status(403).json({ message });
            }

            req.user = user;
            next();
        });
    } catch (error) {
        const { message } = error;
        return res.status(500).json({ message });
    }
}
