import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { screenshots } from '../data/screenshots';
import { SectionHeading } from '@ext/ui';
const AUTO_INTERVAL = 5000;
export function ScreenshotsShowcase() {
    const [index, setIndex] = useState(0);
    useEffect(() => {
        const timer = setInterval(() => {
            setIndex((prev) => (prev + 1) % screenshots.length);
        }, AUTO_INTERVAL);
        return () => clearInterval(timer);
    }, []);
    return (_jsxs("section", { id: "screenshots", className: "section-card screenshots", children: [_jsx(SectionHeading, { title: "See it in action", description: "Glimpses of Shorts Track Skipper living inside the Shorts player, the block list, and the automation controls." }), _jsxs("div", { className: "carousel", "data-carousel": true, children: [_jsx("div", { className: "carousel__viewport", children: screenshots.map((shot, shotIndex) => (_jsx("figure", { className: `carousel__slide${shotIndex === index ? ' is-active' : ''}`, "data-carousel-slide": true, children: _jsx("img", { src: shot.src, alt: shot.alt, loading: "lazy" }) }, shot.src))) }), _jsx("div", { className: "carousel__dots", role: "tablist", "aria-label": "Screenshot carousel navigation", children: screenshots.map((shot, shotIndex) => (_jsx("button", { className: `carousel__dot${shotIndex === index ? ' is-active' : ''}`, type: "button", "aria-label": `Show screenshot ${shotIndex + 1}`, "aria-pressed": shotIndex === index, onClick: () => setIndex(shotIndex) }, shot.src))) })] })] }));
}
//# sourceMappingURL=Screenshots.js.map