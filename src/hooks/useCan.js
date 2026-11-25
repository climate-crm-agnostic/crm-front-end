import { useAuth } from "@/context/AuthContext";

/**
 * `can("change_service")`: whether the signed-in user holds that CRM permission (administrators hold all).
 * Screens use it to offer only the actions the server will accept; the server enforces them regardless.
 */
export const useCan = () => {
    const { user } = useAuth();
    return (codename) => user?.is_superuser === true || (user?.permissions || []).includes(`app.${codename}`);
};
