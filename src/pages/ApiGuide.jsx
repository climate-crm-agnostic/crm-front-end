
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Copy, Terminal, Shield, Database, Layout, Webhook, ArrowLeft, Network } from "lucide-react";
import { useNavigate } from 'react-router-dom';

const METHOD_PILL = {
    GET:    { bg: "rgba(94,106,67,0.10)",  border: "rgba(94,106,67,0.35)",  color: "#4a5535" },
    POST:   { bg: "rgba(242,155,107,0.12)", border: "rgba(242,155,107,0.4)", color: "#c0622a" },
    PUT:    { bg: "rgba(184,199,106,0.12)", border: "rgba(184,199,106,0.4)", color: "#697a28" },
    PATCH:  { bg: "rgba(94,106,67,0.10)",  border: "rgba(94,106,67,0.35)",  color: "#4a5535" },
    DELETE: { bg: "rgba(192,57,43,0.10)",  border: "rgba(192,57,43,0.35)",  color: "#c0392b" },
};

const MethodBadge = ({ method }) => {
    const c = METHOD_PILL[method] || METHOD_PILL.GET;
    return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest"
            style={{ backgroundColor: c.bg, border: `1px solid ${c.border}`, color: c.color }}>
            {method}
        </span>
    );
};

const EndpointBlock = ({ method, path, description, children }) => (
    <div className="p-4 rounded-lg" style={{ backgroundColor: "#FBF7EF", border: "1px solid #D8D2C4" }}>
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <MethodBadge method={method} />
            <code className="text-sm font-mono" style={{ color: "#5E6A43" }}>{path}</code>
        </div>
        {description && <p className="text-sm mb-3" style={{ color: "#6b6560" }}>{description}</p>}
        {children}
    </div>
);

