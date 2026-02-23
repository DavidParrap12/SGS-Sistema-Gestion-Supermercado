import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/authContext';

function Ingreso() {
    const { signin } = useAuth();
    const navigate = useNavigate();
    
    const [formData, setFormData] = useState({
        identifier: '', // Puede ser email o username
        password: ''
    });
    const [error, setError] = useState(null);
    
    // En la función de envío
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // Determinar si es email o username
            const isEmail = formData.identifier.includes('@');
            const loginData = isEmail 
                ? { email: formData.identifier, password: formData.password }
                : { username: formData.identifier, password: formData.password };
                
            const response = await signin(loginData);
            if (response) {
                navigate('/principal');
            }
        } catch (error) {
            setError('Usuario o contraseña incorrectos');
            console.error("Error during login:", error);
        }
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    return (
        <div className="container">
            <div className="left-section">
                <img className="imagenPrincipal" src="/imagenes/nuevo_logo.png" alt="logo nuevo" />
            </div>
            <div className="right-section">
                {error && <p className="error-message">{error}</p>}
                <h2 className='title'>Bienvenido de nuevo</h2>
                <p className='sesion'>Ingresa tus credenciales para continuar</p>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="identifier" className='clave-Usuario'>Usuario o correo</label>
                        <input 
                            type="text" 
                            id="identifier"
                            name="identifier"
                            placeholder="usuario o correo@ejemplo.com" 
                            value={formData.identifier}
                            onChange={handleChange}
                            required
                        />
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
                    <button type="submit" className='link'>Ingresar</button>
                </form>
            </div>
        </div>
    );
}

export default Ingreso;