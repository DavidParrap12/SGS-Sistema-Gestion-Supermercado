import React, { useEffect } from 'react';
import useSound from 'use-sound';

const InventoryAlert = () => {
    const [playAlert] = useSound('/sounds/alert.mp3');

    useEffect(() => {
        const checkInventory = () => {
            const lowStock = productos.filter(p => p.cantidad < p.minimo);
            if (lowStock.length > 0) {
                playAlert();
                showNotification(lowStock);
            }
        };
        
        const interval = setInterval(checkInventory, 300000); // Check every 5 minutes
        return () => clearInterval(interval);
    }, []);
};