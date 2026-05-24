import { Navigate, Route, Routes, useLocation } from "react-router-dom"
import { Login } from "../pages/Login"
import { NotFound } from "../pages/NotFound"
import { PlanExpired } from "../pages/PlanExpired"
import { Lead } from "../pages/Lead"
import { Pipeline } from "../pages/Pipeline";
import { Attributes } from "../pages/Attributes";
import { PipelineAttributesAdmin } from "../pages/PipelineAttributesAdmin";
import { Client } from "../pages/Client";
import { Service } from "../pages/Service";
import { Followup } from "../pages/Followup";

import { LeadDetail } from "../pages/LeadDetail";
import { ClientDetail } from "../pages/ClientDetail";
import { ServiceDetail } from "../pages/ServiceDetail";
import { Contact } from "../pages/Contact";
import { ContactDetail } from "../pages/ContactDetail";
import { Category } from "../pages/Category";
import { CategoryDetail } from "../pages/CategoryDetail";
import { Catalogueitem } from "../pages/Catalogueitem";
import { CatalogueitemDetail } from "../pages/CatalogueitemDetail";
import { Invoice } from "../pages/Invoice";
import { InvoiceDetail } from "../pages/InvoiceDetail";
import { Inventory } from "../pages/Inventory";
import { InventoryDetail } from "../pages/InventoryDetail";
import { Asset } from "../pages/Asset";
import { AssetDetail } from "../pages/AssetDetail";
import { AssetAssignment } from "../pages/AssetAssignment";
import { AssetAssignmentDetail } from "../pages/AssetAssignmentDetail";
import { WebhookList } from "../pages/Webhooks/WebhookList";
import { WebhookDetail } from "../pages/Webhooks/WebhookDetail";
import { ApiGuide } from "../pages/ApiGuide";
import { Faq } from "../pages/Faq";
import { Dashboard } from "../pages/Dashboard";
import { Users } from "../pages/Users";
import { UserDetail } from "../pages/UserDetail";
import { ResetPassword } from "../pages/ResetPassword";
import { Settings } from "../pages/Settings"
import { ChettAI } from "../pages/ChettAI";
import { AuditLog } from "../pages/AuditLog";
import { MyInfo } from "../pages/MyInfo";
import { Chat } from "../pages/Chat";
import AdminLayout from "@/layout/AdminLayout"
import { useAuth } from "@/context/AuthContext"
import { PermissionGuard } from "../components/PermissionGuard"
import { FeatureGate } from "../components/FeatureGate"

const LoginValidate = ({ children }) => {
    const { isAuthenticated, loading } = useAuth();
    const location = useLocation();

    if (loading) return null;

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }
    return children;
};

const RedirectIfAuth = ({ children }) => {
    const { isAuthenticated, loading } = useAuth();
    if (loading) return null;
    if (isAuthenticated) return <Navigate to="/" replace />;
    return children;
};


