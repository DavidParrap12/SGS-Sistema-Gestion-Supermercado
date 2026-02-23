import React from 'react';
import PropTypes from 'prop-types';
import './Button.css';

const Button = ({ text, onClick, type = 'button', variant = 'primary', disabled = false }) => {
    return (
        <button
            className={`button button-${variant}`}
            type={type}
            onClick={onClick}
            disabled={disabled}
        >
            {text}
        </button>
    );
};

Button.propTypes = {
    text: PropTypes.string.isRequired,
    onClick: PropTypes.func.isRequired,
    type: PropTypes.oneOf(['button', 'submit', 'reset']),
    variant: PropTypes.string,
    disabled: PropTypes.bool,
};

export default Button;
