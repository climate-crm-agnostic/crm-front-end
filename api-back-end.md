# CRM API Documentation Climates by Codex 2026

This API enables management of Clients, Contacts, Services, Leads, Pipelines, Catalogue (Categories, Items, Pricing), Invoices, and Payments within the CRM.

## Authentication
Token Authentication is required for all requests.

**Header**: `Authorization: Token <your_token>`

### Obtain Token
**POST** `/api-token-auth/`
```json
{
    "username": "your_username",
    "password": "your_password"
}
```
**Response:**
```json
{ "token": "<your_token>" }
```

### Get User Context
**GET** `/api/me/`
Returns current user permissions and group membership.
```json
{
    "id": 1,
    "username": "user.name",
    "groups": ["Sales"],
    "permissions": ["app.add_lead", "app.view_client"]
}
```

---

## 1. Attributes (Dynamic Schema)
**CRITICAL:** Attributes define the schema for Clients, Services, and Leads. They must be created first.

### List Attributes
**GET** `/api/attributes/<entity_name>/`
*(entity_name: client, service, lead, lead_client_info, follow_up, contact, category, catalogue_item, invoice, invoice_line_item, payment, inventory, asset, asset_assignment)*

> **Note on Lead Items**: The `items` array under a Lead automatically validates its `attributes` using the **`service`** entity schema. This ensures data consistency between pre-sales (Leads) and operations (Services).

**Response:**
```json
[
    {
        "id": "uuid",
        "name": "industry",
        "label": "Industry",
        "type": "text",
        "is_required": true
    }
]
```

### Create Attribute
**POST** `/api/attributes/<entity_name>/`

**Payload:**
```json
{
    "name": "industry",
    "label": "Industry Sector",
    "type": "text",   // Options: text, number, date, boolean, list, file
    "is_required": true,
    "list_values": ["Tech", "Health"] // Optional
}
```

### Update Attribute
**PUT/PATCH** `/api/attributes/<attribute_uuid>/`

**Payload:**
```json
{
    "label": "Industry Group",
    "is_required": false
}
```

### Delete Attribute
**DELETE** `/api/attributes/<attribute_uuid>/`

---

## 2. Clients

### List Clients
**GET** `/api/clients/`
*Query Params: ?name=Acme*

### Create Client
**POST** `/api/clients/`

**Payload:**
```json
{
    "name": "Acme Corp",
    "attributes": {
        "industry": "Tech",
        "custom_field": "value"
    },
    "list_of_tasks": [],
    "list_of_notes": []
}
```

### Manage Client Tasks and Notes
You can add tasks and notes to a client by including them in the `list_of_tasks` or `list_of_notes` arrays.
**Note:** The system uses `UUIDs` to uniquely identify each task and note. If you add a task or note without an `id`, the system will automatically generate a UUID for it.


**Task Structure:**
```json
{
    "task": "Call client",
    "date": "2025-01-20",
    "completed": false,
    "user_id": 1,                         // Output Only
    "user_name": "John Doe"               // Output Only
}
```

**Note Structure:**
```json
{
    "note": "Client requested new proposal",
    "user_id": 1,                         // Output Only
    "user_name": "John Doe"               // Output Only
}
```

**Example - Add Task and Note (PATCH):**
```json
{
    "list_of_tasks": [
        { "task": "New Task", "date": "2026-01-01", "completed": false }
    ],
    "list_of_notes": [
        { "note": "Spoke with CEO", "user_id": 1 }
    ]
}
```

### Retrieve Client
**GET** `/api/clients/<uuid>/`

### Update Client
**PUT** `/api/clients/<uuid>/`

**Payload:**
```json
{
    "name": "Acme Inc",
    "attributes": {
    "attributes": {
        "industry": "Finance"
    }
}
```

### Client Atomic Updates
Avoid race conditions by using these atomic endpoints instead of updating the full lists.

#### Update Task Status
**POST** `/api/clients/<uuid>/update-task/`
```json
{
    "task_id": "uuid-of-task",
    "completed": true
}
```

#### Delete Note
**POST** `/api/clients/<uuid>/delete-note/`
```json
{
    "id": "uuid-of-note"
}
```

### Partial Update Client
**PATCH** `/api/clients/<uuid>/`

**Payload:**
```json
{
    "name": "Acme International"
}
```

### Delete Client
**DELETE** `/api/clients/<uuid>/`

