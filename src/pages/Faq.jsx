
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { HelpCircle, ArrowLeft } from "lucide-react";
import { useNavigate } from 'react-router-dom';

export const Faq = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen p-6 md:p-12" style={{ backgroundColor: "var(--background)", fontFamily: '"Source Sans 3", Arial, sans-serif' }}>
            <div className="max-w-3xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                        <div
                            className="flex h-12 w-12 items-center justify-center rounded-xl"
                            style={{ backgroundColor: "rgba(94,106,67,0.12)", border: "1px solid rgba(94,106,67,0.3)" }}
                        >
                            <HelpCircle className="h-6 w-6" style={{ color: "var(--secondary)" }} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold tracking-tight" style={{ color: "var(--foreground)" }}>Frequently Asked Questions</p>
                            <p className="text-sm mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                                Common questions about using the CRM system.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 h-9 px-3 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                        style={{ border: "1px solid var(--border)", backgroundColor: "transparent", color: "var(--muted-foreground)" }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = "var(--card)"}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
                    >
                        <ArrowLeft className="h-4 w-4" /> Back
                    </button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>General Usage</CardTitle>
                        <CardDescription>Basics of navigating and using the platform.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="item-1">
                                <AccordionTrigger>How do I reset my password?</AccordionTrigger>
                                <AccordionContent>
                                    If you are logged in, go to your User Profile menu (top right) and select "Account".
                                    If you cannot log in, please contact your system administrator to initiate a password reset.
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="item-2">
                                <AccordionTrigger>What is the difference between a Lead, a Client, and a Contact?</AccordionTrigger>
                                <AccordionContent>
                                    A <strong>Lead</strong> is a potential opportunity or interested party that has not yet purchased a service.
                                    A <strong>Client</strong> is an organization or entity that has an established relationship with us.
                                    A <strong>Contact</strong> is an individual person who belongs to a Client organization.
                                    Leads can be converted into Clients and their respective Contacts once they close a deal.
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="item-lead-automation">
                                <AccordionTrigger>Can I automate the creation of Leads?</AccordionTrigger>
                                <AccordionContent>
                                    Yes! You can automate the creation of a <strong>Lead</strong> for a specific service by using <strong>Webhooks</strong>. By setting up an automatic trigger from an external system (like a contact form on your website), a new lead can be directly injected into your CRM without manual entry.
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Sales & Pipelines</CardTitle>
                        <CardDescription>Managing your sales process.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="item-3">
                                <AccordionTrigger>How do Pipelines work?</AccordionTrigger>
                                <AccordionContent>
                                    Pipelines represent your sales process. Each pipeline is made up of multiple <strong>Stages</strong> (e.g., Prospecting, Negotiation, Closed).
                                    You can move Leads between stages to track their progress towards a sale.
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="item-4">
                                <AccordionTrigger>Can I customize the stages?</AccordionTrigger>
                                <AccordionContent>
                                    Yes! Administrators can create custom Pipelines and define their own Stages with specific colors and ordering in the Pipelines configuration section.
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="item-pipeline-won-lost">
                                <AccordionTrigger>What are the "Won" and "Lost" pipeline stages?</AccordionTrigger>
                                <AccordionContent>
                                    When you create a new Pipeline, the system automatically generates a <strong>Won</strong> and a <strong>Lost</strong> stage for it. These are permanent, system-defined stages used to track the final outcome of a lead. Because they are automatically appended to every pipeline, you do not need to manually create them when defining your custom stages.
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="item-lead-lost-reason">
                                <AccordionTrigger>What is a "Lost Reason"?</AccordionTrigger>
                                <AccordionContent>
                                    When a Lead is moved to the system-defined <strong>Lost</strong> stage, you can provide a <strong>Lost Reason</strong>. This helps you track and analyze why potential deals fell through (e.g., "Price too high", "Went with competitor", "Unresponsive"), allowing you to improve your sales process over time.
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Catalogue & Billing</CardTitle>
                        <CardDescription>Managing your products, services, and invoices.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="item-cat-1">
                                <AccordionTrigger>Categories vs. Catalogue Items</AccordionTrigger>
                                <AccordionContent>
                                    <strong>Categories</strong> group similar offerings (like "Software" or "Consulting"). <strong>Catalogue Items</strong> are the specific products, services, or subscriptions that you sell, which belong to a Category and have a predefined price.
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="item-inv-1">
                                <AccordionTrigger>How do Invoices work?</AccordionTrigger>
                                <AccordionContent>
                                    You can create <strong>Invoices</strong> for Clients. Add <strong>Line Items</strong> from your Catalogue to the invoice, and the system will automatically calculate the subtotal and total. When you record <strong>Payments</strong>, the invoice status will automatically update to "paid" once fully covered.
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="item-fields-cat">
                                <AccordionTrigger>What do the different Category and Catalogue fields mean?</AccordionTrigger>
                                <AccordionContent>
                                    <ul className="list-disc list-inside space-y-2 mt-2">
                                        <li><strong>Category Fields:</strong> <code className="px-1 rounded font-mono text-xs" style={{ backgroundColor: "var(--card)", color: "var(--secondary)" }}>name</code> (the category name), <code className="px-1 rounded font-mono text-xs" style={{ backgroundColor: "var(--card)", color: "var(--secondary)" }}>description</code> (details about the category's purpose), and <code className="px-1 rounded font-mono text-xs" style={{ backgroundColor: "var(--card)", color: "var(--secondary)" }}>parent</code> (links to a parent category to create subcategories).</li>
                                        <li><strong>Catalogue Item Fields:</strong> <code className="px-1 rounded font-mono text-xs" style={{ backgroundColor: "var(--card)", color: "var(--secondary)" }}>name</code> (product/service name), <code className="px-1 rounded font-mono text-xs" style={{ backgroundColor: "var(--card)", color: "var(--secondary)" }}>type</code> (product, service, or subscription), <code className="px-1 rounded font-mono text-xs" style={{ backgroundColor: "var(--card)", color: "var(--secondary)" }}>base_price</code> & <code className="px-1 rounded font-mono text-xs" style={{ backgroundColor: "var(--card)", color: "var(--secondary)" }}>currency</code> (standard pricing), <code className="px-1 rounded font-mono text-xs" style={{ backgroundColor: "var(--card)", color: "var(--secondary)" }}>unit</code> (unit of measure like hour or seat), <code className="px-1 rounded font-mono text-xs" style={{ backgroundColor: "var(--card)", color: "var(--secondary)" }}>tax_rate</code> (applicable tax percentage), and <code className="px-1 rounded font-mono text-xs" style={{ backgroundColor: "var(--card)", color: "var(--secondary)" }}>inventory</code> (link to physical stock).</li>
                                        <li><strong>Inventory Fields:</strong> <code className="px-1 rounded font-mono text-xs" style={{ backgroundColor: "var(--card)", color: "var(--secondary)" }}>sku</code> (unique tracking code), <code className="px-1 rounded font-mono text-xs" style={{ backgroundColor: "var(--card)", color: "var(--secondary)" }}>quantity_on_hand</code> (current stock), <code className="px-1 rounded font-mono text-xs" style={{ backgroundColor: "var(--card)", color: "var(--secondary)" }}>reorder_level</code> (threshold for low stock warnings), and <code className="px-1 rounded font-mono text-xs" style={{ backgroundColor: "var(--card)", color: "var(--secondary)" }}>location</code> (physical location of the item).</li>
                                    </ul>
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="item-fields-inv">
                                <AccordionTrigger>What do the different Invoice fields mean?</AccordionTrigger>
                                <AccordionContent>
                                    <ul className="list-disc list-inside space-y-2 mt-2">
                                        <li><strong>Invoice Fields:</strong> <code className="px-1 rounded font-mono text-xs" style={{ backgroundColor: "var(--card)", color: "var(--secondary)" }}>client</code> & <code className="px-1 rounded font-mono text-xs" style={{ backgroundColor: "var(--card)", color: "var(--secondary)" }}>contact</code> (who the invoice is for), <code className="px-1 rounded font-mono text-xs" style={{ backgroundColor: "var(--card)", color: "var(--secondary)" }}>status</code> (draft, sent, paid, overdue, etc.), <code className="px-1 rounded font-mono text-xs" style={{ backgroundColor: "var(--card)", color: "var(--secondary)" }}>issue_date</code> & <code className="px-1 rounded font-mono text-xs" style={{ backgroundColor: "var(--card)", color: "var(--secondary)" }}>due_date</code> (billing timelines), auto-calculated financial summaries like <code className="px-1 rounded font-mono text-xs" style={{ backgroundColor: "var(--card)", color: "var(--secondary)" }}>subtotal</code>, <code className="px-1 rounded font-mono text-xs" style={{ backgroundColor: "var(--card)", color: "var(--secondary)" }}>tax_amount</code>, <code className="px-1 rounded font-mono text-xs" style={{ backgroundColor: "var(--card)", color: "var(--secondary)" }}>discount</code>, & <code className="px-1 rounded font-mono text-xs" style={{ backgroundColor: "var(--card)", color: "var(--secondary)" }}>total</code>, and <code className="px-1 rounded font-mono text-xs" style={{ backgroundColor: "var(--card)", color: "var(--secondary)" }}>amount_paid</code> (tracked from payments).</li>
                                        <li><strong>Invoice Line Item Fields:</strong> <code className="px-1 rounded font-mono text-xs" style={{ backgroundColor: "var(--card)", color: "var(--secondary)" }}>catalogue_item</code> (reference to a predefined catalog item), <code className="px-1 rounded font-mono text-xs" style={{ backgroundColor: "var(--card)", color: "var(--secondary)" }}>description</code> (specific details of the charge), <code className="px-1 rounded font-mono text-xs" style={{ backgroundColor: "var(--card)", color: "var(--secondary)" }}>quantity</code> & <code className="px-1 rounded font-mono text-xs" style={{ backgroundColor: "var(--card)", color: "var(--secondary)" }}>unit_price</code> (used for line subtotal), and <code className="px-1 rounded font-mono text-xs" style={{ backgroundColor: "var(--card)", color: "var(--secondary)" }}>tax_rate</code> (tax percentage for that specific line).</li>
                                    </ul>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Advanced Features</CardTitle>
                        <CardDescription>Webhooks and Integrations.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="item-5">
                                <AccordionTrigger>What are Webhooks?</AccordionTrigger>
                                <AccordionContent>
                                    Think of Webhooks as <strong>automatic triggers</strong>. Instead of having to constantly check the CRM to see if something changed, a Webhook automatically sends a notification to another system the moment an event happens (like a new Lead coming in or an Invoice getting paid).
                                    <br /><br />
                                    You can configure these triggers in the Webhooks section by providing a destination URL, choosing which module to listen to (like Leads or Clients), and defining the conditions that must be met to fire the trigger.
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="item-6">
                                <AccordionTrigger>How do I test the API?</AccordionTrigger>
                                <AccordionContent>
                                    Please refer to our <a href="/apidocs" className="text-blue-600 underline font-medium">API Documentation</a> for detailed guides on how to authenticate and make requests to our API endpoints.
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </CardContent>
                </Card>

                <div className="text-center text-sm pt-8" style={{ color: "var(--muted-foreground)", borderTop: "1px solid var(--border)", paddingTop: "2rem" }}>
                    Still have questions? Contact support at{" "}
                    <a href="mailto:project@codex.academy" className="underline" style={{ color: "var(--secondary)" }}>project@codex.academy</a>
                </div>

            </div>
        </div>
    );
};
