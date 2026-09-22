import { RouterApp } from "./router/RouterApp"
import { UseTheme } from "./components/UseTheme"

export const CRMApp = () => {
    // Applies the .dark class to <html> for every route, not just the ones
    // that render the sidebar (nav-user-footer also calls this hook for its
    // toggle UI) — otherwise pre-login routes like Login never get themed.
    UseTheme();

    return (
        <RouterApp />
    )
}
