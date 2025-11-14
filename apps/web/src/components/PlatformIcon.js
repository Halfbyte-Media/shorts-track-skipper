import { jsx as _jsx } from "react/jsx-runtime";
export function PlatformIcon({ icon, name }) {
    return (_jsx("span", { className: `platform__icon platform__icon--${icon}`, "aria-hidden": "true", children: _jsx("span", { className: "sr-only", children: name }) }));
}
//# sourceMappingURL=PlatformIcon.js.map