#### Client Fields Reference
| Field Name | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | Unique identifier (Auto-generated) |
| `name` | String | Name of the client/company (Max 255 chars) |
| `attributes` | JSONB | Dynamic key-value attributes (e.g., industry, source) |
| `list_of_tasks` | JSONB | List of tasks `{task, date, completed, date_created, user_id (Output Only), user_name (Output Only)}` |
| `list_of_notes` | JSONB | List of notes `{date, note, user_id (Output Only), user_name (Output Only)}` |
| `list_of_images` | JSONB | List of image URLs |
| `created_at` | DateTime | Timestamp of creation |
| `created_by` | User | User who created the record |

---

## 3. Services (Students)

### List Services
**GET** `/api/services/`
*Query Params: ?client=<uuid>*

### Create Service
**POST** `/api/services/`

**Payload:**
```json
{
    "name": "Jane Doe",
    "client": "<client_uuid>",
    "attributes": {
        "program": "Full Stack"
    },
    "list_of_tasks": [],
    "list_of_notes": []
}
```

### Manage Service Tasks and Notes
Similar to Clients and Leads, Services support task and note management.
**Note:** The system uses `UUIDs` to uniquely identify each task and note. If you add a task or note without an `id`, the system will automatically generate a UUID for it.

**Example - Add Task and Note (PATCH):**
```json
{
    "list_of_tasks": [
        { "task": "Prepare Materials", "date": "2026-02-01", "completed": false }
    ],
    "list_of_notes": [
        { "note": "Student requested delay", "user_id": 1 }
    ]
}
```

### Service Atomic Updates

#### Update Task Status
**POST** `/api/services/<uuid>/update-task/`
```json
{
    "task_id": "uuid-of-task",
    "completed": true
}
```

#### Delete Note
**POST** `/api/services/<uuid>/delete-note/`
```json
{
    "id": "uuid-of-note"
}
```

### Retrieve Service
**GET** `/api/services/<uuid>/`

### Update Service
**PUT** `/api/services/<uuid>/`

**Payload:**
```json
{
    "name": "Jane Doe Smith",
    "client": "<client_uuid>",
    "attributes": {
        "program": "Data Science"
    }
}
```

### Delete Service
**DELETE** `/api/services/<uuid>/`

#### Service Fields Reference
| Field Name | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | Unique identifier (Auto-generated) |
| `name` | String | Name of the student/service |
| `client` | ForeignKey | UUID of the associated Client |
| `actual_cohort` | ForeignKey | Current active Cohort |
| `origin_cohort` | UUID (FK) | Original cohort assigned to the service |
| `attributes` | JSONB | Dynamic key-value attributes |
| `list_of_tasks` | JSONB | List of tasks `{task, date, completed, date_created, user_id (Output Only), user_name (Output Only)}` |
| `list_of_notes` | JSONB | List of notes `{date, note, user_id (Output Only), user_name (Output Only)}` |
| `list_of_images` | JSONB | List of image URLs |
| `created_at` | DateTime | Timestamp of creation |

---

## 4. Pipelines

### List Pipelines
**GET** `/api/pipelines/`

### Create Pipeline
**POST** `/api/pipelines/`

**Payload:**
```json
{
    "name": "B2B Sales",
    "description": "Main sales process",
    "stages": [
        {"name": "Prospecting", "color": "#6c6f73", "order": 1},
        {"name": "Negotiation", "color": "#007bff", "order": 2}
    ]
}
```

> **Note**: The stages "Won" and "Lost" are **automatically appended** to every pipeline with `order: 99` and `order: 100`, respectively.
> You **cannot** manually add stages named "Won", "Lost" (case-insensitive) in the payload; doing so will result in a validation error.
> **Limit**: Use a maximum of 98 custom stages to accommodate the auto-generated ones (Total max: 100).


### Retrieve Pipeline
**GET** `/api/pipelines/<uuid>/`

### Update Pipeline
**PUT** `/api/pipelines/<uuid>/`

**Payload:**
```json
{
    "name": "B2B Sales V2",
    "stages": [
        {"name": "Qualification", "color": "#6c6f73", "order": 1},
        {"name": "Closed", "color": "#28a745", "order": 2}
    ]
}
```

### Delete Pipeline
**DELETE** `/api/pipelines/<uuid>/`

#### Pipeline Fields Reference
| Field Name | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | Unique identifier |
| `name` | String | Name of the pipeline |
| `description` | Text | Optional description |
| `stages` | JSONB | List of initial stages. "Won" and "Lost" are auto-appended. Custom stages must not use these reserved names. |

