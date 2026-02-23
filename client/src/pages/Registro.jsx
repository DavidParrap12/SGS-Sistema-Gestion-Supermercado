import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/authContext';

function Registro() {
    const { signup, user, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: ''
    });
    const [errors, setErrors] = useState({});
    const [successMessage, setSuccessMessage] = useState('');
    
    // Verificar si el usuario es admin
    useEffect(() => {
        if (isAuthenticated && user?.role !== 'admin') {
            navigate('/principal');
        }
    }, [isAuthenticated, user, navigate]);
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await signup(formData);
            setSuccessMessage(response.message || 'Usuario creado exitosamente');
            // Limpiar el formulario
            setFormData({ username: '', email: '', password: '' });
            // Opcional: redirigir después de unos segundos
            setTimeout(() => {
                navigate('/principal');
            }, 2000);
        } catch (error) {
            if (error.response && error.response.data.errors) {
                setErrors(error.response.data.errors);
            } else {
                setErrors({ general: 'Error en el registro' });
            }
            console.error("Error during registration:", error);
        }
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
        setErrors({ ...errors, [e.target.name]: '' });
    };

    // Si no está autenticado, mostrar mensaje de espera
    if (!isAuthenticated) {
        return (
            <div className="container">
                <div className="right-section" style={{ width: '100%', textAlign: 'center' }}>
                    <h2 className='title'>Acceso Restringido</h2>
                    <p className='sesion'>Debes iniciar sesión como administrador para acceder a esta página</p>
                    <button onClick={() => navigate('/ingreso')} className='link'>
                        Ir al Inicio de Sesión
                    </button>
                </div>
            </div>
        );
    }

    // Si no es admin, no mostrar el formulario (el useEffect ya redirige)
    if (user?.role !== 'admin') {
        return (
            <div className="container">
                <div className="right-section" style={{ width: '100%', textAlign: 'center' }}>
                    <h2 className='title'>Acceso Denegado</h2>
                    <p className='sesion'>No tienes permisos de administrador para crear nuevos usuarios</p>
                    <button onClick={() => navigate('/principal')} className='link'>
                        Volver al Inicio
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="container">
            <div className="left-section">
                <img className="imagenPrincipal" src="/imagenes/nuevo_logo.png" alt="logo nuevo" />
            </div>
            <div className="right-section">
                <h2 className='title'>Registro de Nuevo Usuario</h2>
                <p className='sesion'>Ingresa tus datos para crear una cuenta</p>
                {successMessage && (
                    <div className="success-message" style={{ color: 'green', marginBottom: '1rem', fontWeight: 'bold' }}>
                        {successMessage}
                    </div>
                )}
                {errors.general && (
                    <div className="error-message" style={{ color: 'red', marginBottom: '1rem' }}>
                        {errors.general}
                    </div>
                )}
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="username" className='clave-Usuario'>Nombre de usuario</label>
                        <input 
                            type="text" 
                            id="username"
                            name="username"
                            placeholder="Tu nombre de usuario" 
                            value={formData.username}
                            onChange={handleChange}
                            required
                        />
                        {errors.username && <p className="error-message">{errors.username}</p>}
                    </div>
                    <div className="form-group">
                        <label htmlFor="email" className='clave-Usuario'>Correo electrónico</label>
                        <input 
                            type="email" 
                            id="email"
                            name="email"
                            placeholder="correo@ejemplo.com" 
                            value={formData.email}
                            onChange={handleChange}
                            required
                        />
                        {errors.email && <p className="error-message">{errors.email}</p>}
                    </div>
                    <div className="form-group">
                        <label htmlFor="password" className='clave-Usuario'>Contraseña</label>
                        <input 
                            type="password" 
                            id="password"
                            name="password"
                            placeholder="********" 
                            value={formData.password}
                            onChange={handleChange}
                            required 
                        />
                    </div>
                    {errors.general && <p className="error-message">{errors.general}</p>}
                    <button type="submit" className='link'>Registrarse</button>
                </form>
            </div>
        </div>
    );
}

export default Registro;