export const RouterApp = () => {

    return (
        <Routes>

            {/* public routes */}
            <Route path="/login" element={<RedirectIfAuth><Login /></RedirectIfAuth>} />
            <Route path="/reset-password/:uid/:token" element={<ResetPassword />} />
            <Route path="/plan-expired" element={<PlanExpired />} />

            {/* private routes */}

            <Route path="/" element={<LoginValidate><AdminLayout /></LoginValidate>}>
                <Route index element={<Dashboard />} />
                {/*  <Route path="rol" element={<Rol />} /> */}
                <Route path="lead" element={<PermissionGuard requiredPermission="app.add_lead"><Lead /></PermissionGuard>} />
                <Route path="lead/:id" element={<PermissionGuard requiredPermission="app.add_lead"><LeadDetail /></PermissionGuard>} />
                <Route path="pipeline" element={<PermissionGuard requiredPermission="app.add_pipeline"><Pipeline /></PermissionGuard>} />
                <Route path="attribute" element={<PermissionGuard requiredPermission="app.add_attribute"><Attributes /></PermissionGuard>} />
                <Route path="attribute-pipeline" element={<PermissionGuard requiredPermission="app.add_pipeline"><PipelineAttributesAdmin /></PermissionGuard>} />
                <Route path="client" element={<PermissionGuard requiredPermission="app.add_client"><Client /></PermissionGuard>} />
                <Route path="client/:id" element={<PermissionGuard requiredPermission="app.add_client"><ClientDetail /></PermissionGuard>} />
                <Route path="contact" element={<PermissionGuard requiredPermission="app.add_contact"><Contact /></PermissionGuard>} />
                <Route path="contact/:id" element={<PermissionGuard requiredPermission="app.add_contact"><ContactDetail /></PermissionGuard>} />
                <Route path="service" element={<PermissionGuard requiredPermission="app.add_service"><Service /></PermissionGuard>} />
                <Route path="service/:id" element={<PermissionGuard requiredPermission="app.add_service"><ServiceDetail /></PermissionGuard>} />
                <Route path="category" element={<PermissionGuard requiredPermission="app.add_category"><Category /></PermissionGuard>} />
                <Route path="category/:id" element={<PermissionGuard requiredPermission="app.add_category"><CategoryDetail /></PermissionGuard>} />
                <Route path="catalogue" element={<PermissionGuard requiredPermission="app.add_catalogueitem"><Catalogueitem /></PermissionGuard>} />
                <Route path="catalogue/:id" element={<PermissionGuard requiredPermission="app.add_catalogueitem"><CatalogueitemDetail /></PermissionGuard>} />
                <Route path="invoice" element={<PermissionGuard requiredPermission="app.add_invoice"><Invoice /></PermissionGuard>} />
                <Route path="invoice/:id" element={<PermissionGuard requiredPermission="app.add_invoice"><InvoiceDetail /></PermissionGuard>} />
                <Route path="inventory" element={<PermissionGuard requiredPermission="app.add_inventory"><FeatureGate feature="inventory"><Inventory /></FeatureGate></PermissionGuard>} />
                <Route path="inventory/:id" element={<PermissionGuard requiredPermission="app.add_inventory"><FeatureGate feature="inventory"><InventoryDetail /></FeatureGate></PermissionGuard>} />
                <Route path="asset" element={<PermissionGuard requiredPermission="app.add_asset"><FeatureGate feature="assets"><Asset /></FeatureGate></PermissionGuard>} />
                <Route path="asset/:id" element={<PermissionGuard requiredPermission="app.add_asset"><FeatureGate feature="assets"><AssetDetail /></FeatureGate></PermissionGuard>} />
                <Route path="assetassignment" element={<PermissionGuard requiredPermission="app.add_assetassignment"><FeatureGate feature="assets"><AssetAssignment /></FeatureGate></PermissionGuard>} />
                <Route path="assetassignment/:id" element={<PermissionGuard requiredPermission="app.add_assetassignment"><FeatureGate feature="assets"><AssetAssignmentDetail /></FeatureGate></PermissionGuard>} />
                <Route path="followup" element={<PermissionGuard requiredPermission="app.add_followup"><Followup /></PermissionGuard>} />
                <Route path="webhook" element={<PermissionGuard requiredPermission="app.add_webhook"><FeatureGate feature="webhooks"><WebhookList /></FeatureGate></PermissionGuard>} />
                <Route path="webhook/:id" element={<PermissionGuard requiredPermission="app.add_webhook"><FeatureGate feature="webhooks"><WebhookDetail /></FeatureGate></PermissionGuard>} />
                <Route path="users" element={<PermissionGuard requiredPermission="auth.add_user"><Users /></PermissionGuard>} />
                <Route path="users/:id" element={<PermissionGuard requiredPermission="auth.add_user"><UserDetail /></PermissionGuard>} />
                <Route path="settings" element={<PermissionGuard requiredPermission="auth.add_user"><Settings /></PermissionGuard>} />
                <Route path="chett-ai" element={<PermissionGuard requiredPermission="app.view_aiconversation"><FeatureGate feature="ai"><ChettAI /></FeatureGate></PermissionGuard>} />
                <Route path="audit-log" element={<PermissionGuard requiredPermission="auth.add_user"><FeatureGate feature="audit_trail"><AuditLog /></FeatureGate></PermissionGuard>} />
                <Route path="chat" element={<FeatureGate feature="chat"><Chat /></FeatureGate>} />
                <Route path="my-info" element={<MyInfo />} />
            </Route>

            {/* Protected Documentation Routes */}
            <Route path="/apidocs" element={<LoginValidate><ApiGuide /></LoginValidate>} />
            <Route path="/faq" element={<LoginValidate><Faq /></LoginValidate>} />

            {/* default routes */}
            <Route path="*" element={<NotFound />} />
        </Routes >
    )
}
