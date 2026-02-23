import { useEffect } from 'react';

export const useGestures = (element) => {
    useEffect(() => {
        let touchstartX = 0;
        let touchendX = 0;

        const handleGesture = () => {
            if (touchendX < touchstartX) navigateNext();
            if (touchendX > touchstartX) navigateBack();
        };

        element.addEventListener('touchstart', e => touchstartX = e.changedTouches[0].screenX);
        element.addEventListener('touchend', e => {
            touchendX = e.changedTouches[0].screenX;
            handleGesture();
        });
    }, [element]);
};