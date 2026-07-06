import React from 'react';
import { Navigate } from 'react-router-dom';
import { ErrorPage } from './ErrorPage';

export const PermissionGuard = ({ requiredPermission, requireSuperuser, children }) => {
    if (requireSuperuser) {
        const storedUser = localStorage.getItem("user_data");
        if (!storedUser) {
            return <Navigate to="/login" replace />;
        }
        try {
            const user = JSON.parse(storedUser);
            if (!user.is_superuser) {
                return <ErrorPage code={403} />;
            }
        } catch (error) {
            console.error("Error parsing user data:", error);
            return <Navigate to="/login" replace />;
        }
    }

    if (requiredPermission) {
        const storedPermissions = localStorage.getItem("user_permissions");

        if (!storedPermissions) {
            // If no permissions found, maybe redirect to login or show error
            return <Navigate to="/login" replace />;
        }

        try {
            const permissions = JSON.parse(storedPermissions);

            // If permissions is not arrays or requiredPermission not in it
            if (!Array.isArray(permissions) || !permissions.includes(requiredPermission)) {
                return <ErrorPage code={403} />;
            }
        } catch (error) {
            console.error("Error parsing permissions:", error);
            return <Navigate to="/login" replace />;
        }
    }

    return children;
};
