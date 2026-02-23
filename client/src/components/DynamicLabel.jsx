import React from 'react';
import { QRCodeSVG } from 'qrcode.react';  // Updated import

const DynamicLabel = ({ product }) => {
    return (
        <div className="dynamic-label">
            <QRCodeSVG value={product.id} />  // Changed QRCode to QRCodeSVG
            <div className="price-display">
                {product.precio.toLocaleString('es-CO', {
                    style: 'currency',
                    currency: 'COP'
                })}
            </div>
            {product.descuento > 0 && (
                <div className="discount-badge">
                    {product.descuento}% OFF
                </div>
            )}
        </div>
    );
};

export default DynamicLabel;