---

## 5. Leads

### List Leads
**GET** `/api/leads/`
*Query Params: ?responsible=<user_id>&stage=Prospecting*

### Create Lead
**POST** `/api/leads/`

**Payload:**
```json
{
    "name": "Potential Student",
    "responsible": 1,
    "pipeline": "<pipeline_id_optional>",
    "stage": "Prospecting",
    "attributes": {
        "source": "LinkedIn"
    },
    "client_attributes": {
        "age": 25,
        "location": "New York"
    },
    "items": [
        {
            "catalogue_item": "UUID-OF-CATALOGUE-ITEM",
            "quantity": 1,
            "custom_price": 5000,
            "attributes": {
                "dynamic_field": "value"
            }
        }
    ],
    "list_of_tasks": [
        {
            "task": "Initial call",
            "date": "2025-01-20",
            "completed": false
        }
    ]
}
```

### Manage Lead Tasks
You can add tasks to a lead by including them in the `list_of_tasks` array.
The system automatically adds a `date_created` timestamp to new tasks if it's missing.
**Note:** The system uses `UUIDs` to uniquely identify each task and note. If you add a task or note without an `id`, the system will automatically generate a UUID for it.

**Task Structure:**
```json
{
    "task": "Description of the task",    // Required
    "date": "YYYY-MM-DD",                 // Target date
    "completed": false,                   // Status
    "date_created": "ISO-8601 Timestamp", // Auto-generated
    "user_id": 1,                         // Output Only
    "user_name": "User Name"              // Output Only
}
```

**Example - Add a new task (PATCH):**
To add a task, you append it to the list. 
**Note:** The API usually replaces the entire list on update, so ensure you send the existing tasks + the new one, OR use a specialized endpoint if available (currently standard REST update replaces field value).

```json
{
    "list_of_tasks": [
        {
            "task": "Previous task",
            "date": "...",
            "completed": true
        },
        {
            "task": "New Follow-up",
            "date": "2025-02-01",
            "completed": false
        }
    ]
}
```

### Retrieve Lead
**GET** `/api/leads/<uuid>/`

### Update Lead
**PUT** `/api/leads/<uuid>/`

**Payload:**
```json
{
    "name": "Interested Student",
    "stage": "Negotiation",
    "responsible": 2
}
```

**Note:** If updating `stage` to **"Lost"**, you **must** include `lost_reason`.

```json
{
    "stage": "Lost",
    "lost_reason": "Budget constraints"
}
```

### ⚡ Lead Won Automation (Services & Invoices)
When a Lead's `stage` is updated to **"Won"**, the system triggers an automatic generation of operational and billing records based on the `items` attached to the Lead:

- **If the catalogue item is `product`**: The system will generate **only an Invoice**. Products are considered physical constraints or one-time sales that do not require an active "Service" to be tracked.
- **If the catalogue item is `service` or `subscription`**: The system will generate an **Invoice** (for the initial charge) AND an active **Service** record. This new `Service` will automatically map and inherit all the dynamic `attributes` that were configured in the `LeadItem` (e.g., permits, issuing agencies, etc.), making it operational immediately.

*Note: If the Lead has multiple items (e.g., 1 product and 1 subscription), they will all be bundled into a **single Master Invoice**, generating only the necessary Service records for the subscription items.*

### Lead Atomic Updates

#### Update Task Status
**POST** `/api/leads/<uuid>/update-task/`
```json
{
    "task_id": "uuid-of-task",
    "completed": true
}
```

#### Delete Note
**POST** `/api/leads/<uuid>/delete-note/`
```json
{
    "id": "uuid-of-note"
}
```

### Delete Lead
**DELETE** `/api/leads/<uuid>/`

#### Lead Fields Reference
| Field Name | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | Unique identifier |
| `name` | String | Name of the lead |
| `responsible` | ForeignKey | User ID of the responsible person |
| `pipeline` | ForeignKey | Pipeline ID |
| `possible_client` | UUID | Optional link to an existing client |
| `moodle_course_id` | String | Optional Moodle Course ID |
| `stage` | String | Current stage name |
| `lost_reason` | String | Required when stage is 'Lost'. Reason for losing the deal. |
| `attributes` | JSONB | Dynamic attributes |
| `client_attributes` | JSONB | Attributes for potential new client (validates against `lead_client_info`) |
| `items` | Array of Objects | **(NEW)** List of `LeadItem` objects. Each takes `{catalogue_item (UUID), quantity, custom_price, attributes (JSONB)}` |
| `service_attributes` | JSONB | *(DEPRECATED)* Legacy array of services. Please migrate to the `items` structure. |
| `list_of_tasks` | JSONB | List of tasks `{task, date, completed, date_created, user_id (Output Only), user_name (Output Only)}` |
| `list_of_notes` | JSONB | List of notes `{date, note, user_id (Output Only), user_name (Output Only)}` |

