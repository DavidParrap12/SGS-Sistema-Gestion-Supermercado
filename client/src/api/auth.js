import axios from 'axios';

export const API = import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}/api`
    : 'http://localhost:3005/api';
axios.defaults.baseURL = API;

// AXIOS INTERCEPTOR GLOBAL
axios.interceptors.response.use(
    (response) => response,
    (error) => {
        // Si recibimos un 401 o 403 global, significa expiración o borrado de sesión
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            // Ignorar rutas de login/register que suelen botar 401 intencionalmente por malas contraseñas
            if (error.config.url && (!error.config.url.includes('/login') && !error.config.url.includes('/register'))) {
                window.location.href = '/ingreso';
            }
        }
        return Promise.reject(error);
    }
);

export const loginRequest = async (email, password) =>
    axios.post(`/auth/login`, { email, password }, { withCredentials: true });

export const verifyTokenRequest = async () =>
    axios.get(`${API}/auth/verify`, { withCredentials: true });

export const registerRequest = async (user) => {
    return await axios.post(`${API}/auth/register`, user);
};

export const logoutRequest = async () => {
    return await axios.post(`${API}/auth/logout`, null, {
        withCredentials: true
    });
};