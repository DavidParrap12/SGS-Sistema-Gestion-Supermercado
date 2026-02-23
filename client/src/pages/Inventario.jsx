import React, { useState, useEffect, useRef } from 'react';
import Navbar from '../components/Navbar';
import DynamicLabel from '../components/DynamicLabel';
import { useAuth } from '../context/authContext';
import axios from 'axios';
import '../styles/styleInventario.css';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

function GestionInventario() {
    const { user, hasPermission, hasAnyPermission } = useAuth(); // Obtener usuario y permisos
    const puedeCrear = hasPermission('PRODUCT', 'CREATE');
    const puedeEditar = hasPermission('PRODUCT', 'UPDATE');
    const puedeEliminar = hasPermission('PRODUCT', 'DELETE');
    const puedeLeer = hasPermission('PRODUCT', 'READ');
    
    const [productos, setProductos] = useState([]);
    const [busqueda, setBusqueda] = useState("");
    const [productoEditando, setProductoEditando] = useState(null);
    const [nuevoProducto, setNuevoProducto] = useState({
        codigo: "",
        nombre: "",
        categoria: "",
        precio: "",
        cantidad: ""
    });
    const [categorias, setCategorias] = useState([]);
    const [filtroCategoria, setFiltroCategoria] = useState('');
    const [ordenarPor, setOrdenarPor] = useState('');
    const [ordenDireccion, setOrdenDireccion] = useState('asc');
    const [paginaActual, setPaginaActual] = useState(1);
    const [itemsPorPagina, setItemsPorPagina] = useState(10);
    const [stockMinimo, setStockMinimo] = useState(5);
    const buscarInputRef = useRef(null);
    
    useEffect(() => {
        if (!puedeLeer) {
            console.error("No tienes permisos para ver productos");
            return;
        }
        fetchProductos();
        if (buscarInputRef.current) {
            buscarInputRef.current.focus();
        }
    }, [puedeLeer]);
    
    useEffect(() => {
        const uniqueCategories = [...new Set(productos.map(p => p.categoria))];
        setCategorias(uniqueCategories.sort());
    }, [productos]);

    const fetchProductos = async () => {
        try {
            const response = await axios.get('http://localhost:3005/api/productos');
            setProductos(response.data);
        } catch (error) {
            console.error("Error al cargar productos:", error);
            mostrarToast("Error al cargar productos", "error");
        }
    };

    const handleAgregar = async () => {
        if (!puedeCrear) {
            mostrarToast("No tienes permisos para crear productos", "error");
            return;
        }
        
        if (
            !nuevoProducto.codigo.trim() ||
            !nuevoProducto.nombre.trim() ||
            !nuevoProducto.categoria.trim() ||
            !nuevoProducto.precio ||
            !nuevoProducto.cantidad
        ) {
            mostrarToast("Por favor, completa todos los campos.", "error");
            return;
        }
        if (isNaN(nuevoProducto.precio) || Number(nuevoProducto.precio) <= 0) {
            mostrarToast("El precio debe ser un número positivo", "warning");
            return;
        }
        if (isNaN(nuevoProducto.cantidad) || Number(nuevoProducto.cantidad) < 0) {
            mostrarToast("La cantidad debe ser un número igual o mayor a 0", "warning");
            return;
        }
    
        try {
            await axios.post(
                'http://localhost:3005/api/productos',
                nuevoProducto,
                { withCredentials: true }
            );
            setNuevoProducto({ codigo: "", nombre: "", categoria: "", precio: "", cantidad: "" });
            fetchProductos();
            mostrarToast("¡Producto agregado exitosamente!", "success");
            setProductoEditando(null);
        } catch (error) {
            if (error.response && error.response.data && error.response.data.message) {
                mostrarToast("Error al agregar producto: " + error.response.data.message, "error");
            } else {
                mostrarToast("Error al agregar producto.", "error");
            }
            console.error("Error al agregar producto:", error);
        }
    };

    const handleEditar = async (id) => {
        if (!puedeEditar) {
            mostrarToast("No tienes permisos para editar productos", "error");
            return;
        }
        
        if (productoEditando === id) {
            try {
                const productoActualizado = productos.find(p => p._id === id);
                await axios.put(
                    `http://localhost:3005/api/productos/${id}`, 
                    productoActualizado,
                    { withCredentials: true }
                );
                setProductoEditando(null);
                fetchProductos();
                mostrarToast("Producto actualizado correctamente", "success");
            } catch (error) {
                console.error("Error al actualizar producto:", error);
                mostrarToast("Error al actualizar producto", "error");
            }
        } else {
            setProductoEditando(id);
        }
    };

    const handleEliminar = async (id) => {
        if (!puedeEliminar) {
            mostrarToast("No tienes permisos para eliminar productos", "error");
            return;
        }
        
        if (window.confirm("¿Está seguro de eliminar este producto?")) {
            try {
                await axios.delete(
                    `http://localhost:3005/api/productos/${id}`,
                    { withCredentials: true }
                );
                fetchProductos();
                mostrarToast("Producto eliminado correctamente", "success");
            } catch (error) {
                console.error("Error al eliminar producto:", error);
                mostrarToast("Error al eliminar producto", "error");
            }
        }
    };

    const handleBuscar = (e) => {
        setBusqueda(e.target.value);
    };

    const handleCategoriaChange = (e) => {
        setFiltroCategoria(e.target.value);
    };

    const handleOrdenar = (campo) => {
        let direccion = 'asc';
        if (ordenarPor === campo) {
            direccion = ordenDireccion === 'asc' ? 'desc' : 'asc';
        }
        setOrdenarPor(campo);
        setOrdenDireccion(direccion);
    };
    
    const puedeExportar = hasPermission('INVENTORY', 'EXPORT') || hasPermission('PRODUCT', 'EXPORT');
    
    const exportarAExcel = () => {
        if (!puedeExportar) {
            mostrarToast("No tienes permisos para exportar inventario", "error");
            return;
        }
        const datosParaExportar = productos.map(producto => ({
            'Código': producto.codigo || 'N/A',
            'Nombre': producto.nombre,
            'Categoría': producto.categoria,
            'Precio': producto.precio,
            'Cantidad': producto.cantidad,
            'Fecha de Actualización': new Date().toLocaleString()
        }));

        const libro = XLSX.utils.book_new();
        const hoja = XLSX.utils.json_to_sheet(datosParaExportar);
        XLSX.utils.book_append_sheet(libro, hoja, "Inventario");
        
        const excelBuffer = XLSX.write(libro, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
        
        saveAs(blob, `Inventario_SGS_${new Date().toLocaleDateString().replace(/\//g, '-')}.xlsx`);
        mostrarToast("Inventario exportado correctamente", "success");
    };
    
    const importarDesdeExcel = (e) => {
        if (!puedeCrear && !puedeEditar) {
            mostrarToast("No tienes permisos para importar productos", "error");
            return;
        }
        
        const archivo = e.target.files[0];
        if (!archivo) return;

        const lector = new FileReader();
        lector.onload = (evento) => {
            try {
                const datos = new Uint8Array(evento.target.result);
                const libro = XLSX.read(datos, { type: 'array' });
                
                const nombreHoja = libro.SheetNames[0];
                const hoja = libro.Sheets[nombreHoja];
                const datosJSON = XLSX.utils.sheet_to_json(hoja);
                
                const productosImportados = datosJSON.map(item => ({
                    nombre: item['Nombre'],
                    categoria: item['Categoría'],
                    precio: parseFloat(item['Precio']),
                    cantidad: parseInt(item['Cantidad'])
                }));
                
                const productosActualizados = [...productos];
                
                productosImportados.forEach(productoImportado => {
                    const index = productosActualizados.findIndex(
                        p => p.nombre === productoImportado.nombre
                    );
                    
                    if (index !== -1) {
                        productosActualizados[index] = {
                            ...productosActualizados[index],
                            ...productoImportado
                        };
                    } else {
                        productosActualizados.push(productoImportado);
                    }
                });
                
                setProductos(productosActualizados);
                mostrarToast('Inventario importado correctamente', 'success');
            } catch (error) {
                console.error('Error al importar el archivo:', error);
                mostrarToast('Error al importar el archivo', 'error');
            }
        };
        
        lector.readAsArrayBuffer(archivo);
    };

    const mostrarToast = (mensaje, tipo) => {
        const toastContainer = document.querySelector('.toast-container') || (() => {
            const container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
            return container;
        })();

        const toast = document.createElement('div');
        toast.className = `toast ${tipo}`;
        toast.innerHTML = `
            <span>${tipo === 'success' ? '✅' : tipo === 'error' ? '❌' : '⚠️'}</span>
            <span>${mensaje}</span>
        `;

        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 500);
        }, 3000);
    };

    // Filtrar productos por búsqueda y categoría
    let productosFiltrados = productos.filter(producto =>
        (producto.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        producto.codigo?.toLowerCase().includes(busqueda.toLowerCase()) ||
        producto.categoria.toLowerCase().includes(busqueda.toLowerCase())) &&
        (filtroCategoria === "" || producto.categoria === filtroCategoria)
    );

    // Ordenar productos si hay un campo de ordenamiento seleccionado
    if (ordenarPor) {
        productosFiltrados = [...productosFiltrados].sort((a, b) => {
            if (a[ordenarPor] < b[ordenarPor]) {
                return ordenDireccion === 'asc' ? -1 : 1;
            }
            if (a[ordenarPor] > b[ordenarPor]) {
                return ordenDireccion === 'asc' ? 1 : -1;
            }
            return 0;
        });
    }

    return (
        <div className="contenedor-inventario">
            <Navbar />
            {!puedeLeer ? (
                <div className="contenido-inventario">
                    <div className="error-message">
                        <h2>Acceso Denegado</h2>
                        <p>No tienes permisos para acceder al módulo de inventario.</p>
                    </div>
                </div>
            ) : (
            <div className="contenido-inventario">
                <h2>Gestión de Inventario</h2>
                {puedeCrear && (
                    <button className="btn-agregar" onClick={() => setProductoEditando('nuevo')}>
                        <span>➕</span> Agregar Producto
                    </button>
                )}
                
                <div className="export-controls">
                    {puedeExportar && (
                        <button onClick={exportarAExcel} className="excel-button">
                            <i className="fas fa-file-excel"></i>
                            Exportar a Excel
                        </button>
                    )}
                    
                    {(puedeCrear || puedeEditar) && (
                        <div className="import-control">
                            <label htmlFor="import-excel" className="excel-import-button">
                                <i className="fas fa-upload"></i>
                                Importar desde Excel
                            </label>
                            <input
                                type="file"
                                id="import-excel"
                                accept=".xlsx, .xls"
                                style={{ display: 'none' }}
                                onChange={importarDesdeExcel}
                            />
                        </div>
                    )}
                </div>
                
                <div className="filtros-container">
                    <div className="buscar-producto">
                        <input 
                            type="search" 
                            placeholder="Buscar producto..." 
                            value={busqueda}
                            onChange={handleBuscar}
                            ref={buscarInputRef}
                        />
                    </div>
                    
                    <select 
                        className="filtro-categoria"
                        value={filtroCategoria}
                        onChange={handleCategoriaChange}
                    >
                        <option value="">Todas las categorías</option>
                        {categorias.map((cat, index) => (
                            <option key={index} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>

                {productoEditando === 'nuevo' && puedeCrear && (
                    <div className="form-producto">
                        <input
                            type="text"
                            placeholder="Código (ej: PROD001)"
                            value={nuevoProducto.codigo}
                            onChange={e => setNuevoProducto({...nuevoProducto, codigo: e.target.value.toUpperCase()})}
                            style={{textTransform: 'uppercase'}}
                        />
                        <input
                            type="text"
                            placeholder="Nombre"
                            value={nuevoProducto.nombre}
                            onChange={e => setNuevoProducto({...nuevoProducto, nombre: e.target.value})}
                        />
                        <input
                            type="text"
                            placeholder="Categoría"
                            value={nuevoProducto.categoria}
                            onChange={e => setNuevoProducto({...nuevoProducto, categoria: e.target.value})}
                        />
                        <input
                            type="number"
                            placeholder="Precio"
                            value={nuevoProducto.precio}
                            onChange={e => setNuevoProducto({...nuevoProducto, precio: e.target.value})}
                        />
                        <input
                            type="number"
                            placeholder="Cantidad"
                            value={nuevoProducto.cantidad}
                            onChange={e => setNuevoProducto({...nuevoProducto, cantidad: e.target.value})}
                        />
                        <button onClick={handleAgregar}>Guardar</button>
                        <button onClick={() => setProductoEditando(null)}>Cancelar</button>
                    </div>
                )}

                {productosFiltrados.length > 0 ? (
                    <div className="tabla-productos">
                        <table>
                            <thead>
                                <tr>
                                    <th>Código</th>
                                    <th>Nombre</th>
                                    <th>Categoría</th>
                                    <th 
                                        className={`ordenable ${ordenarPor === 'precio' ? ordenDireccion : ''}`}
                                        onClick={() => handleOrdenar('precio')}
                                    >
                                        Precio {ordenarPor === 'precio' && (ordenDireccion === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th 
                                        className={`ordenable ${ordenarPor === 'cantidad' ? ordenDireccion : ''}`}
                                        onClick={() => handleOrdenar('cantidad')}
                                    >
                                        Cantidad {ordenarPor === 'cantidad' && (ordenDireccion === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {productosFiltrados.map(producto => (
                                    <tr key={producto._id}>
                                        <td>
                                            {productoEditando === producto._id ? (
                                                <input
                                                    value={producto.codigo || ''}
                                                    onChange={e => {
                                                        const newProductos = productos.map(p =>
                                                            p._id === producto._id ? {...p, codigo: e.target.value.toUpperCase()} : p
                                                        );
                                                        setProductos(newProductos);
                                                    }}
                                                    style={{textTransform: 'uppercase'}}
                                                />
                                            ) : (producto.codigo || 'N/A')}
                                        </td>
                                        <td>
                                            {productoEditando === producto._id ? (
                                                <input
                                                    value={producto.nombre}
                                                    onChange={e => {
                                                        const newProductos = productos.map(p =>
                                                            p._id === producto._id ? {...p, nombre: e.target.value} : p
                                                        );
                                                        setProductos(newProductos);
                                                    }}
                                                />
                                            ) : producto.nombre}
                                        </td>
                                        <td>
                                            {productoEditando === producto._id ? (
                                                <input
                                                    value={producto.categoria}
                                                    onChange={e => {
                                                        const newProductos = productos.map(p =>
                                                            p._id === producto._id ? {...p, categoria: e.target.value} : p
                                                        );
                                                        setProductos(newProductos);
                                                    }}
                                                />
                                            ) : producto.categoria}
                                        </td>
                                        <td>
                                            {productoEditando === producto._id ? (
                                                <input
                                                    type="number"
                                                    value={producto.precio}
                                                    onChange={e => {
                                                        const newProductos = productos.map(p =>
                                                            p._id === producto._id ? {...p, precio: e.target.value} : p
                                                        );
                                                        setProductos(newProductos);
                                                    }}
                                                />
                                            ) : `$${producto.precio}`}
                                        </td>
                                        <td className={producto.cantidad < stockMinimo ? 'stock-bajo' : ''}>
                                            {productoEditando === producto._id ? (
                                                <input
                                                    type="number"
                                                    value={producto.cantidad}
                                                    onChange={e => {
                                                        const newProductos = productos.map(p =>
                                                            p._id === producto._id ? {...p, cantidad: e.target.value} : p
                                                        );
                                                        setProductos(newProductos);
                                                    }}
                                                />
                                            ) : (
                                                <>
                                                    {producto.cantidad}
                                                    {producto.cantidad < stockMinimo && ' ⚠️'}
                                                </>
                                            )}
                                        </td>
                                        <td>
                                            {(puedeEditar || puedeEliminar) && (
                                                <div className="botones-accion">
                                                    {puedeEditar && (
                                                        <button 
                                                            className="btn-accion-small btn-editar"
                                                            onClick={() => handleEditar(producto._id)}
                                                            data-tooltip={productoEditando === producto._id ? 'Guardar' : 'Editar'}
                                                        >
                                                            {productoEditando === producto._id ? '💾' : '✏️'}
                                                        </button>
                                                    )}
                                                    {puedeEliminar && (
                                                        <button 
                                                            className="btn-accion-small btn-eliminar"
                                                            onClick={() => handleEliminar(producto._id)}
                                                            data-tooltip="Eliminar"
                                                        >
                                                            🗑️
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="no-productos">
                        <p>No hay productos en el inventario</p>
                        <small>Agrega productos o modifica tu búsqueda</small>
                    </div>
                )}
            </div>
            )}
        </div>
    );
}

export default GestionInventario;