---

## 6. Follow-Ups (Service Interactions)

### List Follow-Ups
**GET** `/services/<service_id>/follow-ups/`

### Create Follow-Up
**POST** `/services/<service_id>/follow-ups/`

**Payload:**
```json
{
    "attributes": {
        "channel": "email"
    },
    "follow_up_date": "2025-01-15T10:00:00Z",
    "comment": "Sent brochure."
}
```

### Retrieve Follow-Up
**GET** `/services/<service_id>/follow-ups/<uuid>/`

### Update Follow-Up
**PUT** `/services/<service_id>/follow-ups/<uuid>/`

**Payload:**
```json
{
    "comment": "Sent updated brochure and pricing.",
    "follow_up_date": "2025-01-16T10:00:00Z"
}
```

### Delete Follow-Up
**DELETE** `/services/<service_id>/follow-ups/<uuid>/`

---

## 7. File Uploads
Files are stored in S3 and linked to entities.

### Upload Service (Student) Image
**POST** `/api/services/<uuid>/files/`
*Content-Type: multipart/form-data* 
*Body: file=<binary_data>*

**Response:**
```json
{
    "url": "https://bucket.s3.amazonaws.com/services/uuid/image.jpg",
    "list_of_images": ["url1", "url2"]
}
```

### Upload Client Image
**POST** `/api/clients/<uuid>/files/`
*Content-Type: multipart/form-data* 
*Body: file=<binary_data>*

---

## 8. Users (Read-Only Lists)

### List Instructors
**GET** `/api/instructors/`
Returns users in the 'Instructors' group.

### List TAs
**GET** `/api/tas/`
Returns users in the 'Teacher Assistant' group.

### List Sales
**GET** `/api/sales/`
Returns users in the 'Sales' group.

### List Operations
**GET** `/api/operations/`
Returns users in the 'Operations' group.


## 9. Webhooks
Webhooks allow you to configure HTTP callbacks triggered by events (CREATE, UPDATE, DELETE) on any model in the system.

**Supported Models:** Lead, Client, Service, FollowUp, Contact, Category, CatalogueItem, Inventory, Invoice, InvoiceLineItem, Payment, Asset, AssetAssignment

> **Note:** All models have full signal support via Django's `post_save` signal. Webhooks fire automatically on create, update, and soft-delete for every supported model.

### List Webhooks
**GET** `/api/webhooks/`

### Create Webhook
**POST** `/api/webhooks/`

**Payload:**
```json
{
    "name": "Notify External System",
    "model": "Lead",            // Options: Lead, Client, Service, FollowUp, Contact, Category, CatalogueItem, Inventory, Invoice, InvoiceLineItem, Payment
    "event": "CREATE",          // Options: CREATE, UPDATE, DELETE (Default: UPDATE)
    "url": "https://api.external.com/hooks/{id}",
    "method": "POST",           // Options: POST, PUT, PATCH, DELETE, GET
    "headers": {
        "Authorization": "Bearer token",
        "X-Custom-ID": "{id}"
    },
    "is_active": true,
    "conditions": [            // Optional: Only trigger if these rules pass
        { "field": "stage", "operator": "=", "value": "Moodle" },
        { "field": "self.attributes.source", "operator": "=", "value": "Web" }
    ],
    "condition_logic": "AND",   // Options: AND, OR
    "payload": {                // Optional: Custom body template
        "external_id": "{self.id}",
        "data": {
            "email": "{self.attributes.email}",
            "full_name": "{self.name}"
        }
    }
}
```

**Conditional Execution:**
You can define a list of `conditions` that must be met for the webhook to trigger.
- **Fields**: Supports dot notation for nested fields (e.g., `self.stage`, `self.attributes.industry`).
- **Operators**: `=`, `!=`, `>`, `<`, `>=`, `<=`, `in`, `contains`.
- **Logic**: 
    - `AND`: All conditions must be true.
    - `OR`: At least one condition must be true.

