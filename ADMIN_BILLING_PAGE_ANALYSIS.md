# Admin Billing Page: API and Logic Analysis

## Scope and entry points

The page shown at `/#/admin/billing` is the Admin Point of Sale (POS) page. It is rendered by `PointOfSale` inside the Admin route, which is protected for Admin and Super Admin roles.

- Route registration: `Frontend/src/main.jsx` (`admin` → `billing`)
- Main UI and client-side behavior: `Frontend/src/Admin/Billings/PointOfSale.jsx`
- API client: `Frontend/src/api.js`
- API route mount: `Backend/index.js` mounts the API router at `/api`

The sibling routes are `/admin/billing/order` for the order builder, `/admin/billing/history` for bill history, and `/admin/tables` for the floor/settlement workspace. The order builder is `ServerFood` (`Frontend/src/Server Restaurant/ServerFood/ServerFood.jsx`).

## Page layout and UI state

The POS page combines several operational views:

- Summary cards count available, occupied, and reserved tables, active bills, and running balance.
- Quick actions open a dine-in table selector or start a pickup/delivery order.
- Active dining bills are available in card and table layouts, with item-add and settle actions.
- Floor tables are available in card and table layouts, with search, status filters, bill details, and table actions.
- The **Merge Table** control opens a selection/preview/confirmation modal.
- Settlement opens a bill/payment modal rather than navigating away.
- Loading, refresh, request-error, empty-list, and toast states are managed in the component.

Important page state includes the table and active-bill lists, the currently selected tabs/filters/layout, selector visibility, merge selections/details, and settlement data. `billingLoadSequence` prevents an older concurrent refresh from overwriting a newer response. A successful refresh marks data fresh; table selection is disabled while loading or if the latest refresh failed.

## API inventory

All paths below are relative to `/api` (local development base URL is typically `http://localhost:5000/api`). The API client sends the stored bearer token and credentials.

| Method and path | Used by | Purpose and response |
|---|---|---|
| `GET /server-tables` | POS initial load, table selector, merge modal; also server tables | Returns `success`, `tables`, and `count`. Each table includes its persistent status and assignment fields plus the next relevant reservation fields described below. |
| `GET /table-bills?status=Active` | POS initial load, selector, merge modal, refresh | Returns up to 100 bills matching the status. POS uses these as the active-bill source of truth. |
| `GET /table-bills/:billId` | POS settlement and merge detail preview | Returns one bill with order rounds, line items, consolidated items, and totals. |
| `POST /table-bills/:billId/settle` | POS settlement modal | Body: `{ payment_method, discount }`. Marks the bill Paid, updates table/order state transactionally, and returns the settled bill. |
| `POST /table-bills/merge` | POS merge confirmation | Body: `{ primary_table_id, merge_table_ids }`. Transfers source orders and updates bills/tables in a transaction. |
| `GET /reservations?status=All` | Admin Reservations page, not the POS data loader | Returns reservation records across statuses, including reservation/table IDs, dates/times, guests, customer, and status. Useful for reservation management and diagnosis, but the POS does not currently call it directly. |
| `PATCH /reservations/:reservationId/status` | Admin Reservations page | Changes a reservation to Confirmed, Declined, or Cancelled. Confirmation checks for overlapping Pending/Confirmed records. |
| `GET /table-bills/active/:tableId` | Order builder/table bill flows | Loads the active bill for a specific table, if present. |
| `POST /kitchen-orders` | Order builder | Submits a kitchen order. Dine-in payload includes `order_type` and `table_id`; request includes an idempotency key. Backend creates or reuses the active table bill. |

### Authorization

- The frontend Admin route allows Admin and Super Admin users.
- `GET /server-tables` is mounted with optional authentication.
- Table-bill endpoints use the kitchen-role middleware and permit server/admin/Super Admin roles.
- `GET /reservations?status=All` is behind the Admin authorization branch; public availability and customer self-service routes have separate access rules.

## Table and reservation data

`GET /server-tables` is backed by `findServerTables` in `Backend/modules/serverTable.js`. It reads `server_table`, joins the assigned employee, and joins the earliest upcoming reservation record for each table. Reservation data returned with a table includes:

- `next_reservation_id`
- `next_reservation_date`
- `next_reservation_start_time` and `next_reservation_end_time`
- `next_reservation_guests`
- `next_reservation_customer_name`
- `next_reservation_status`
- `reservation_is_active`

The join treats `Pending` and `Confirmed` reservations as blocking candidates. It only includes reservations that have not ended according to database `CURDATE()`/`CURTIME()`. A correlated `NOT EXISTS` chooses the earliest upcoming record for that table. `reservation_is_active` is `1` only when that record is for today and the current database time falls within its start-inclusive/end-exclusive interval.

The POS does **not** call `/reservations?status=All` to determine table status. That endpoint is a complete reservation-management list; the status popup uses reservation data joined onto `/server-tables`, plus the active-bill list.

## POS status and selection rules

The `tableStatus(table, activeBills)` helper in `PointOfSale.jsx` resolves status in this order:

1. A matching active bill, or persisted table status `Occupied`, means **Occupied**.
2. `reservation_is_active === 1` means **Reserved**.
3. A `Pending` or `Confirmed` reservation whose date equals the browser’s local current date also displays as **Reserved**.
4. A persisted `Reserved` value without a current active reservation is treated as **Available**; persisted `Available` remains **Available**.
5. Other stored statuses are preserved.