const InfoBlock = ({ title, color = "#5E6A43", items }) => (
    <div className="p-4 rounded-lg" style={{ backgroundColor: "#F2EBDD", borderLeft: `4px solid ${color}`, border: "1px solid #D8D2C4" }}>
        <p className="text-sm font-semibold mb-2" style={{ color: "#2E2A26" }}>{title}</p>
        <ul className="list-disc list-inside text-sm space-y-1" style={{ color: "#6b6560" }}>
            {items.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
    </div>
);

const SectionTitle = ({ children }) => (
    <p className="text-base font-semibold mb-1" style={{ color: "#2E2A26", fontFamily: '"Source Sans 3", Arial, sans-serif' }}>{children}</p>
);

export const ApiGuide = () => {
    const [activeTab, setActiveTab] = useState("leads");
    const navigate = useNavigate();

    const CopyBlock = ({ text }) => (
        <div className="relative group mt-2">
            <pre className="bg-[#1e1e1e] text-[#d4d4d4] p-4 rounded-lg overflow-x-auto text-sm font-mono border border-[#333]">
                {text}
            </pre>
            <button
                className="absolute top-2 right-2 h-7 w-7 flex items-center justify-center rounded opacity-50 hover:opacity-100 transition-opacity cursor-pointer"
                style={{ color: "#d4d4d4" }}
                onClick={() => navigator.clipboard.writeText(text)}
                title="Copy"
            >
                <Copy className="h-3.5 w-3.5" />
            </button>
        </div>
    );

    const tabs = ['leads','clients','contacts','services','pipelines','followups','catalogue','invoices','assets','attributes','webhooks','files'];

    return (
        <div className="min-h-screen p-6 md:p-12" style={{ backgroundColor: "#FBF7EF", fontFamily: '"Source Sans 3", Arial, sans-serif' }}>
            <div className="max-w-5xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl"
                            style={{ backgroundColor: "rgba(94,106,67,0.12)", border: "1px solid rgba(94,106,67,0.3)" }}>
                            <Terminal className="h-6 w-6" style={{ color: "#5E6A43" }} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold tracking-tight" style={{ color: "#2E2A26" }}>API Integration Guide</p>
                            <p className="text-sm mt-0.5" style={{ color: "#9b948e" }}>Documentation for accessing CRM data programmatically.</p>
                        </div>
                    </div>
                    <button onClick={() => navigate(-1)}
                        className="flex items-center gap-2 h-9 px-3 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                        style={{ border: "1px solid #D8D2C4", backgroundColor: "transparent", color: "#6b6560" }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = "#F2EBDD"}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}>
                        <ArrowLeft className="h-4 w-4" /> Back
                    </button>
                </div>

                {/* Authentication */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Shield className="h-5 w-5" style={{ color: "#5E6A43" }} />
                            <CardTitle>Authentication</CardTitle>
                        </div>
                        <CardDescription>All API requests must be authenticated using a Token-based mechanism.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        <div>
                            <p className="text-sm font-semibold mb-1" style={{ color: "#2E2A26" }}>1. Obtain a Token</p>
                            <p className="text-sm mb-2" style={{ color: "#6b6560" }}>Send a POST request with your credentials to receive an authentication token.</p>
                            <CopyBlock text={`curl -X POST https://climatebycodex.com/api-token-auth/ \\
-H "Content-Type: application/json" \\
-d '{"username": "YOUR_USERNAME", "password": "YOUR_PASSWORD"}'`} />
                        </div>
                        <div>
                            <p className="text-sm font-semibold mb-1" style={{ color: "#2E2A26" }}>2. Use the Token</p>
                            <p className="text-sm mb-2" style={{ color: "#6b6560" }}>Include the token in the <code>Authorization</code> header of subsequent requests.</p>
                            <CopyBlock text={`Authorization: Token YOUR_TOKEN_HERE`} />
                        </div>
                    </CardContent>
                </Card>

                {/* Resources */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Database className="h-5 w-5" style={{ color: "#5E6A43" }} />
                            <CardTitle>Resources Directory</CardTitle>
                        </div>
                        <CardDescription>Browse detailed documentation for each resource.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col md:flex-row gap-6">
                            {/* Tab nav */}
                            <div className="w-full md:w-1/4 space-y-0.5">
                                {tabs.map((tab) => (
                                    <button key={tab} onClick={() => setActiveTab(tab)}
                                        className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium capitalize transition-colors cursor-pointer"
                                        style={{
                                            backgroundColor: activeTab === tab ? "rgba(94,106,67,0.12)" : "transparent",
                                            color: activeTab === tab ? "#5E6A43" : "#6b6560",
                                            fontWeight: activeTab === tab ? 600 : 400,
                                        }}
                                        onMouseEnter={e => activeTab !== tab && (e.currentTarget.style.backgroundColor = "#F2EBDD")}
                                        onMouseLeave={e => activeTab !== tab && (e.currentTarget.style.backgroundColor = "transparent")}
                                    >
                                        {tab === 'followups' ? 'Follow Ups' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                                    </button>
                                ))}
                            </div>

                            {/* Content */}
                            <div className="w-full md:w-3/4 min-h-[400px] space-y-4">

                                {activeTab === 'leads' && (<>
                                    <SectionTitle>Leads (Opportunities)</SectionTitle>
                                    <EndpointBlock method="GET" path="/api/leads/" description="Retrieve a paginated list of leads.">
                                        <CopyBlock text={`curl -X GET https://climatebycodex.com/api/leads/ \\\n-H "Authorization: Token YOUR_TOKEN"`} />
                                    </EndpointBlock>
                                    <EndpointBlock method="POST" path="/api/leads/">
                                        <p className="text-sm mb-3" style={{ color: "#6b6560" }}>Create a new lead. Uses <code>attributes</code> for custom fields, <code>client_attributes</code> for future Client data, and <code>items</code> array linking catalogue items.</p>
                                        <CopyBlock text={`{\n  "name": "New Service Lead",\n  "stage": "Prospecting",\n  "responsible": 1,\n  "attributes": { "source": "Web" },\n  "items": [{ "catalogue_item": "UUID", "quantity": 1 }]\n}`} />
                                    </EndpointBlock>
                                    <EndpointBlock method="PUT" path="/api/leads/{uuid}/" description="Update an existing lead.">
                                        <CopyBlock text={`{ "stage": "Lost", "lost_reason": "Budget constraints (Required)", "name": "Updated Name" }`} />
                                    </EndpointBlock>
                                    <EndpointBlock method="DELETE" path="/api/leads/{uuid}/" description="Delete a lead.">
                                        <CopyBlock text={`curl -X DELETE https://climatebycodex.com/api/leads/{uuid}/ \\\n-H "Authorization: Token YOUR_TOKEN"`} />
                                    </EndpointBlock>
                                </>)}

                                {activeTab === 'clients' && (<>
                                    <SectionTitle>Clients</SectionTitle>
                                    <EndpointBlock method="GET" path="/api/clients/" description="List all clients. Supports filtering by name.">
                                        <CopyBlock text={`curl -X GET "https://climatebycodex.com/api/clients/?name=Acme" \\\n-H "Authorization: Token YOUR_TOKEN"`} />
                                    </EndpointBlock>
                                    <EndpointBlock method="POST" path="/api/clients/" description="Create a new client.">
                                        <CopyBlock text={`{ "name": "Acme Corp", "attributes": { "industry": "Tech" } }`} />
                                    </EndpointBlock>
                                    <EndpointBlock method="PUT" path="/api/clients/{uuid}/" description="Update client details.">
                                        <CopyBlock text={`{ "name": "Acme Inc", "attributes": { "industry": "Finance" } }`} />
                                    </EndpointBlock>
                                    <EndpointBlock method="DELETE" path="/api/clients/{uuid}/" description="Delete a client.">
                                        <CopyBlock text={`curl -X DELETE https://climatebycodex.com/api/clients/{uuid}/ \\\n-H "Authorization: Token YOUR_TOKEN"`} />
                                    </EndpointBlock>
                                </>)}

                                {activeTab === 'contacts' && (<>
                                    <SectionTitle>Contacts</SectionTitle>
                                    <EndpointBlock method="GET" path="/api/contacts/" description="List all contacts. Supports filtering by client or name.">
                                        <CopyBlock text={`curl -X GET "https://climatebycodex.com/api/contacts/?client={client_uuid}" \\\n-H "Authorization: Token YOUR_TOKEN"`} />
                                    </EndpointBlock>
                                    <EndpointBlock method="POST" path="/api/contacts/" description="Create a new contact.">
                                        <CopyBlock text={`{ "client": "client-uuid", "first_name": "Maria", "last_name": "Lopez", "email": "m.lopez@example.com", "is_primary": true }`} />
                                    </EndpointBlock>
                                    <EndpointBlock method="PATCH" path="/api/contacts/{uuid}/" description="Update a contact.">
                                        <CopyBlock text={`{ "job_title": "CEO", "is_primary": true }`} />
                                    </EndpointBlock>
                                    <EndpointBlock method="DELETE" path="/api/contacts/{uuid}/" description="Delete a contact.">
                                        <CopyBlock text={`curl -X DELETE https://climatebycodex.com/api/contacts/{uuid}/ \\\n-H "Authorization: Token YOUR_TOKEN"`} />
                                    </EndpointBlock>
                                </>)}

                                {activeTab === 'services' && (<>
                                    <SectionTitle>Services</SectionTitle>
                                    <EndpointBlock method="GET" path="/api/services/" description="Retrieve services provided to clients.">
                                        <CopyBlock text={`curl -X GET https://climatebycodex.com/api/services/ \\\n-H "Authorization: Token YOUR_TOKEN"`} />
                                    </EndpointBlock>
                                    <EndpointBlock method="POST" path="/api/services/" description="Create a service.">
                                        <CopyBlock text={`{ "name": "Jane Doe", "client": "client-uuid", "attributes": { "program": "Full Stack" } }`} />
                                    </EndpointBlock>
                                    <EndpointBlock method="PUT" path="/api/services/{uuid}/" description="Update service details.">
                                        <CopyBlock text={`{ "name": "Jane Doe Smith", "attributes": { "program": "Data Science" } }`} />
                                    </EndpointBlock>
                                    <EndpointBlock method="DELETE" path="/api/services/{uuid}/" description="Delete a service.">
                                        <CopyBlock text={`curl -X DELETE https://climatebycodex.com/api/services/{uuid}/ \\\n-H "Authorization: Token YOUR_TOKEN"`} />
                                    </EndpointBlock>
                                </>)}

                                {activeTab === 'pipelines' && (<>
                                    <SectionTitle>Pipelines</SectionTitle>
                                    <p className="text-sm" style={{ color: "#6b6560" }}>Manage sales processes and stages.</p>
                                    <EndpointBlock method="GET" path="/api/pipelines/" description="List all configured pipelines." />
                                    <EndpointBlock method="POST" path="/api/pipelines/">
                                        <p className="text-sm mb-3" style={{ color: "#6b6560" }}>"Won" and "Lost" stages are <strong>automatically appended</strong>. Do <strong>not</strong> include them in your payload.</p>
                                        <CopyBlock text={`{\n  "name": "B2B Sales",\n  "stages": [\n    {"name": "Prospecting", "color": "#6c6f73", "order": 1},\n    {"name": "Negotiation", "color": "#007bff", "order": 2}\n  ]\n}`} />
                                    </EndpointBlock>
                                    <EndpointBlock method="PUT" path="/api/pipelines/{uuid}/" description="Update a pipeline.">
                                        <CopyBlock text={`{ "name": "B2B Sales V2", "stages": [{"name": "Qualification", "color": "#6c6f73", "order": 1}] }`} />
                                    </EndpointBlock>
                                    <EndpointBlock method="DELETE" path="/api/pipelines/{uuid}/" description="Delete a pipeline.">
                                        <CopyBlock text={`curl -X DELETE https://climatebycodex.com/api/pipelines/{uuid}/ \\\n-H "Authorization: Token YOUR_TOKEN"`} />
                                    </EndpointBlock>
                                </>)}

                                {activeTab === 'followups' && (<>
                                    <SectionTitle>Follow Ups</SectionTitle>
                                    <p className="text-sm" style={{ color: "#6b6560" }}>Interactions logged against a specific Service.</p>
                                    <EndpointBlock method="GET" path="/services/{service_id}/follow-ups/" description="List follow-ups for a specific service." />
                                    <EndpointBlock method="POST" path="/services/{service_id}/follow-ups/">
                                        <CopyBlock text={`{ "follow_up_date": "2025-01-15T10:00:00Z", "comment": "Sent brochure.", "attributes": { "channel": "email" } }`} />
                                    </EndpointBlock>
                                    <EndpointBlock method="PUT" path="/services/{service_id}/follow-ups/{uuid}/" description="Update a follow-up interaction.">
                                        <CopyBlock text={`{ "comment": "Sent updated brochure and pricing.", "follow_up_date": "2025-01-16T10:00:00Z" }`} />
                                    </EndpointBlock>
                                    <EndpointBlock method="DELETE" path="/services/{service_id}/follow-ups/{uuid}/" description="Delete a follow-up.">
                                        <CopyBlock text={`curl -X DELETE https://climatebycodex.com/services/{service_id}/follow-ups/{uuid}/ \\\n-H "Authorization: Token YOUR_TOKEN"`} />
                                    </EndpointBlock>
                                </>)}

                                {activeTab === 'catalogue' && (<>
                                    <SectionTitle>Catalogue & Categories</SectionTitle>
                                    <p className="text-sm" style={{ color: "#6b6560" }}>Manage products, services, subscriptions, and their categories.</p>
                                    <EndpointBlock method="GET" path="/api/categories/" description="List product and service categories." />
                                    <EndpointBlock method="POST" path="/api/categories/" description="Create a new category.">
                                        <CopyBlock text={`{ "name": "Software", "description": "Software products", "parent": null }`} />
                                    </EndpointBlock>
                                    <EndpointBlock method="GET" path="/api/catalogue/" description="List catalogue items. Supports filtering by category or type." />
                                    <EndpointBlock method="POST" path="/api/catalogue/" description="Create a new catalogue item.">
                                        <CopyBlock text={`{ "category": "category-uuid", "name": "Web Development", "type": "service", "base_price": "100.00", "currency": "USD", "unit": "hour", "is_active": true }`} />
                                    </EndpointBlock>
                                    <EndpointBlock method="PATCH" path="/api/catalogue/{uuid}/" description="Update a catalogue item.">
                                        <CopyBlock text={`{ "base_price": "120.00" }`} />
                                    </EndpointBlock>
                                    <EndpointBlock method="DELETE" path="/api/catalogue/{uuid}/" description="Delete a catalogue item.">
                                        <CopyBlock text={`curl -X DELETE https://climatebycodex.com/api/catalogue/{uuid}/ \\\n-H "Authorization: Token YOUR_TOKEN"`} />
                                    </EndpointBlock>
                                    <p className="text-sm font-semibold mt-4" style={{ color: "#2E2A26" }}>Base Fields Guide</p>
                                    <InfoBlock title="Category Fields" color="#5E6A43" items={[
                                        <><code>name</code>: The name of the category.</>,
                                        <><code>description</code>: Details about the category's purpose.</>,
                                        <><code>parent</code>: UUID of a parent category to create subcategories.</>,
                                    ]} />
                                    <InfoBlock title="Catalogue Item Fields" color="#B8C76A" items={[
                                        <><code>name</code>: The name of the product or service.</>,
                                        <><code>type</code>: product, service, or subscription.</>,
                                        <><code>base_price</code> &amp; <code>currency</code>: Standard pricing.</>,
                                        <><code>unit</code>: Unit of measure (hour, seat, month).</>,
                                        <><code>tax_rate</code>: Default tax percentage.</>,
                                        <><code>inventory</code>: Optional link to physical stock.</>,
                                    ]} />
                                    <InfoBlock title="Inventory Fields" color="#F29B6B" items={[
                                        <><code>sku</code>: Unique Stock Keeping Unit for tracking.</>,
                                        <><code>quantity_on_hand</code>: Current available stock.</>,
                                        <><code>reorder_level</code>: Threshold for low stock warnings.</>,
                                        <><code>location</code>: Physical location of the stock.</>,
                                    ]} />
                                </>)}

                                {activeTab === 'invoices' && (<>
                                    <SectionTitle>Invoices & Payments</SectionTitle>
                                    <p className="text-sm" style={{ color: "#6b6560" }}>Billing, invoicing, and payment tracking.</p>
                                    <EndpointBlock method="GET" path="/api/invoices/" description="List invoices." />
                                    <EndpointBlock method="POST" path="/api/invoices/" description="Create a draft invoice.">
                                        <CopyBlock text={`{ "client": "client-uuid", "status": "draft", "issue_date": "2026-02-26", "due_date": "2026-03-26", "currency": "USD" }`} />
                                    </EndpointBlock>
                                    <EndpointBlock method="PATCH" path="/api/invoices/{uuid}/" description="Update an invoice status.">
                                        <CopyBlock text={`{ "status": "sent" }`} />
                                    </EndpointBlock>
                                    <EndpointBlock method="POST" path="/api/invoices/{invoice_uuid}/line-items/" description="Add a line item to an invoice.">
                                        <CopyBlock text={`{ "catalogue_item": "item-uuid", "description": "Web Dev - 20h", "quantity": "20.00", "unit_price": "100.00", "tax_rate": "15.00" }`} />
                                    </EndpointBlock>
                                    <EndpointBlock method="POST" path="/api/invoices/{invoice_uuid}/payments/" description="Record a payment for an invoice.">
                                        <CopyBlock text={`{ "amount": "2300.00", "method": "bank_transfer", "paid_at": "2026-03-01T10:00:00Z", "reference": "WIRE-2026-001" }`} />
                                    </EndpointBlock>
                                    <p className="text-sm font-semibold mt-4" style={{ color: "#2E2A26" }}>Base Fields Guide</p>
                                    <InfoBlock title="Invoice Fields" color="#5E6A43" items={[
                                        <><code>client</code> &amp; <code>contact</code>: Entities responsible for the invoice.</>,
                                        <><code>status</code>: draft, sent, paid, overdue, void.</>,
                                        <><code>issue_date</code> &amp; <code>due_date</code>: Billing timelines.</>,
                                        <><code>subtotal</code>, <code>tax_amount</code>, <code>discount</code>, <code>total</code>: Auto-calculated.</>,
                                        <><code>amount_paid</code>: Total covered by registered payments.</>,
                                    ]} />
                                    <InfoBlock title="Invoice Line Item Fields" color="#B8C76A" items={[
                                        <><code>catalogue_item</code>: Optional reference to a predefined product/service.</>,
                                        <><code>description</code>: Specific details of what is being charged.</>,
                                        <><code>quantity</code> &amp; <code>unit_price</code>: Used to calculate line subtotal.</>,
                                        <><code>tax_rate</code>: Tax percentage for this specific line.</>,
                                    ]} />
                                </>)}

                                {activeTab === 'assets' && (<>
                                    <SectionTitle>Assets</SectionTitle>
                                    <p className="text-sm" style={{ color: "#6b6560" }}>Manage physical company assets and personnel assignments.</p>
                                    <EndpointBlock method="GET" path="/api/assets/" description="List all physical assets." />
                                    <EndpointBlock method="POST" path="/api/assets/" description="Create a new asset.">
                                        <CopyBlock text={`{ "name": "MacBook Pro", "description": "2023 16-inch model", "bought_date": "2023-01-15", "price": "2000.00", "quantity": 10 }`} />
                                    </EndpointBlock>
                                    <EndpointBlock method="GET" path="/api/asset-assignments/" description="List all asset lending assignments." />
                                    <EndpointBlock method="POST" path="/api/asset-assignments/" description="Lend an asset to personnel.">
                                        <CopyBlock text={`{ "asset": "asset-uuid", "borrow_date": "2023-06-01", "name": "John Doe", "email": "john@example.com", "lending_amount": 1 }`} />
                                    </EndpointBlock>
                                </>)}

                                {activeTab === 'attributes' && (<>
                                    <SectionTitle>Attributes & Metadata</SectionTitle>
                                    <EndpointBlock method="GET" path="/api/attributes/{entity}/">
                                        <p className="text-sm mb-3" style={{ color: "#6b6560" }}>
                                            Get schema/attributes for an entity.<br />
                                            Options: <code>client</code>, <code>contact</code>, <code>service</code>, <code>lead</code>, <code>follow_up</code>, <code>category</code>, <code>catalogue_item</code>, <code>invoice</code>, <code>payment</code>, <code>asset</code>, <code>asset_assignment</code>.
                                        </p>
                                        <CopyBlock text={`curl -X GET https://climatebycodex.com/api/attributes/lead/ \\\n-H "Authorization: Token YOUR_TOKEN"`} />
                                    </EndpointBlock>
                                </>)}

                                {activeTab === 'webhooks' && (<>
                                    <SectionTitle>Webhooks</SectionTitle>
                                    <p className="text-sm" style={{ color: "#6b6560" }}>Automate HTTP callbacks triggered by events (CREATE, UPDATE, DELETE) on any model.</p>
                                    <EndpointBlock method="GET" path="/api/webhooks/" description="List all registered webhooks." />
                                    <EndpointBlock method="POST" path="/api/webhooks/">
                                        <p className="text-sm mb-3" style={{ color: "#6b6560" }}>Create a new Webhook. Supports variable interpolation via <code>{'{self.field_name}'}</code> syntax in URLs, headers, and custom payloads.</p>
                                        <CopyBlock text={`{\n  "name": "Notify External System",\n  "model": "Lead",\n  "event": "CREATE",\n  "url": "https://api.external.com/hooks/{self.id}",\n  "method": "POST",\n  "is_active": true,\n  "conditions": [{ "field": "stage", "operator": "=", "value": "Moodle" }],\n  "payload": { "email": "{self.attributes.email}" }\n}`} />
                                    </EndpointBlock>
                                    <EndpointBlock method="PUT" path="/api/webhooks/{uuid}/" description="Update an existing webhook configuration." />
                                    <EndpointBlock method="DELETE" path="/api/webhooks/{uuid}/" description="Delete a webhook." />
                                </>)}

                                {activeTab === 'files' && (<>
                                    <SectionTitle>File Uploads</SectionTitle>
                                    <p className="text-sm" style={{ color: "#6b6560" }}>Upload and link attachments to system records like Clients or Services via S3.</p>
                                    <EndpointBlock method="POST" path="/api/clients/{uuid}/files/" description="Upload an image/file and attach it to a Client.">
                                        <CopyBlock text={`curl -X POST https://climatebycodex.com/api/clients/{uuid}/files/ \\\n  -H "Authorization: Token YOUR_TOKEN" \\\n  -H "Content-Type: multipart/form-data" \\\n  -F "file=@/path/to/local/image.jpg"`} />
                                    </EndpointBlock>
                                    <EndpointBlock method="POST" path="/api/services/{uuid}/files/" description="Upload a file to a Service. The API responds with the generated S3 public URL.">
                                        <CopyBlock text={`{ "url": "https://bucket.s3.amazonaws.com/services/uuid/image.jpg" }`} />
                                    </EndpointBlock>
                                </>)}

                            </div>
                        </div>
                    </CardContent>
                </Card>

            </div>
        </div>
    );
};