**Template Substitution:**
You can use `{self.field_name}` placeholders in `url`, `headers`, and `payload` values. These will be replaced by the corresponding values from the triggered instance.
- **Support for Nested Data**: You can access nested attributes using dot notation, e.g., `{self.attributes.email}`.
- **Dynamic URL**: The URL field is now a string that supports placeholders, e.g., `https://api.example.com/hooks/{self.id}`.
- **Custom Payload**: If `payload` is defined, it will be used as the request body with placeholders substituted. Otherwise, the full object data is sent.

### Retrieve Webhook
**GET** `/api/webhooks/<uuid>/`

### Update Webhook
**PUT/PATCH** `/api/webhooks/<uuid>/`

### Delete Webhook
**DELETE** `/api/webhooks/<uuid>/`

---

## 10. Contacts
Contacts represent individual people at a Client (company). A client can have many contacts.

### List Contacts
**GET** `/api/contacts/`
*Query Params: ?client=<uuid>&is_primary=true&first_name=Maria*

### Create Contact
**POST** `/api/contacts/`

**Payload:**
```json
{
    "client": "<client_uuid>",
    "first_name": "Maria",
    "last_name": "Lopez",
    "email": "m.lopez@example.com",
    "phone": "+504 9999-1234",
    "job_title": "CFO",
    "is_primary": true,
    "attributes": {
        "linkedin_url": "https://linkedin.com/in/maria"
    },
    "list_of_tasks": [],
    "list_of_notes": []
}
```

### Retrieve Contact
**GET** `/api/contacts/<uuid>/`

### Update Contact
**PATCH** `/api/contacts/<uuid>/`

**Payload:**
```json
{
    "job_title": "CEO",
    "is_primary": true
}
```

### Contact Atomic Updates

#### Update Task Status
**POST** `/api/contacts/<uuid>/update-task/`
```json
{
    "task_id": "uuid-of-task",
    "completed": true
}
```

#### Delete Note
**POST** `/api/contacts/<uuid>/delete-note/`
```json
{
    "id": "uuid-of-note"
}
```

### Delete Contact
**DELETE** `/api/contacts/<uuid>/`

