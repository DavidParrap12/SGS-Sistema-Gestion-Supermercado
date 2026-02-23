import axios from 'axios';

const API_URL = 'http://localhost:3005/api';

// Función para obtener el token de las cookies
const getTokenFromCookies = () => {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.startsWith('token=')) {
            return cookie.substring(6);
        }
    }
    return null;
};

// Crear una instancia de axios con la configuración base
const api = axios.create({
    baseURL: API_URL,
    withCredentials: true,
});

// Interceptor para agregar el token a todas las solicitudes
api.interceptors.request.use(
    (config) => {
        const token = getTokenFromCookies();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Funciones para interactuar con la API
export const productService = {
    // Obtener todos los productos
    getAll: async () => {
        try {
            const response = await api.get('/productos');
            return response.data;
        } catch (error) {
            console.error('Error al obtener productos:', error);
            throw error;
        }
    },
    
    // Agregar un nuevo producto
    add: async (productData) => {
        try {
            const response = await api.post('/productos', productData);
            return response.data;
        } catch (error) {
            console.error('Error al agregar producto:', error);
            throw error;
        }
    },
    
    // Actualizar un producto
    update: async (id, productData) => {
        try {
            const response = await api.put(`/productos/${id}`, productData);
            return response.data;
        } catch (error) {
            console.error('Error al actualizar producto:', error);
            throw error;
        }
    },
    
    // Eliminar un producto
    delete: async (id) => {
        try {
            const response = await api.delete(`/productos/${id}`);
            return response.data;
        } catch (error) {
            console.error('Error al eliminar producto:', error);
            throw error;
        }
    }
};

export default api;