The active-bill check uses the table UUID (`table_id`) and active bill `table_id`. The table ID—not the displayed table number—is the assignment key.

The selector allows **Available** and **Occupied** tables. A table displayed as Reserved for a future reservation today can still be selected before its reservation begins; an active reservation (`reservation_is_active === 1`) cannot be selected. This deliberately distinguishes the informative Reserved label from a current time conflict. The backend performs the final check again when the order is submitted.

Status colors on the Admin Billing page:

- Available: green
- Reserved: orange
- Occupied: red

The reservation display shows table name/number, date, time range, and guest count; customer name is used as the reservation label. Search and filters run on the client over the loaded table/bill data.

## Dine-in order flow

1. Opening the dine-in selector calls `loadBillingData`, which fetches `/server-tables` and active `/table-bills` concurrently.
2. The selector renders only after a successful refresh. Each table’s active bill is looked up by table ID.
3. Selecting an allowed table navigates to `/admin/billing/order` with `orderType: "dine-in"` and the selected table ID, table number, and seat count.
4. `ServerFood` sends the order to `POST /kitchen-orders`.
5. The backend starts a transaction, validates the requested table and (for non-admins) its server assignment, checks for a reservation active at database time, then finds or creates an active `table_bills` record and inserts the order/items. A repeated idempotency key with the same request returns the prior order instead of duplicating it.
6. If the table already has an active bill, the new order becomes another round on that bill rather than creating a second bill.

The backend’s active reservation guard checks `Pending` and `Confirmed`, with `reservation_date = CURDATE()`, `start_time <= CURTIME()`, and `end_time > CURTIME()`. This is the authoritative prevention against assigning a table during its reservation window.

## Active bills and settlement

`GET /table-bills?status=Active` lists active bill records. Each record includes stored subtotal, tax, discount, grand total, server and table information, and merged-table numbers.

Selecting **Settle** loads fresh bill details via `GET /table-bills/:billId`. The modal shows table/bill information, items, subtotal, tax, discount, payment method, and final amount. Confirming calls `POST /table-bills/:billId/settle`.

The backend transaction:

- Locks and validates the bill.
- Clamps the requested discount to the bill subtotal.
- Marks the bill `Paid`, stores payment method/discount/settled time.
- Sets the table to `Available`.
- Marks remaining Pending/Preparing/Ready to Serve kitchen orders as Served.

After settlement succeeds, POS reloads table and active-bill data. A failed refresh is surfaced separately from the successful settlement.

## Merge tables

The Merge Table modal refreshes tables/bills before selection and offers occupied tables that have active bills. It loads full bill details for selected tables to display both bills and a combined preview. The UI combines item quantities for identical food ID/name, unit price, add-ons, and customizations; it previews subtotal, combined discount, tax, and grand total.

After confirmation, `POST /table-bills/merge` delegates to `mergeActiveTableBills` in `Backend/modules/tableBills.js`. The backend transaction validates distinct occupied tables, active bills, reservation conflicts, server assignment where applicable, payment state, and matching tax rates. It transfers source kitchen orders to the primary bill, marks source bills Merged, frees source tables, records the merged table numbers and combined discounts on the primary bill, and recalculates its totals.

The POS reloads data after a successful merge. The preview is advisory; the backend transaction is authoritative.

## Refresh and error behavior

- Initial page mount loads tables and active bills.
- Opening the dine-in selector refreshes both endpoints.
- Opening the merge modal refreshes both endpoints.
- Settlement and merge refresh the page data after success.
- A visible refresh control reloads billing data.
- Failed loading prevents selecting a table and offers a retry in the selector.
- API failures are logged and surfaced as inline errors or toast messages; successful mutations are not reported as failed solely because the follow-up refresh failed.

## Implementation notes and boundaries

- `GET /reservations?status=All` is not the Billing table-status source; modifying that endpoint alone will not change the selector. The joined reservation fields in `/server-tables` are what the selector consumes.
- Reservation times and active-conflict decisions use the database clock. The POS’s “reservation today” badge check uses the browser’s local calendar date. A browser/database timezone mismatch can therefore affect the badge date near midnight; the backend’s active assignment guard remains database-time based.
- `findServerTables` returns the earliest upcoming reservation per table, not a full reservation history. Cancelled/Declined records are excluded from the blocking join.
- The POS obtains active-bill status from `/table-bills?status=Active`; it does not infer a bill from table status alone.
- This document describes the current implementation; it does not change application behavior.

## Relevant source files

- `Frontend/src/main.jsx`
- `Frontend/src/Admin/Billings/PointOfSale.jsx`
- `Frontend/src/Server Restaurant/ServerFood/ServerFood.jsx`
- `Frontend/src/api.js`
- `Backend/index.js`
- `Backend/routers/routes.js`
- `Backend/routers/serverTableRouter.js`
- `Backend/routers/reservations.js`
- `Backend/controllers/serverTableController.js`
- `Backend/controllers/reservationController.js`
- `Backend/controllers/tableBillController.js`
- `Backend/controllers/kitchenOrderController.js`
- `Backend/modules/serverTable.js`
- `Backend/modules/reservations.js`
- `Backend/modules/tableBills.js`
- `Backend/modules/kitchenOrders.js`