#### Contact Fields Reference
| Field Name | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | Unique identifier (Auto-generated) |
| `client` | ForeignKey | UUID of the associated Client |
| `first_name` | String | First name (Max 150 chars) |
| `last_name` | String | Last name (Max 150 chars) |
| `full_name` | String | Read-only computed field (first + last) |
| `client_name` | String | Read-only computed field (associated client's name) |
| `email` | Email | Optional email address |
| `phone` | String | Optional phone number |
| `job_title` | String | Optional job title |
| `is_primary` | Boolean | Whether this is the primary contact for the client |
| `attributes` | JSONB | Dynamic key-value attributes |
| `list_of_tasks` | JSONB | List of tasks `{task, date, completed, date_created, user_id, user_name}` |
| `list_of_notes` | JSONB | List of notes `{date, note, user_id, user_name}` |

---

## 11. Catalogue
The catalogue module manages Categories, Catalogue Items (products/services/subscriptions), and Price Tiers.

### 11.1 Categories
Dynamic, user-defined categories with unlimited subcategory depth.

#### List Categories
**GET** `/api/categories/`
*Query Params: ?name=Software&parent=<uuid>*

#### Create Category
**POST** `/api/categories/`

**Payload:**
```json
{
    "name": "Software",
    "description": "Software products and licenses",
    "parent": null,
    "attributes": {}
}
```

**Create Subcategory:**
```json
{
    "name": "SaaS",
    "description": "Cloud-based subscriptions",
    "parent": "<parent_category_uuid>",
    "attributes": {}
}
```

#### Retrieve Category
**GET** `/api/categories/<uuid>/`

#### Update Category
**PATCH** `/api/categories/<uuid>/`

#### Delete Category
**DELETE** `/api/categories/<uuid>/`

#### Category Fields Reference
| Field Name | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | Unique identifier |
| `name` | String | Category name (Max 255 chars) |
| `description` | Text | Optional description |
| `parent` | ForeignKey | UUID of parent category (null = root category) |
| `attributes` | JSONB | Dynamic key-value attributes |

---

### 11.2 Catalogue Items
Reusable product, service, or subscription definitions with pricing.

#### List Catalogue Items
**GET** `/api/catalogue/`
*Query Params: ?category=<uuid>&type=service&is_active=true&sku=WEB-DEV-001*

#### Create Catalogue Item
**POST** `/api/catalogue/`

**Payload:**
```json
{
    "category": "<category_uuid>",
    "name": "Web Development",
    "inventory": "<inventory_uuid>",
    "description": "Custom web development, hourly rate",
    "type": "service",
    "base_price": "100.00",
    "currency": "USD",
    "unit": "hour",
    "tax_rate": "15.00",
    "is_active": true,
    "attributes": {}
}
```

**Type Options:** `product`, `service`, `subscription`

#### Retrieve Catalogue Item
**GET** `/api/catalogue/<uuid>/`

#### Update Catalogue Item
**PATCH** `/api/catalogue/<uuid>/`

#### Upload Catalogue Item Image
**POST** `/api/catalogue/<uuid>/files/`
*Content-Type: multipart/form-data*
*Body: file=<binary_data>*

**Response:**
```json
{
    "url": "https://bucket.s3.amazonaws.com/catalogue/uuid/image.jpg",
    "list_of_images": ["url1", "url2"]
}
```

#### Delete Catalogue Item
**DELETE** `/api/catalogue/<uuid>/`

#### Catalogue Item Fields Reference
| Field Name | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | Unique identifier |
| `category` | ForeignKey | Optional UUID of parent Category |
| `name` | String | Item name (Max 255 chars) |
| `inventory` | OneToOneField | Optional UUID of Inventory record |
| `description` | Text | Optional description |
| `type` | String | `product`, `service`, or `subscription` |
| `base_price` | Decimal | Base price (12,2) |
| `currency` | String | ISO currency code (default: USD) |
| `unit` | String | Unit of measure (e.g. "hour", "seat", "month") |
| `tax_rate` | Decimal | Tax percentage (e.g. 15.00 = 15%) |
| `stripe_price_id` | String | Optional Stripe Price ID |
| `is_active` | Boolean | Whether item is available |
| `list_of_images` | JSONB | List of S3 image URLs |
| `attributes` | JSONB | Dynamic key-value attributes |



### 11.3 Inventory
Tracks physical stock for Catalogue Items. Services usually do not require Inventory.

#### List Inventory
**GET** `/api/inventory/`
*Query Params: ?sku=TEST-SKU-123*

#### Create Inventory
**POST** `/api/inventory/`

**Payload:**
```json
{
    "sku": "PHYSICAL-PROD-001",
    "quantity_on_hand": "50.00",
    "reorder_level": "10.00",
    "location": "Aisle 4, Bin B",
    "attributes": {
        "color": "red",
        "size": "L"
    }
}
```

#### Retrieve Inventory
**GET** `/api/inventory/<uuid>/`

#### Update Inventory
**PATCH** `/api/inventory/<uuid>/`

#### Delete Inventory
**DELETE** `/api/inventory/<uuid>/`

#### Inventory Fields Reference
| Field Name | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | Unique identifier |
| `sku` | String | Unique Stock Keeping Unit |
| `quantity_on_hand` | Decimal | Current stock amount (12,2) |
| `reorder_level` | Decimal | Level at which to reorder stock (12,2) |
| `location` | String | Optional physical location (Aisle, Bin, etc.) |
| `attributes` | JSONB | Dynamic key-value attributes |

---

## 12. Invoices & Payments
Full invoice lifecycle with line items and payment tracking. Stripe integration fields are optional.

### 12.1 Invoices

#### List Invoices
**GET** `/api/invoices/`
*Query Params: ?client=<uuid>&status=draft&currency=USD&invoice_number=INV-20260226-A3F1*

#### Create Invoice
**POST** `/api/invoices/`

**Payload:**
```json
{
    "client": "<client_uuid>",
    "contact": "<contact_uuid>",
    "status": "draft",
    "issue_date": "2026-02-26",
    "due_date": "2026-03-26",
    "currency": "USD",
    "subtotal": "0.00",
    "tax_amount": "0.00",
    "discount": "0.00",
    "total": "0.00",
    "notes": "30-day payment terms.",
    "attributes": {}
}
```

> **Note:** `invoice_number` is **auto-generated** in the format `INV-YYYYMMDD-XXXX` (e.g. `INV-20260226-A3F1`). It is read-only.

#### Retrieve Invoice
**GET** `/api/invoices/<uuid>/`

#### Update Invoice
**PATCH** `/api/invoices/<uuid>/`
```json
{
    "status": "sent"
}
```

#### Recalculate Invoice Totals
**POST** `/api/invoices/<uuid>/recalculate/`

Recalculates `subtotal`, `tax_amount`, and `total` from all active line items. Call this after adding, updating, or removing line items.

**Response:** Returns the updated invoice object with recalculated totals.

#### Invoice Atomic Updates

##### Update Task Status
**POST** `/api/invoices/<uuid>/update-task/`
```json
{
    "task_id": "uuid-of-task",
    "completed": true
}
```

##### Delete Note
**POST** `/api/invoices/<uuid>/delete-note/`
```json
{
    "id": "uuid-of-note"
}
```

#### Delete Invoice
**DELETE** `/api/invoices/<uuid>/`

#### Invoice Fields Reference
| Field Name | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | Unique identifier |
| `client` | ForeignKey | UUID of the Client |
| `contact` | ForeignKey | Optional UUID of the Contact |
| `invoice_number` | String | Auto-generated, read-only (e.g. `INV-20260226-A3F1`) |
| `status` | String | `draft`, `sent`, `paid`, `overdue`, `void`, `refunded` |
| `issue_date` | Date | Invoice issue date |
| `due_date` | Date | Payment due date |
| `currency` | String | ISO currency code (default: USD) |
| `subtotal` | Decimal | Sum of line item subtotals |
| `tax_amount` | Decimal | Total tax amount |
| `discount` | Decimal | Discount to apply |
| `total` | Decimal | Final total (subtotal + tax - discount) |
| `amount_paid` | Decimal | Total paid so far (auto-updated from Payments) |
| `balance_due` | Decimal | Read-only: total - amount_paid |
| `notes` | Text | Optional notes |
| `stripe_invoice_id` | String | Optional Stripe Invoice ID |
| `stripe_payment_intent_id` | String | Optional Stripe Payment Intent ID |
| `stripe_hosted_url` | URL | Optional Stripe hosted payment page URL |
| `stripe_pdf_url` | URL | Optional Stripe PDF download URL |
| `attributes` | JSONB | Dynamic key-value attributes |
| `list_of_tasks` | JSONB | List of tasks |
| `list_of_notes` | JSONB | List of notes |

---

### 12.2 Invoice Line Items (Nested under Invoice)
Each line represents a product or service on the invoice. Can reference a Catalogue Item or be free-form.

#### List Line Items
**GET** `/api/invoices/<invoice_uuid>/line-items/`

#### Create Line Item (from Catalogue)
**POST** `/api/invoices/<invoice_uuid>/line-items/`

**Payload:**
```json
{
    "invoice": "<invoice_uuid>",
    "catalogue_item": "<catalogue_item_uuid>",
    "description": "Web Development — 20 hours",
    "quantity": "20.00",
    "unit_price": "100.00",
    "tax_rate": "15.00",
    "attributes": {}
}
```

#### Create Free-Form Line Item (no catalogue)
**POST** `/api/invoices/<invoice_uuid>/line-items/`

**Payload:**
```json
{
    "invoice": "<invoice_uuid>",
    "description": "Setup & Configuration Fee",
    "quantity": "1.00",
    "unit_price": "250.00",
    "tax_rate": "0.00",
    "attributes": {}
}
```

> **Note:** `subtotal` is **auto-calculated** on save as `quantity × unit_price`. It is read-only.

#### Retrieve Line Item
**GET** `/api/invoices/<invoice_uuid>/line-items/<uuid>/`

#### Update Line Item
**PATCH** `/api/invoices/<invoice_uuid>/line-items/<uuid>/`

#### Delete Line Item
**DELETE** `/api/invoices/<invoice_uuid>/line-items/<uuid>/`

#### Line Item Fields Reference
| Field Name | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | Unique identifier |
| `invoice` | ForeignKey | UUID of parent Invoice |
| `catalogue_item` | ForeignKey | Optional UUID of Catalogue Item |
| `description` | String | Line description (Max 500 chars) |
| `quantity` | Decimal | Quantity (10,2) |
| `unit_price` | Decimal | Price per unit (12,2) |
| `tax_rate` | Decimal | Tax rate as percentage (e.g. 15.00) |
| `subtotal` | Decimal | Auto-calculated: quantity × unit_price (read-only) |
| `attributes` | JSONB | Dynamic key-value attributes |

---

### 12.3 Payments (Nested under Invoice)
Records payment events. An invoice can have multiple partial payments. When total payments cover the invoice total, the status auto-updates to `paid`.

#### List Payments
**GET** `/api/invoices/<invoice_uuid>/payments/`

#### Create Payment
**POST** `/api/invoices/<invoice_uuid>/payments/`

**Bank Transfer / Manual Payment:**
```json
{
    "invoice": "<invoice_uuid>",
    "amount": "2300.00",
    "method": "bank_transfer",
    "paid_at": "2026-03-01T10:00:00Z",
    "reference": "WIRE-2026-001",
    "notes": "Wire transfer confirmed.",
    "attributes": {}
}
```

**Stripe Payment:**
```json
{
    "invoice": "<invoice_uuid>",
    "amount": "2300.00",
    "method": "stripe",
    "paid_at": "2026-03-01T10:00:00Z",
    "stripe_charge_id": "ch_XXXXYYYYZZZZ",
    "attributes": {}
}
```

**Method Options:** `stripe`, `bank_transfer`, `cash`, `check`, `other`

> **Auto-update:** When a payment is created, the system automatically updates `invoice.amount_paid` and sets the invoice status to `paid` when the total is fully covered.

#### Retrieve Payment
**GET** `/api/invoices/<invoice_uuid>/payments/<uuid>/`

#### Update Payment
**PATCH** `/api/invoices/<invoice_uuid>/payments/<uuid>/`

#### Delete Payment
**DELETE** `/api/invoices/<invoice_uuid>/payments/<uuid>/`

#### Payment Fields Reference
| Field Name | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | Unique identifier |
| `invoice` | ForeignKey | UUID of parent Invoice |
| `amount` | Decimal | Payment amount (14,2) |
| `method` | String | `stripe`, `bank_transfer`, `cash`, `check`, `other` |
| `paid_at` | DateTime | When the payment was made |
| `stripe_charge_id` | String | Optional Stripe Charge ID |
| `reference` | String | Optional manual reference (wire transfer ref, check number) |
| `notes` | Text | Optional notes |
| `attributes` | JSONB | Dynamic key-value attributes |

---

## 13. Assets
Tracks physical company assets and their assignments/loans to individuals.

### 13.1 Assets

#### List Assets
**GET** `/api/assets/`

#### Create Asset
**POST** `/api/assets/`

**Payload:**
```json
{
    "name": "MacBook Pro",
    "description": "2023 16-inch model",
    "bought_date": "2023-01-15",
    "price": "2000.00",
    "quantity": 10,
    "attributes": {}
}
```

#### Retrieve Asset
**GET** `/api/assets/<uuid>/`

#### Update Asset
**PATCH** `/api/assets/<uuid>/`

#### Delete Asset
**DELETE** `/api/assets/<uuid>/`

#### Asset Fields Reference
| Field Name | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | Unique identifier |
| `name` | String | Name of the asset |
| `description` | Text | Optional detailed description |
| `bought_date` | Date | Optional date of purchase |
| `price` | Decimal | Asset price (12,2) |
| `quantity` | Integer | Total amount currently in stock |
| `attributes` | JSONB | Dynamic key-value attributes |

---

### 13.2 Asset Assignments
Records the lending and return of assets to specific personnel. Creating an assignment automatically deducts the `lending_amount` from the linked Asset's `quantity`. Returning an asset (filling `return_date`) automatically restores the quantity.

#### List Asset Assignments
**GET** `/api/asset-assignments/`

#### Create Asset Assignment
**POST** `/api/asset-assignments/`

**Payload:**
```json
{
    "asset": "<asset_uuid>",
    "borrow_date": "2023-06-01",
    "lending_amount": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+123456789",
    "address": "123 Main St",
    "state": "California",
    "country": "USA",
    "attributes": {}
}
```

#### Retrieve Asset Assignment
**GET** `/api/asset-assignments/<uuid>/`

#### Register Return (Update Asset Assignment)
**PATCH** `/api/asset-assignments/<uuid>/`

**Payload:**
```json
{
    "return_date": "2023-06-15"
}
```

#### Delete Asset Assignment
**DELETE** `/api/asset-assignments/<uuid>/`

#### Asset Assignment Fields Reference
| Field Name | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | Unique identifier |
| `asset` | ForeignKey | UUID of the parent Asset |
| `borrow_date` | Date | Date the asset was borrowed |
| `return_date` | Date | Optional date the asset was returned |
| `lending_amount` | Integer | Quantity of the asset lent (default: 1) |
| `name` | String | Name of the borrower |
| `email` | String | Email of the borrower |
| `phone` | String | Phone of the borrower |
| `address` | String | Physical address line |
| `state` | String | State/Province |
| `country` | String | Country |
| `attributes` | JSONB | Dynamic key-value attributes |
