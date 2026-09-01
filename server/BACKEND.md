# ERP Saphir Caisse — Backend Documentation

> **Purpose**: Complete reference for AI models and developers. Covers architecture, all endpoints, every database model, services, middleware, auth system, and background jobs.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Project Structure](#2-project-structure)
3. [App Startup & Configuration](#3-app-startup--configuration)
4. [Database](#4-database)
5. [All Models (44)](#5-all-models-44)
6. [All API Endpoints](#6-all-api-endpoints)
7. [Services](#7-services)
8. [Middleware](#8-middleware)
9. [Authentication & Authorization](#9-authentication--authorization)
10. [Stock Management System](#10-stock-management-system)
11. [Document Workflow](#11-document-workflow)
12. [Financial System](#12-financial-system)
13. [Background Work (in-process)](#13-background-work-in-process)
14. [External Integrations](#14-external-integrations)
15. [Utilities](#15-utilities)
16. [Enums & Constants](#16-enums--constants)
17. [Key Architectural Patterns](#17-key-architectural-patterns)

---

## 1. Overview

**ERP Saphir Caisse** is a multi-tenant ERP system for Moroccan businesses. It handles:

- **Sales cycle**: Quote → Order → Delivery Note → Invoice → Payment
- **Purchase cycle**: Goods Receipt → Supplier Return → Supplier Credit Note → Payment
- **Stock management**: Per-warehouse stock, transfers, physical inventory counts, reservations
- **Clients & Suppliers**: With credit limits, payment deadlines, import/export
- **Advanced delivery**: Multi-status workflow with commercial/preparateur/livreur assignments
- **External delivery**: Ameex integration with webhook-based parcel tracking
- **Multi-tenancy**: Each company (Société) has fully isolated data

**Tech stack**:
- Runtime: Node.js (Express v5)
- ORM: Prisma v5.22 on MySQL 8
- Auth: JWT (access + refresh tokens)
- Background work: in-process async helpers (same Node server)
- PDF: PDFKit
- Excel/CSV: ExcelJS + json2csv + csv-parser
- Files: Multer + Sharp

---

## 2. Project Structure

```
src/
├── api/
│   ├── controllers/       # 34 controllers — thin layer, call services
│   ├── routes/            # 35 route files — define endpoints + middleware chain
│   ├── services/          # 37 service files — all business logic lives here
│   ├── middlewares/       # 8 middleware files
│   ├── validations/       # 34 Joi/express-validator schemas
│   └── utils/             # 16 utility modules
├── config/
│   ├── env.js             # Loads .env, exports: port, dbUri, jwtSecret
│   └── constants.js       # App constants
├── loaders/
│   ├── index.js           # Main loader orchestrator
│   ├── express.js         # Express middleware + route registration
│   └── prisma.js          # Prisma client singleton
├── jobs/
│   └── sendEmails.js      # Email job definitions
├── providers/
│   └── ameex.js           # Ameex delivery HTTP client
├── subscribers/           # Event subscribers
├── app.js                 # Express app setup
└── server.js              # Entry point — listens on PORT

prisma/
├── schema.prisma          # 44 models, all relations
├── seed.js                # DB seed script
└── migrations/            # Migration history
```

---

## 3. App Startup & Configuration

### Entry Point

`src/server.js` → `src/app.js` → `src/loaders/index.js`

```
server.js
  └─ app.js                   creates Express app, CORS, static /uploads
      └─ loaders/index.js
          ├─ express.js        registers all routes under /api
          └─ prisma.js         initialises Prisma client
```

**Default port**: `3000`  
**CORS origins allowed**: `http://localhost:5173`, `http://localhost:4173`  
**Static files**: `GET /uploads/<filename>` serves uploaded images

### Environment Variables (`.env`)

| Variable | Value / Purpose |
|---|---|
| `PORT` | `3000` |
| `BASE_URL` | `http://localhost:3000` |
| `DATABASE_URL` | `mysql://root:@localhost:3306/saphirDB` |
| `ACCESS_TOKEN_SECRET` | JWT secret for access tokens |
| `REFRESH_TOKEN_SECRET` | JWT secret for refresh tokens |
| `REFRESH_TOKEN_EXPIRY` | `7d` |
| `CREDENTIAL_ENCRYPTION_KEY` | AES key for storing API keys encrypted |
| `AMEEX_API_URL` | `https://api.ameex.app` |
| `AMEEX_API_ID` / `AMEEX_API_KEY` | Ameex delivery credentials |
| `NODE_ENV` | `development` |

### npm Scripts

| Script | Action |
|---|---|
| `npm run dev` | Dev server with watch mode |
| `npm start` | Production server |
| `npm run seed` | Seed the database |

---

## 4. Database

**Engine**: MySQL 8+  
**ORM**: Prisma v5.22  
**Schema file**: `prisma/schema.prisma`  
**Total models**: 44  
**Migrations**: `prisma/migrations/`  
**Seed**: `node prisma/seed.js`

### Multi-tenancy Design

- Every business entity belongs to a `Societe` (company) via `societeId`
- Catalogue models (Article, Category, Family, Unit, Attribute) are **global** (shared across all Sociétés)
- Per-Société overrides exist for pricing (`SocietePricing`) and packs (`Pack`)
- All queries in services filter by `societeId` unless the user is Super Admin

### Class Table Inheritance (Documents)

Client documents use a shared header table with specialised child tables:

```
ClientDocument (header: status, totals, clientId, documentNumber...)
  ├─ Devis            (validUntil, conditions...)
  ├─ Commande         (dateLivraisonPrevue, devisId...)
  ├─ BonLivraison     (depotId, deliveryId, commandStatus, colisTracking...)
  ├─ BonRetourClient  (motifRetour, bonLivraisonId...)
  ├─ Facture          (dateEcheance, penalitesRetard, bonLivraisonId...)
  └─ Avoir            (motif, factureId, bonRetourClientId...)

FournisseurDocument (header: same pattern)
  ├─ BonReception     (depotId, documentReference...)
  ├─ BonRetourFournisseur  (depotId, bonReceptionId...)
  └─ AvoirFournisseur (motif, bonRetourFournisseurId...)
```

The child row shares the same `id` as its parent `ClientDocument` row (1-to-1 relationship, shared PK).

---

## 5. All Models (44)

### System / Auth Models

#### `Societe` (Company)
Multi-tenant root. Every business belongs to one Société.

| Field | Type | Notes |
|---|---|---|
| `id` | Int PK | |
| `raisonSocial` | String | Company name |
| `logo` | String? | Path to logo |
| `address` | String? | |
| `tel` | String? | |
| `phone` | String? | |
| `email` | String? | |
| `siteWeb` | String? | |
| `ice` | String? unique | Moroccan tax ID (ICE) |
| `rc` | String? | Company register |
| `tp` | String? | Tax professional |
| `if` | String? | Fiscal identifier |
| `fixedStructure` | Json? | Custom invoice/document structure |
| `createdAt` / `updatedAt` | DateTime | |

#### `User`
| Field | Type | Notes |
|---|---|---|
| `id` | Int PK | |
| `societeId` | Int? | null only for super admin |
| `email` | String unique | Login credential |
| `name` | String | |
| `password` | String | bcrypt hashed |
| `isSuperAdmin` | Boolean | Bypasses all permission checks |
| `profile` | String? | Avatar image path |
| `active` | Boolean | Deactivated users cannot login |
| `roleId` | Int? | FK → Role |
| `createdAt` / `updatedAt` | DateTime | |

Relations: Role, ExtraPermissions (UserExtraPermission), RemovedPermissions (UserRemovedPermission)

#### `Role`
| Field | Type | Notes |
|---|---|---|
| `id` | Int PK | |
| `name` | String unique | e.g. "Caissier", "Gerant", "Societe_Admin", "Livreur" |

Relations: Users, RolePermissions

#### `Permission`
| Field | Type | Notes |
|---|---|---|
| `id` | Int PK | |
| `name` | String unique | e.g. "create_client", "edit_article" |

#### `RolePermission`
Composite PK: (`roleId`, `permissionId`)

#### `UserExtraPermission`
Composite PK: (`userId`, `permissionId`) — permissions granted ON TOP of role

#### `UserRemovedPermission`
Composite PK: (`userId`, `permissionId`) — permissions REMOVED from role

---

### Catalogue Models (Global — shared across all Sociétés)

#### `Category`
| Field | Type | Notes |
|---|---|---|
| `id` | Int PK | |
| `name` | String unique | |
| `image` | String? | |
| `visible` | Boolean | |
| `afficher` | Json? | Display config |
| `createdAt` / `updatedAt` | DateTime | |

#### `Family`
Belongs to Category. Groups articles with shared TVA rate.

| Field | Type | Notes |
|---|---|---|
| `id` | Int PK | |
| `categoryId` | Int | FK → Category |
| `name` | String unique | |
| `manageInStock` | Boolean | Whether to track stock |
| `TVA` | Float | Tax rate (%) |
| `image` | String? | |
| `visible` | Boolean | |
| `afficher` | Json? | |
| `remise` | Float | Default discount (%) |
| `createdAt` / `updatedAt` | DateTime | |

#### `Unit`
| Field | Type | Notes |
|---|---|---|
| `id` | Int PK | |
| `name` | String unique | |
| `symbol` | String | e.g. "kg", "L", "pcs" |
| `allowsFractional` | Boolean | Allow qty like 0.5 |

#### `Attribute`
Product attributes (e.g. "Color", "Size").

| Field | Type | Notes |
|---|---|---|
| `id` | Int PK | |
| `name` | String unique | |

#### `AttributeValue`
| Field | Type | Notes |
|---|---|---|
| `id` | Int PK | |
| `attributeId` | Int | FK → Attribute |
| `value` | String | e.g. "Red", "XL" |
| unique | | (`attributeId`, `value`) |

#### `Article`
Core product. Can have variants. Prices are base prices; per-Société overrides live in `SocietePricing`.

| Field | Type | Notes |
|---|---|---|
| `id` | Int PK | |
| `familyId` | Int | FK → Family |
| `barcode` | String unique | |
| `name` | String | |
| `image` | String? | |
| `visible` | Boolean | |
| `gereEnStock` | Boolean | Whether this article is stock-managed |
| `unitePrincipaleId` | Int? | FK → Unit |
| `uniteSecondaireId` | Int? | FK → Unit |
| `uniteComplementaireId` | Int? | FK → Unit |
| `conversionSecondaire` | Float? | Qty of principal = X of secondary |
| `conversionComplementaire` | Float? | |
| `prixAchat` | Float | Purchase price |
| `prixVente1` | Float | Retail price 1 |
| `prixVente2` | Float | Retail price 2 |
| `prixVente3` | Float | Retail price 3 |
| `dateExpiration` | DateTime? | Fixed expiry date |
| `dureeExpiration` | Int? | Duration in days from purchase |
| `remise` | Float | Default discount (%) |
| `createdAt` / `updatedAt` | DateTime | |

#### `ArticleVariant`
A variant of an Article (e.g. "Red XL T-Shirt"). Has its own barcode and stock.

| Field | Type | Notes |
|---|---|---|
| `id` | Int PK | |
| `articleId` | Int | FK → Article |
| `barcode` | String unique | |
| `name` | String | Auto-generated from attribute values |
| `archived` | Boolean | Soft delete |
| `createdAt` / `updatedAt` | DateTime | |

#### `VariantAttribute`
Links a variant to its attribute values. Composite PK: (`variantId`, `attributeId`).

| Field | Type | Notes |
|---|---|---|
| `variantId` | Int | FK → ArticleVariant |
| `attributeId` | Int | FK → Attribute |
| `attributeValueId` | Int | FK → AttributeValue |

---

### Per-Société Catalogue Overrides

#### `SocietePricing`
Overrides prices for a specific article or variant within a société.

| Field | Type | Notes |
|---|---|---|
| `id` | Int PK | |
| `societeId` | Int | |
| `articleId` | Int? | One of these — not both |
| `variantId` | Int? | One of these — not both |
| `prixAchat` | Float? | |
| `prixVente1` | Float? | |
| `prixVente2` | Float? | |
| `prixVente3` | Float? | |
| `remise` | Float? | |
| `active` | Boolean | |
| `createdAt` / `updatedAt` | DateTime | |

#### `Pack`
A product bundle sold as a unit (e.g. "Starter Kit"). Per-Société.

| Field | Type | Notes |
|---|---|---|
| `id` | Int PK | |
| `societeId` | Int | |
| `barcode` | String unique | |
| `name` | String | |
| `coutRevient` | Float | Calculated cost |
| `tauxMarge` | Float | Margin rate (%) |
| `montantVenteArticles` | Float | Sum of component retail prices |
| `remise` | Float | |
| `prixVentePack` | Float | Final selling price |
| `purchasePrice` | Float | Purchase cost |
| `active` | Boolean | |
| `createdAt` / `updatedAt` | DateTime | |

#### `PackComponent`
One line of a Pack. Either `articleId` or `variantId`, never both.

| Field | Type | Notes |
|---|---|---|
| `id` | Int PK | |
| `packId` | Int | |
| `articleId` | Int? | |
| `variantId` | Int? | |
| `quantity` | Float | |
| `priceField` | String | Which price to use: "prixVente1" (default) |

---

### Warehouse (Dépôt) Models

#### `Depot`
Physical warehouse or sales point.

| Field | Type | Notes |
|---|---|---|
| `id` | Int PK | |
| `societeId` | Int | |
| `code` | String | Short code |
| `name` | String | |
| `address` / `city` / `region` | String? | |
| `phone` / `email` | String? | |
| `manager` | String? | Manager name |
| `type` | Enum | PRINCIPAL, SECONDARY, OUTLET, TRANSIT |
| `surface` | Float? | Floor area (m²) |
| `capacity` | Int? | Max capacity |
| `active` | Boolean | |
| `createdAt` / `updatedAt` | DateTime | |

---

### Stock Models

#### `StockByDepot`
Current stock level for one product in one warehouse. Either `articleId` or `variantId`, never both.

| Field | Type | Notes |
|---|---|---|
| `id` | Int PK | |
| `depotId` | Int | |
| `articleId` | Int? | |
| `variantId` | Int? | |
| `quantityAvailable` | Float | Available for sale |
| `quantityReserved` | Float | Reserved for pending orders |
| `quantityInTransit` | Float | In a pending transfer |
| `alertThreshold` | Float? | Low-stock alert level |
| `location` | String? | Shelf/aisle location |
| `lastInventoryDate` | DateTime? | |
| `createdAt` / `updatedAt` | DateTime | |

#### `StockTransaction`
Immutable audit log of every stock movement. One row per movement.

| Field | Type | Notes |
|---|---|---|
| `id` | Int PK | |
| `depotId` | Int | |
| `articleId` / `variantId` | Int? | |
| `transactionType` | Enum | INBOUND, OUTBOUND, RETURN_IN, RETURN_OUT, ADJUSTMENT, TRANSFER_OUT, TRANSFER_IN, DAMAGED |
| `quantityChange` | Float | Positive or negative |
| `quantityAfter` | Float | Stock level after transaction |
| `reason` | String? | Human-readable reason |
| `referenceId` | String? | Document number or ID |
| `createdBy` | Int | userId |
| `transferId` | Int? | FK → StockTransfer |
| `inventoryId` | Int? | FK → Inventory |
| `bonLivraisonId` | Int? | FK → BonLivraison |
| `bonRetourClientId` | Int? | FK → BonRetourClient |
| `bonReceptionId` | Int? | FK → BonReception |
| `bonRetourFournisseurId` | Int? | FK → BonRetourFournisseur |
| `createdAt` | DateTime | |

#### `StockReservation`
Temporarily reserves stock for a pending order.

| Field | Type | Notes |
|---|---|---|
| `id` | Int PK | |
| `depotId` | Int | |
| `articleId` / `variantId` | Int? | |
| `orderId` | String | Reference to the order |
| `quantityReserved` | Float | |
| `status` | Enum | PENDING, FULFILLED, CANCELLED, EXPIRED |
| `expiresAt` | DateTime? | |
| `createdAt` / `updatedAt` | DateTime | |

#### `StockTransfer`
Moves stock between two depots within the same société.

| Field | Type | Notes |
|---|---|---|
| `id` | Int PK | |
| `societeId` | Int | |
| `transferNumber` | String | Auto-generated |
| `sourceDepotId` | Int | FK → Depot |
| `destinationDepotId` | Int | FK → Depot |
| `transferDate` | DateTime | |
| `status` | Enum | PENDING, COMPLETED |
| `notes` | String? | |
| `createdBy` | Int | userId |
| `validatedBy` | Int? | userId |
| `validatedAt` | DateTime? | |
| `createdAt` / `updatedAt` | DateTime | |

#### `StockTransferLine`
One product line within a transfer.

| Field | Type | Notes |
|---|---|---|
| `id` | Int PK | |
| `transferId` | Int | |
| `articleId` / `variantId` | Int? | |
| `lineNumber` | Int | |
| `quantityRequested` | Float | Qty to send |
| `quantityReceived` | Float? | Qty confirmed on arrival |

#### `Inventory`
Physical stock count session.

| Field | Type | Notes |
|---|---|---|
| `id` | Int PK | |
| `societeId` | Int | |
| `depotId` | Int | |
| `inventoryNumber` | String | Auto-generated |
| `inventoryDate` | DateTime | |
| `notes` | String? | |
| `gap` | Float? | Total discrepancy |
| `createdBy` | Int | userId |
| `validatedBy` | Int? | userId |
| `validatedAt` | DateTime? | |

#### `InventoryLine`
One counted product in an inventory.

| Field | Type | Notes |
|---|---|---|
| `id` | Int PK | |
| `inventoryId` | Int | |
| `articleId` / `variantId` | Int? | |
| `lineNumber` | Int | |
| `quantityTheoretical` | Float | What system expected |
| `quantityCounted` | Float | What was physically counted |
| `quantityDifference` | Float | Counted - Theoretical |

---

### Entity Models

#### `Client`
Per-Société customer.

| Field | Type | Notes |
|---|---|---|
| `id` | Int PK | |
| `societeId` | Int | |
| `name` | String | |
| `type` | Enum | PARTICULIER (individual), SOCIETE (company) |
| `address` | String? | |
| `region` | String? | |
| `phone` / `email` / `website` | String? | |
| `ice` / `if` / `rc` / `tp` | String? | Moroccan tax fields |
| `creditLimit` | Float? | Max credit allowed |
| `paymentDeadline` | Int? | Days until payment due |
| `discount` | Float | Default discount (%) |
| `active` | Boolean | |
| `isSystem` | Boolean | System client (cannot delete) |
| `createdAt` / `updatedAt` | DateTime | |

#### `Fournisseur`
Per-Société supplier. Same structure as Client plus bank fields.

| Extra Fields | Type | Notes |
|---|---|---|
| `bankAccount` | String? | IBAN/RIB |
| `bankName` | String? | |

(No `creditLimit`. No `isSystem`.)

#### `Delivery`
Driver or delivery person. Can be internal (User) or external.

| Field | Type | Notes |
|---|---|---|
| `id` | Int PK | |
| `societeId` | Int | |
| `userId` | Int? | If INTERN type, linked to a User |
| `name` | String | |
| `type` | Enum | INTERN, EXTERN |
| `entityType` | String? | |
| `address` | String? | |
| `tel` | String? | |
| `active` | Boolean | |

#### `Banque`
Bank definitions (global, not per-Société).

| Field | Type | Notes |
|---|---|---|
| `id` | Int PK | |
| `name` | String | |
| `RIB` | String? | Bank identifier |
| `ville` | String? | City |

#### `Agence`
Per-Société agency/branch.

| Field | Type | Notes |
|---|---|---|
| `id` | Int PK | |
| `societeId` | Int | |
| `name` | String | |
| `localisation` | String? | |
| `responsable` | String? | Manager name |
| `active` | Boolean | |

---

### Document Header Models

#### `ClientDocument`
Generic header for all client-facing documents. Specialized by child table.

| Field | Type | Notes |
|---|---|---|
| `id` | Int PK | |
| `societeId` | Int | |
| `clientId` | Int? | FK → Client (nullable for walk-in) |
| `clientName` | String? | Snapshot of client name at time of creation |
| `documentNumber` | String unique (per société) | Auto-generated |
| `status` | Enum | DRAFT, CONFIRMED, PARTIAL, COMPLETED, CANCELLED, PAID |
| `totalHT` | Float | Subtotal excluding tax |
| `totalTVA` | Float | Total tax |
| `totalTTC` | Float | Grand total including tax |
| `discount` | Float | Document-level global discount |
| `amountPaid` | Float | Amount already paid |
| `amountDue` | Float | Remaining balance |
| `notes` | String? | Client-visible notes |
| `internalNotes` | String? | Internal notes |
| `createdBy` | Int | userId |
| `createdAt` / `updatedAt` | DateTime | |

#### `ClientDocumentLine`
One product line in a ClientDocument.

| Field | Type | Notes |
|---|---|---|
| `id` | Int PK | |
| `documentId` | Int | FK → ClientDocument |
| `articleId` / `variantId` | Int? | |
| `lineNumber` | Int | Order of line |
| `description` | String? | Override label |
| `quantity` | Float | |
| `unitPrice` | Float | Price TTC |
| `remise` | Float | Line discount (value, not %) |
| `priceField` | String | "prixVente1", "prixVente2", "prixVente3" |
| `totalHT` | Float | |
| `tvaRate` | Float | TVA % |
| `totalTVA` | Float | |
| `totalTTC` | Float | |

#### `FournisseurDocument` / `FournisseurDocumentLine`
Mirror of ClientDocument/Line but for supplier documents.

---

### Specialized Document Child Models (Sales)

#### `Devis` (Quote)
Child of ClientDocument. Shared PK.

| Field | Type | Notes |
|---|---|---|
| `documentDate` | DateTime | |
| `validUntil` | DateTime? | Expiry of quote |
| `paymentMethod` | String? | |
| `remiseGlobale` | Float? | Global discount % |
| `conditions` | String? | Terms |

Workflow: Can generate → `Commande`

#### `Commande` (Sales Order)
Child of ClientDocument. Shared PK.

| Field | Type | Notes |
|---|---|---|
| `documentDate` | DateTime | |
| `dateConfirmation` | DateTime? | |
| `dateLivraisonPrevue` | DateTime? | Expected delivery date |
| `paymentMethod` | String? | |
| `conditionsPaiement` | String? | |
| `devisId` | Int? | FK → Devis (parent quote) |

Workflow: Can generate → `BonLivraison`

#### `BonLivraison` (Delivery Note)
Child of ClientDocument. Shared PK. Most complex document.

| Field | Type | Notes |
|---|---|---|
| `documentDate` | DateTime | |
| `dateLivraison` | DateTime? | |
| `depotId` | Int? | FK → Depot (stock source) |
| `deliveryId` | Int? | FK → Delivery (driver) |
| `commandeId` | Int? | FK → Commande |
| `type` | Enum | STANDARD, ADVANCED |
| `commandStatus` | Enum | See BonLivraisonStatus enum |
| **Advanced fields** | | Only used when type=ADVANCED |
| `agenceId` | Int? | FK → Agence |
| `heureLivraison` | String? | Expected delivery time |
| `telephone` / `whatsapp` | String? | Delivery contact |
| `ville` | String? | Delivery city |
| `localisation` | String? | GPS or address detail |
| `raisonSocial` / `ice` / `siegeSocial` | String? | Client legal info at delivery |
| `nombreDeColis` | Int? | Number of parcels |
| `observation` | String? | |
| `modeReglement` | String? | Payment method at delivery |
| **Assignments** | | |
| `commercialId` | Int? | User FK |
| `preparateurId` | Int? | User FK |
| `livreurId` | Int? | User FK (Livreur role) |
| **Reporting** | | |
| `isReported` | Boolean | Flagged as reported |
| `reportedAt` | DateTime? | |
| `reportedById` | Int? | |
| `reportReason` | String? | |
| `nextDeliveryDate` | DateTime? | Rescheduled date |
| `isSuspended` | Boolean | Temporarily suspended |
| **Colis tracking** | | |
| `colisTrackingNumber` | String? | External tracking code |
| `colisProvider` | String? | Provider name |
| `colisSync` | Enum | NOT_APPLICABLE, PENDING, CREATED, FAILED, RECEIVED |
| `providerConfigId` | Int? | FK → DeliveryProviderConfig |

Workflow: Can generate → `Facture`, `BonRetourClient`

#### `BonRetourClient` (Client Return)
Child of ClientDocument. Shared PK.

| Field | Type | Notes |
|---|---|---|
| `documentDate` | DateTime | |
| `dateRetour` | DateTime? | Physical return date |
| `depotId` | Int? | FK → Depot (where goods returned to) |
| `motifRetour` | String? | Return reason |
| `bonLivraisonId` | Int? | FK → BonLivraison (original delivery) |

Stock effect: Creates RETURN_IN transaction (+stock at depot).  
Workflow: Can generate → `Avoir`

#### `Facture` (Invoice)
Child of ClientDocument. Shared PK.

| Field | Type | Notes |
|---|---|---|
| `documentDate` | DateTime | |
| `dateEcheance` | DateTime? | Payment due date |
| `paymentMethod` | String? | |
| `penalitesRetard` | Float? | Late payment penalty % |
| `conditionsPaiement` | String? | |
| `bonLivraisonId` | Int? | FK → BonLivraison |

Workflow: Can generate → `Avoir`, receives `Payment` (type=RECEIVED)

#### `Avoir` (Client Credit Note)
Child of ClientDocument. Shared PK.

| Field | Type | Notes |
|---|---|---|
| `documentDate` | DateTime | |
| `motif` | String? | Reason for credit |
| `paymentMethod` | String? | |
| `factureId` | Int? | FK → Facture (credited invoice) |
| `bonRetourClientId` | Int? | FK → BonRetourClient |

Workflow: Receives `Payment` (type=REFUND)

---

### Specialized Document Child Models (Purchases)

#### `BonReception` (Goods Receipt)
Child of FournisseurDocument. Shared PK.

| Field | Type | Notes |
|---|---|---|
| `documentDate` | DateTime | |
| `dateReception` | DateTime? | Actual receipt date |
| `depotId` | Int? | FK → Depot (destination) |
| `documentReference` | String? | Supplier's document reference |

Stock effect: Creates INBOUND transaction (+stock).  
Workflow: Can generate → `BonRetourFournisseur`, `AvoirFournisseur`, receives `Payment` (type=PAID)

#### `BonRetourFournisseur` (Return to Supplier)
Child of FournisseurDocument. Shared PK.

| Field | Type | Notes |
|---|---|---|
| `documentDate` | DateTime | |
| `depotId` | Int? | FK → Depot (stock source) |
| `motifRetour` | String? | |
| `bonReceptionId` | Int? | FK → BonReception |

Stock effect: Creates RETURN_OUT transaction (−stock).

#### `AvoirFournisseur` (Supplier Credit Note)
Child of FournisseurDocument. Shared PK.

| Field | Type | Notes |
|---|---|---|
| `documentDate` | DateTime | |
| `motif` | String? | |
| `paymentMethod` | String? | |
| `bonRetourFournisseurId` | Int? | |
| `bonReceptionId` | Int? | Direct credit without return |

Workflow: Receives `Payment` (type=RECEIVED from supplier)

---

### Financial Models

#### `Payment`
Tracks individual payment events linked to documents.

| Field | Type | Notes |
|---|---|---|
| `id` | Int PK | |
| `paymentType` | Enum | CLIENT, FOURNISSEUR |
| `amount` | Float | |
| `paymentMethod` | Enum | ESPECES, CHEQUE, VIREMENT, CARTE, TRAITE, EFFET |
| `factureId` | Int? | |
| `avoirId` | Int? | |
| `bonReceptionId` | Int? | |
| `avoirFournisseurId` | Int? | |
| `paymentDate` | DateTime | |
| `reference` | String? | Cheque/transfer reference |
| `bankAccount` | String? | |
| `notes` | String? | |
| `createdBy` | Int | |

#### `ReglementClient`
A client payment settlement — one row per payment event, can cover multiple BL documents.

| Field | Type | Notes |
|---|---|---|
| `id` | Int PK | |
| `societeId` | Int | |
| `date` | DateTime | |
| `clientId` | Int | |
| `modeReglement` | Enum | ESPECE, CARTE_BANCAIRE, CHEQUE, EFFET, CARTE_FIDELITE, BON_ACHAT, REMISE, VIREMENT |
| `documentNumbers` | Json | Array of BL document numbers covered |
| `paymentBreakdown` | Json | Amount per document |
| `montantRegle` | Float | Amount paid now |
| `montantBL` | Float | Total of all covered BLs |
| `solde` | Float | Remaining balance |
| `refDocument` | String? | Cheque/transfer reference |
| `dateEcheance` | DateTime? | |
| `banqueId` | Int? | FK → Banque |
| `avanceId` | Int? | FK → advance payment |
| `avanceConsumed` | Float? | Amount of advance used |

#### `ReglementFournisseur`
Mirror of ReglementClient but links to BonReception documents.

#### `BonLivraisonAdvance`
Links an advance payment to a BL and records how much was applied.

| Field | Type | Notes |
|---|---|---|
| `bonLivraisonId` | Int | |
| `advanceId` | Int | |
| `amountApplied` | Float | |

#### `BonReceptionAdvance`
Same pattern for supplier advances.

---

### Status Tracking

#### `BonLivraisonStatusHistory`
Immutable log of every status transition on a BonLivraison.

| Field | Type | Notes |
|---|---|---|
| `id` | Int PK | |
| `bonId` | Int | FK → BonLivraison |
| `status` | Enum | BonLivraisonStatus |
| `note` | String? | Reason for transition |
| `userId` | Int | Who made the change |
| `createdAt` | DateTime | |

---

### Configuration Models

#### `DeliveryProviderConfig`
Stores encrypted API credentials for external delivery providers (e.g. Ameex).

| Field | Type | Notes |
|---|---|---|
| `id` | Int PK | |
| `societeId` | Int | |
| `provider` | String | Provider name (e.g. "ameex") |
| `name` | String | Display name |
| `apiId` | String | Encrypted |
| `apiKey` | String | Encrypted |
| `active` | Boolean | |
| `metadata` | Json? | Extra config |

#### `SystemSettings`
Single-row global system settings.

| Field | Type | Notes |
|---|---|---|
| `id` | Int PK | |
| `allowNegativeStock` | Boolean | Allow selling below zero stock |
| `systemStartHour` | Int | Business hours start |
| `systemEndHour` | Int | Business hours end |

#### `SettingsChangeLog`
Audit trail for settings changes.

| Field | Type | Notes |
|---|---|---|
| `id` | Int PK | |
| `settingName` | String | Which setting changed |
| `oldValue` | String | |
| `newValue` | String | |
| `changedBy` | Int | userId |
| `reason` | String? | |
| `changedAt` | DateTime | |

---

### Webhook / Tracking Models

#### `AmeexWebhookLog`
Raw webhook events from Ameex delivery provider.

| Field | Type | Notes |
|---|---|---|
| `id` | Int PK | |
| `trackingCode` | String | |
| `ameexStatus` | String | Raw status from Ameex |
| `rawPayload` | Json | Full webhook body |
| `status` | Enum | PENDING, PROCESSING, PROCESSED, FAILED |
| `processedAt` | DateTime? | |
| `error` | String? | If processing failed |

---

## 6. All API Endpoints

**Base path**: `/api`  
**Auth**: Most routes require `Authorization: Bearer <accessToken>` or cookie.

### Auth (`/api/auth`)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/signup` | Public | Register new user |
| POST | `/login` | Public | Login, returns tokens |
| POST | `/refresh` | Cookie | Refresh access token |
| POST | `/logout` | Cookie | Clear cookies |
| GET | `/me` | Required | Get current user |
| GET | `/verify` | Required | Verify token validity |
| POST | `/change-password` | Required | Change own password |
| POST | `/create-user` | Admin | Create user (admin action) |

### Users (`/api/users`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/me` | Required | Current user profile |
| GET | `/:id/statistics` | Required | User activity stats |
| GET | `/by-societe/:societeId` | Admin | Users by société |
| PATCH | `/:id/password` | Required | Update password |
| PATCH | `/:id/deactivate` | Admin | Deactivate user |
| PATCH | `/:id/reactivate` | Admin | Reactivate user |
| GET | `/` | Admin | List all users (paginated) |
| GET | `/:id` | Admin | Get user by ID |
| POST | `/` | Admin | Create user |
| PUT | `/:id` | Admin | Update user |
| DELETE | `/:id` | Super Admin | Delete user |

### Sociétés (`/api/societes`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/check-ice/:ice` | Public | Check ICE availability |
| GET | `/me` | Required | Get own société |
| GET | `/` | Super Admin | All sociétés |
| GET | `/ice/:ice` | Super Admin | Find by ICE |
| POST | `/` | Super Admin | Create société |
| GET | `/:id` | Required | Get by ID |
| GET | `/:id/statistics` | Required | Société statistics |
| PUT | `/:id` | Admin | Update société |
| DELETE | `/:id` | Super Admin | Delete société |

### Dépôts (`/api/depots`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | Required | List all dépôts |
| GET | `/active/list` | Required | Active dépôts only |
| GET | `/societe/:societeId` | Required | Dépôts by société |
| GET | `/:id` | Required | Get by ID |
| GET | `/:id/statistics` | Required | Dépôt statistics |
| POST | `/` | Admin | Create dépôt |
| PUT | `/:id` | Admin | Update dépôt |
| DELETE | `/:id` | Admin | Delete dépôt |

### Articles (`/api/articles`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/export/csv` | Required | Export to CSV |
| GET | `/export/excel` | Required | Export to Excel |
| POST | `/import/csv` | Admin | Import from CSV |
| POST | `/import/excel` | Admin | Import from Excel |
| GET | `/family/:familyId` | Required | Articles by family |
| GET | `/unified` | Required | Articles + variants with stock |
| GET | `/` | Required | List (paginated, filtered) |
| GET | `/:id` | Required | Get by ID |
| POST | `/` | Admin | Create article |
| PUT | `/:id` | Admin | Update article |
| DELETE | `/:id` | Admin | Delete article |

### Article Variants (`/api/article-variants`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | Required | List all variants |
| GET | `/:id` | Required | Get by ID |
| POST | `/` | Admin | Create variant |
| PUT | `/:id` | Admin | Update variant |
| DELETE | `/:id` | Admin | Delete variant |
| PATCH | `/:id/archive` | Admin | Archive variant |

### Categories (`/api/categories`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/export/csv` | Required | Export |
| GET | `/export/excel` | Required | Export |
| POST | `/import/csv` | Admin | Import |
| POST | `/import/excel` | Admin | Import |
| GET | `/` | Required | List all |
| GET | `/:id` | Required | Get by ID |
| POST | `/` | Admin | Create |
| PUT | `/:id` | Admin | Update |
| DELETE | `/:id` | Admin | Delete |

### Families (`/api/families`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | Required | List all |
| GET | `/:familyId/category` | Required | Families by category |
| GET | `/export/csv` | Required | Export |
| GET | `/export/excel` | Required | Export |
| POST | `/import/csv` | Admin | Import |
| POST | `/import/excel` | Admin | Import |
| POST | `/` | Admin | Create |
| GET | `/:id` | Required | Get by ID |
| PUT | `/:id` | Admin | Update |
| DELETE | `/:id` | Admin | Delete |

### Units (`/api/units`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | Required | List all |
| GET | `/:id` | Required | Get by ID |
| POST | `/` | Admin | Create |
| PUT | `/:id` | Admin | Update |
| DELETE | `/:id` | Admin | Delete |

### Attributes (`/api/attributes`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/with-values` | Required | All attributes with values |
| GET | `/:id` | Required | Get by ID |
| POST | `/` | Admin | Create |
| PUT | `/:id` | Admin | Update |
| DELETE | `/:id` | Admin | Delete |

### Clients (`/api/clients`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/stats/summary` | Required | Client statistics |
| GET | `/export/csv` | Required | Export |
| GET | `/export/excel` | Required | Export |
| POST | `/import/csv` | Admin | Import |
| POST | `/import/excel` | Admin | Import |
| GET | `/` | Required | List (société-scoped) |
| GET | `/:id` | Required | Get by ID |
| POST | `/` | Admin | Create |
| PUT | `/:id` | Admin | Update |
| DELETE | `/:id` | Admin | Delete |
| POST | `/:id/check-credit` | Required | Check credit availability |

### Fournisseurs (`/api/fournisseurs`)

Same structure as Clients. Same export/import/CRUD endpoints at `/api/fournisseurs`.

### Stock (`/api/stock`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/stats` | Required | Stock statistics |
| GET | `/by-family` | Required | Stock grouped by family |
| GET | `/filter/products` | Required | Filtered products with stock |
| GET | `/low-stock` | Required | Low stock alerts |
| GET | `/` | Required | List all stock entries |
| GET | `/:id` | Required | Get stock entry |
| POST | `/` | Admin | Create stock entry |
| POST | `/:id/adjust` | Admin | Manual stock adjustment |
| PUT | `/:id` | Admin | Update stock entry |
| DELETE | `/:id` | Admin | Delete stock entry |

### Stock Transfers (`/api/transfers`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/stats` | Required | Transfer statistics |
| GET | `/pending` | Required | Pending transfers |
| GET | `/` | Required | List all transfers |
| POST | `/` | Admin | Create transfer |
| POST | `/:id/receive` | Admin | Confirm receipt |
| POST | `/:id/cancel` | Admin | Cancel transfer |
| DELETE | `/:id` | Admin | Delete transfer |

### Inventories (`/api/inventories`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | Required | List all |
| GET | `/:id` | Required | Get by ID |
| GET | `/report/pdf` | Required | PDF report |
| GET | `/audit-trail` | Required | Audit trail |
| POST | `/` | Admin | Create inventory |
| POST | `/:id/validate` | Admin | Validate (commit adjustments) |

### Stock Transactions (`/api/stock-transactions`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/stats` | Required | Statistics |
| GET | `/by-document` | Required | Transactions by document |
| GET | `/unified` | Required | Unified list |

### Bon Livraison (`/api/bon-livraisons`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/next-number` | Required | Next document number |
| GET | `/products` | Required | Available products |
| GET | `/` | Required | List (paginated) |
| POST | `/` | Required | Create BL |
| GET | `/:id` | Required | Get by ID |
| PUT | `/:id/validate` | Required | Change status / validate |
| PUT | `/:id` | Required | Update (DRAFT only) |
| DELETE | `/:id` | Admin | Delete BL |
| GET | `/:id/print` | Required | Print as PDF |

### Advanced Bon Livraison (`/api/advanced-bon-livraisons`)

Extended BL workflow with full lifecycle:

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/next-number` | Required | Next number |
| GET | `/` | Required | List with filters |
| POST | `/` | Required | Create advanced BL |
| GET | `/:id` | Required | Get by ID |
| PUT | `/:id` | Required | Update |
| DELETE | `/:id` | Admin | Delete |
| GET | `/:id/print` | Required | PDF |
| POST | `/:id/confirm` | Required | CONFIRME status |
| POST | `/:id/prepare` | Required | PREPARE status |
| POST | `/:id/collect` | Required | COLLECTE status |
| POST | `/:id/en-route` | Required | EN_ROUTE status |
| POST | `/:id/deliver` | Required | LIVRE status |
| POST | `/:id/cancel` | Required | ANNULE status |
| POST | `/:id/report` | Required | REPORTE + reason |
| POST | `/:id/suspend` | Required | Suspend BL |
| POST | `/:id/continue` | Required | Unsuspend BL |
| POST | `/:id/pay` | Required | PAYE status |
| GET | `/:id/history` | Required | Status history |

### Bon Retour Client (`/api/bon-retour-clients`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/next-number` | Required | Next number |
| GET | `/products` | Required | Products eligible for return |
| GET | `/` | Required | List |
| POST | `/` | Required | Create return |
| GET | `/:id` | Required | Get by ID |
| PUT | `/:id` | Required | Update |
| GET | `/:id/print` | Required | PDF |
| PUT | `/:id/validate` | Admin | Validate (commit stock) |

### Bon Reception (`/api/bon-receptions`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/next-number` | Required | Next number |
| GET | `/products` | Required | Products list |
| GET | `/` | Required | List |
| POST | `/` | Required | Create receipt |
| GET | `/:id` | Required | Get by ID |
| PUT | `/:id` | Required | Update |
| GET | `/:id/print` | Required | PDF |
| PUT | `/:id/validate` | Admin | Validate (commit stock) |

### Reglements Client (`/api/reglements-client`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | Required | List payments |
| GET | `/stats` | Required | Statistics |
| GET | `/outstanding` | Required | Outstanding payments |
| GET | `/:id` | Required | Get by ID |
| GET | `/:id/pdf` | Required | Download PDF |
| POST | `/` | Required | Create payment |
| DELETE | `/:id` | Admin | Delete payment |

### Reglements Fournisseur (`/api/reglements-fournisseur`)

Mirror of Reglements Client for supplier payments.

### Packs (`/api/packs`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | Required | List |
| GET | `/:id` | Required | Get by ID |
| GET | `/by-barcode/:barcode` | Required | Find by barcode |
| POST | `/` | Admin | Create |
| PUT | `/:id` | Admin | Update |
| DELETE | `/:id` | Admin | Delete |

### Deliveries (`/api/deliveries`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | Required | List |
| GET | `/:id` | Required | Get by ID |
| POST | `/` | Admin | Create driver |
| PUT | `/:id` | Admin | Update |
| DELETE | `/:id` | Admin | Delete |
| PATCH | `/:id/toggle-active` | Admin | Toggle active |

### Banks (`/api/banques`)

Standard CRUD at `/api/banques`.

### Agencies (`/api/agences`)

Standard CRUD at `/api/agences`.

### Labels (`/api/labels`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | Required | List |
| POST | `/` | Required | Create label |
| POST | `/print-multiple` | Required | Print multiple labels |
| POST | `/pdf` | Required | Generate PDF |

### Colis Tracking (`/api/colis-tracking`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/:trackingCode` | Required | Track parcel |
| POST | `/sync` | Admin | Sync from Ameex |

### Delivery Provider Config (`/api/delivery-provider-configs`)

Standard CRUD at `/api/delivery-provider-configs`.

### Settings (`/api/settings`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | Required | Get settings |
| PUT | `/system` | Admin | Update system settings |
| PUT | `/allow-negative-stock` | Admin | Toggle negative stock |
| PUT | `/change-log` | Admin | Update with audit log |
| GET | `/change-history` | Admin | Settings history |

### Admin Permissions (`/api/admin`)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/permissions` | Super Admin | Create permission |
| GET | `/permissions` | Super Admin | List permissions |
| POST | `/roles/permissions/:roleId` | Admin | Assign permissions to role |
| DELETE | `/roles/permissions/:roleId/:permissionId` | Admin | Remove permission from role |
| POST | `/users/:userId/extra-permissions` | Admin | Add extra permission to user |
| GET | `/users/:userId/permissions` | Admin | Get user's resolved permissions |

### Webhooks (`/api/webhooks`)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/ameex` | Signature | Receive Ameex delivery webhooks |

---

## 7. Services

All business logic lives in `src/api/services/`. Controllers are thin wrappers that call services.

| Service File | Responsibility |
|---|---|
| `authService.js` | Signup, login, token refresh, password change |
| `userService.js` | User CRUD, deactivation, image upload, statistics |
| `societeService.js` | Société CRUD, statistics |
| `depotService.js` | Warehouse CRUD, statistics |
| `articleService.js` | Article CRUD, image upload, CSV/Excel import/export |
| `articleVariantService.js` | Variant CRUD, archiving |
| `attributeService.js` | Attribute + value management |
| `categoryService.js` | Category CRUD, import/export |
| `familyService.js` | Family CRUD, import/export |
| `unitService.js` | Unit CRUD |
| `stockByDepotService.js` | Stock level queries, low-stock alerts |
| `stockTransactionService.js` | Transaction log queries |
| `stockTransferService.js` | Inter-depot transfer lifecycle |
| `inventoryService.js` | Physical count creation + validation |
| `stockReservationService.js` | Reserve/release stock |
| `domain/stockManagementService.js` | Core stock adjustment logic (used by all document services) |
| `domain/stockValidationService.js` | Pre-validation: enough stock? negative stock allowed? |
| `clientService.js` | Client CRUD, credit check, import/export, statistics |
| `fournisseurService.js` | Supplier CRUD, import/export, statistics |
| `deliveryService.js` | Driver CRUD |
| `banqueService.js` | Bank CRUD |
| `agenceService.js` | Agency CRUD |
| `bonLivraisonService.js` | Delivery note lifecycle, PDF, status transitions |
| `advancedBonLivraisonService.js` | Advanced BL workflow, history, assignments |
| `bonRetourClientService.js` | Client return lifecycle, PDF, stock effects |
| `bonReceptionService.js` | Goods receipt lifecycle, PDF, stock effects |
| `bonRetourFournisseurService.js` | Return-to-supplier lifecycle, stock effects |
| `reglementClientService.js` | Client payment management, advances, PDF |
| `reglementFournisseurService.js` | Supplier payment management |
| `societePricingService.js` | Per-société price overrides |
| `packService.js` | Product bundle management |
| `adminPermissionService.js` | Role and permission management |
| `settingsManagementService.js` | System settings read/write with audit log |
| `deliveryProviderConfigService.js` | Delivery provider config (encrypts API keys) |
| `ameexWebhookService.js` | Process Ameex webhook events |
| `colisTrackingService.js` | Parcel status tracking |
| `labelService.js` | Label generation and PDF |

---

## 8. Middleware

### `authMiddleware.js`

| Export | Purpose |
|---|---|
| `auth()` | Verifies JWT from `Authorization: Bearer` header or `accessToken` cookie. Sets `req.user`. |
| `optionalAuth()` | Same but doesn't reject if no token present. |
| `requireSocieteContext()` | Ensures `req.user.societeId` is set (blocks super admin without context). |

`req.user` shape after `auth()`:
```json
{
  "id": 1,
  "email": "user@example.com",
  "name": "John",
  "roleId": 2,
  "roleName": "Caissier",
  "societeId": 1,
  "isSuperAdmin": false,
  "societe": { "id": 1, "raisonSocial": "My Company" }
}
```

### `rbacMiddleware.js`

| Export | Usage |
|---|---|
| `hasPermission('create_client')` | User must have this permission |
| `hasAnyPermission(['a','b'])` | At least one permission |
| `hasAllPermissions(['a','b'])` | All permissions required |
| `hasRole(['Admin','Gerant'])` | Check role name |
| `isResourceOwner('id')` | User ID matches `req.params.id` |
| `societyScoped()` | Resource's societeId matches user's |

**Permission resolution** (called internally):
```
finalPermissions = (rolePermissions ∪ extraPermissions) - removedPermissions
```
Super admin bypasses all checks.

### `societyFilterMiddleware.js`

| Export | Behaviour |
|---|---|
| `societyFilter()` | Sets `req.societeId`. Regular user = own societeId. Super admin = query param `?societeId=X` or null. |
| `strictSocietyFilter()` | Even super admin must provide `societeId`. |
| `optionalSocietyFilter()` | Adds filter but doesn't reject missing societeId. |
| `verifySocietyOwnership(model, idParam)` | Loads resource, checks `resource.societeId === req.user.societeId`. |

### `superAdminMiddleware.js`

| Export | Behaviour |
|---|---|
| `superAdminOnly()` | Rejects unless `isSuperAdmin = true` |
| `adminOnly()` | Super admin OR role = Societe_Admin |

### `errorMiddleware.js`

Global Express error handler. Formats `ApiError` instances. Returns different detail levels in dev vs production. Handles JWT-specific errors (expired, invalid signature).

### `uploadImageMiddleware.js`

Multer + Sharp for image uploads. Resizes to standard dimensions. Saves to `uploads/` directory. Used for articles, users, sociétés.

### `depotFilterMiddleware.js`

Adds depot context to requests when `depotId` query param is present.

### `validatorMiddleware.js`

Formats `express-validator` errors into a consistent `{ errors: [...] }` response.

---

## 9. Authentication & Authorization

### Registration Flow

```
POST /api/auth/signup
Body: { name, email, password, [societeId], [roleId] }

1. Check email uniqueness
2. Hash password (bcryptjs, salt rounds=10)
3. Assign société (specified or first société)
4. Assign role (Caissier default, or specified)
5. Create User record
6. If role = Livreur → create linked Delivery record (type=INTERN)
7. Return user info (no tokens — user must login)
```

### Login Flow

```
POST /api/auth/login
Body: { email, password }

1. Find user with role and all permissions
2. Verify password with bcryptjs
3. Generate Access Token (15-30 min)
4. Generate Refresh Token (7 days)
5. Set refreshToken as httpOnly secure cookie
6. Return: { accessToken, user, permissions[] }
```

### Token Refresh Flow

```
POST /api/auth/refresh
Requires: refreshToken cookie

1. Verify refresh token
2. Load user from DB
3. Generate new access token
4. Return: { accessToken, user }
```

### Token Structure

**Access Token** payload:
```json
{
  "id": 1,
  "userId": 1,
  "email": "user@example.com",
  "role": "Caissier",
  "roleId": 2,
  "societeId": 1,
  "isSuperAdmin": false,
  "type": "access"
}
```

**Refresh Token** payload:
```json
{
  "userId": 1,
  "societeId": 1,
  "type": "refresh"
}
```

### Permission System

Permissions are plain strings: `"create_client"`, `"edit_article"`, `"view_bon_livraison"`, etc.

```
User.role → RolePermission[] → Permission[]   (base permissions from role)
User.extraPermissions → Permission[]           (added individually)
User.removedPermissions → Permission[]         (removed individually)

Final = (role + extra) - removed
```

Super admin: `isSuperAdmin = true` → all permission checks pass, all société filters ignored.

### Session Management

- Access token: stored in memory/localStorage on frontend (short-lived)
- Refresh token: `httpOnly; Secure; SameSite=Strict` cookie (7 days)
- On 401, frontend calls `/api/auth/refresh` to silently renew access token
- Logout: `POST /api/auth/logout` clears the refresh token cookie

---

## 10. Stock Management System

### Core Concept

Stock is tracked per `(depot, product)` pair in `StockByDepot`. Every change to stock must go through the stock management service which:
1. Updates `StockByDepot.quantityAvailable`
2. Writes an immutable `StockTransaction` record

### Stock Fields in `StockByDepot`

| Field | Meaning |
|---|---|
| `quantityAvailable` | Can be sold/shipped right now |
| `quantityReserved` | Locked for pending orders |
| `quantityInTransit` | In a pending inter-depot transfer |

Effective stock = `quantityAvailable - quantityReserved`

### What Triggers Stock Movements

| Document Action | Transaction Type | Stock Effect |
|---|---|---|
| BonLivraison validated | OUTBOUND | `-quantityAvailable` in source depot |
| BonRetourClient validated | RETURN_IN | `+quantityAvailable` in return depot |
| BonReception validated | INBOUND | `+quantityAvailable` in destination depot |
| BonRetourFournisseur validated | RETURN_OUT | `-quantityAvailable` in source depot |
| StockTransfer created | TRANSFER_OUT | `-quantityAvailable` in source depot |
| StockTransfer received | TRANSFER_IN | `+quantityAvailable` in destination depot |
| Manual stock adjust | ADJUSTMENT | ±quantityAvailable |
| Inventory validated | ADJUSTMENT | Corrects to counted quantity |
| Damaged goods | DAMAGED | `-quantityAvailable` |

### Negative Stock

Controlled by `SystemSettings.allowNegativeStock`.  
If `false`, `stockValidationService` will reject BL validation when `quantityAvailable < quantity`.

### Low Stock Alerts

`GET /api/stock/low-stock` returns products where `quantityAvailable <= alertThreshold`.

---

## 11. Document Workflow

### Sales Cycle

```
Devis (Quote)
  └──▶ Commande (Sales Order)
          └──▶ BonLivraison (Delivery Note)  ◀── triggers OUTBOUND stock
                    │
                    ├──▶ Facture (Invoice)
                    │         └──▶ Avoir (Credit Note)
                    │
                    └──▶ BonRetourClient (Return)  ◀── triggers RETURN_IN stock
                              └──▶ Avoir (Credit Note)
```

### Purchase Cycle

```
BonReception (Goods Receipt)  ◀── triggers INBOUND stock
    │
    ├──▶ BonRetourFournisseur (Return to Supplier)  ◀── triggers RETURN_OUT stock
    │         └──▶ AvoirFournisseur (Supplier Credit Note)
    │
    └──▶ AvoirFournisseur (Direct credit)
```

### Document Status Progression

**Standard documents** (Devis, Commande, Facture, BonReception):
```
DRAFT → CONFIRMED → PARTIAL → COMPLETED
                              CANCELLED
```

**BonLivraison (Standard)**:
```
DRAFT → CONFIRMED → COMPLETED / CANCELLED
```

**BonLivraison (Advanced)**:
```
EN_COURS → CONFIRME → PREPARE → COLLECTE → EN_ROUTE → LIVRE → PAYE
                                                      → ANNULE
                                                      → REPORTE (with nextDeliveryDate)
                    ↕ SUSPENDED / CONTINUED (can be toggled)
```

### Document Numbers

Auto-generated by `documentNumberGenerator.js`:
- Format: `BL-{YEAR}-{SEQUENCE}` (e.g. `BL-2024-00042`)
- Sequence is per-société, per-document-type
- `GET /next-number` endpoint returns preview before creation

### PDF Generation

PDFKit renders printable documents. Each major document type (BL, BRC, BR, Reglement) has a dedicated print endpoint returning `Content-Type: application/pdf`.

---

## 12. Financial System

### Payment Methods

`ESPECES` (cash), `CHEQUE`, `VIREMENT` (wire transfer), `CARTE` (card), `TRAITE` (bill of exchange), `EFFET` (promissory note)

### Client Payment Flow

```
1. Sell products → BonLivraison (amountDue set)
2. Optional: create Facture from BL
3. Record payment → ReglementClient
   - Links to one or many BL document numbers
   - Stores paymentBreakdown per document
   - Updates amountPaid / amountDue on each document
4. Advance payments (avances):
   - Stored as ReglementClient with surplus
   - Applied to future BLs via BonLivraisonAdvance
```

### Supplier Payment Flow

```
1. Receive goods → BonReception (amountDue set)
2. Record payment → ReglementFournisseur
   - Links to BonReception document numbers
3. Advance payments applied via BonReceptionAdvance
```

### Per-Société Pricing

Products have global base prices in `Article`. Each Société can override them in `SocietePricing`. Document lines record which `priceField` was used (`prixVente1`, `prixVente2`, `prixVente3`).

---

## 13. Background Work (in-process)

No Redis and no separate worker processes. Async work runs in the same Node server via `runInBackground` (`src/api/utils/runInBackground.js`) — fire-and-forget with simple retries.

| Task | Where | Purpose |
|---|---|---|
| Colis creation | `colisSyncService.enqueueCreateColis` | After Advanced BL create with external livreur — calls Ameex, saves tracking number |
| Ameex webhook | `ameexWebhookService.saveAndEnqueue` | Persist webhook log, then process status → BL updates |
| Email | `src/jobs/sendEmails.js` | Password reset / notifications via nodemailer (direct, not queued) |

HTTP handlers return quickly; heavy work continues on the event loop. If the process dies mid-job, DB state (`AmeexWebhookLog`, `colisSync`) remains the source of truth for retries/manual sync.

---

## 14. External Integrations

### Ameex Delivery

**Provider**: Ameex (Moroccan last-mile delivery)  
**API**: `https://api.ameex.app`  
**Config stored in**: `DeliveryProviderConfig` (API key encrypted with AES key from env)  
**Provider file**: `src/providers/ameex.js`

#### Outbound (creating a shipment)

When an Advanced BonLivraison is created with an external livreur (Ameex):
1. After the DB transaction commits, `enqueueCreateColis` schedules in-process work
2. Ameex API is called to create the shipment
3. BL updated with tracking number and `colisSync = CREATED` (or `FAILED` after retries)

#### Inbound (status updates)

Two mechanisms:
1. **Webhook**: Ameex POSTs to `POST /api/webhooks/ameex` → logged in `AmeexWebhookLog` → processed async in the API process
2. **Manual sync**: `POST /api/colis-tracking/sync` → polls Ameex for pending parcels

#### Track parcel

`GET /api/colis-tracking/:trackingCode` — queries Ameex API directly for real-time status.

---

## 15. Utilities

| File | Purpose |
|---|---|
| `apiError.js` | `ApiError` class — throw with status code and message |
| `apiFeatures.js` | Prisma query builder: filter, sort, paginate, search |
| `token.js` | JWT sign/verify for access, refresh, password reset, email verify tokens |
| `csvHelpers.js` | CSV export (json2csv) and import (csv-parser) with field mapping |
| `pdfGenerator.js` | PDFKit-based document PDF renderer |
| `documentNumberGenerator.js` | Generates sequential document numbers per société per type |
| `formatDates.js` | Date formatting utilities (Moroccan locale) |
| `stockCalculation.js` | Quantity arithmetic helpers |
| `productVisibilityUtility.js` | Validates product visibility rules |
| `clientRules.js` | Business rules: credit limit checks, payment deadline warnings |
| `timeRangeUtility.js` | Date range query helpers |
| `uploadFiles.js` | Multer config for file uploads |
| `buildImageUrl.js` | Constructs `BASE_URL/uploads/<filename>` URLs |
| `crypto.js` | AES encrypt/decrypt (used for API keys in DeliveryProviderConfig) |
| `logger.js` | Application logging |
| `multiTenancy.js` | Société isolation helpers |
| `importExportUtils.js` | Shared import/export helpers for Excel (ExcelJS) |

---

## 16. Enums & Constants

### `TransactionType` (StockTransaction)
`INBOUND` | `OUTBOUND` | `RETURN_IN` | `RETURN_OUT` | `ADJUSTMENT` | `TRANSFER_OUT` | `TRANSFER_IN` | `DAMAGED`

### `DocumentStatus`
`DRAFT` | `CONFIRMED` | `PARTIAL` | `COMPLETED` | `CANCELLED` | `PAID`

### `BonLivraisonStatus` (commandStatus)
`EN_COURS` | `CONFIRME` | `PREPARE` | `COLLECTE` | `EN_ROUTE` | `LIVRE` | `ANNULE` | `REPORTE` | `PAYE` | `UPDATE` | `SUSPENDED` | `CONTINUED`

### `DepotType`
`PRINCIPAL` | `SECONDARY` | `OUTLET` | `TRANSIT`

### `DeliveryType`
`INTERN` (linked to User) | `EXTERN` (external driver)

### `EntityType`
`PARTICULIER` (individual) | `SOCIETE` (company)

### `PaymentMethod`
`ESPECES` | `CHEQUE` | `VIREMENT` | `CARTE` | `TRAITE` | `EFFET`

### `ModeReglement` (ReglementClient)
`ESPECE` | `CARTE_BANCAIRE` | `CHEQUE` | `EFFET` | `CARTE_FIDELITE` | `BON_ACHAT` | `REMISE` | `VIREMENT`

### `PaymentType`
`CLIENT` | `FOURNISSEUR`

### `ReservationStatus`
`PENDING` | `FULFILLED` | `CANCELLED` | `EXPIRED`

### `TransferStatus`
`PENDING` | `COMPLETED`

### `ColisSync`
`NOT_APPLICABLE` | `PENDING` | `CREATED` | `FAILED` | `RECEIVED`

### `WebhookLogStatus`
`PENDING` | `PROCESSING` | `PROCESSED` | `FAILED`

### `BonLivraisonType`
`STANDARD` | `ADVANCED`

---

## 17. Key Architectural Patterns

### Multi-Tenancy

Every resource owned by a Société has `societeId`. The `societyFilter` middleware sets `req.societeId` on every authenticated request. Services always include `where: { societeId: req.societeId }` in Prisma queries. Super admin sets context via `?societeId=X` query param.

### Class Table Inheritance (Documents)

Child document tables share the same `id` as their parent `ClientDocument` or `FournisseurDocument` row. To create a `Facture`:
```js
// 1. Create ClientDocument header
// 2. Create Facture using same id (shared PK via Prisma nested create)
await prisma.clientDocument.create({
  data: {
    ...headerFields,
    facture: { create: { ...factureFields } }
  }
})
```
This allows generic status/total management on the header while specialised fields live in child tables.

### Stock Immutability

`StockTransaction` records are never updated or deleted. They form a complete audit trail. `StockByDepot` is the mutable running total derived from applying all transactions.

### Encrypted Credentials

API keys for delivery providers (`DeliveryProviderConfig`) are AES-encrypted before storage using `CREDENTIAL_ENCRYPTION_KEY`. Decryption happens in the service layer before API calls.

### Document Number Sequences

Sequences are per-Société per-document-type, stored and incremented atomically to prevent duplicate numbers under concurrent requests.

### Prisma Query Builder (`apiFeatures.js`)

Most list endpoints use this utility to parse query params and build a Prisma `where`/`orderBy`/`skip`/`take` object:
```
?page=2&limit=20&sortBy=createdAt&order=desc&search=keyword&status=CONFIRMED
```

### Error Handling

Services throw `ApiError` (from `utils/apiError.js`) with an HTTP status code. The global `errorMiddleware` catches it and formats the response. All service functions use `async/await` with `express-async-handler` on controllers to avoid unhandled promise rejections.
           