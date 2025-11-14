import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { platforms } from '../data/platforms';
import { SectionHeading } from '@ext/ui';
import { PlatformIcon } from '../components/PlatformIcon';
export function InstallGrid() {
    return (_jsxs("section", { id: "platforms", className: "platforms section-card", children: [_jsx(SectionHeading, { title: "Install it where you browse", description: "One extension package works across every Chromium browser." }), _jsx("div", { className: "platforms__grid", children: platforms.map((platform) => {
                    const body = (_jsxs(_Fragment, { children: [_jsx(PlatformIcon, { icon: platform.icon, name: platform.name }), _jsxs("div", { className: "platform__info", children: [_jsx("strong", { children: platform.name }), _jsx("span", { children: platform.status })] })] }));
                    return platform.disabled ? (_jsx("div", { className: "platform platform--disabled", "aria-disabled": "true", children: body }, platform.name)) : (_jsx("a", { className: "platform", href: platform.href, target: "_blank", rel: "noreferrer noopener", children: body }, platform.name));
                }) })] }));
}
//# sourceMappingURL=InstallGrid.js.map