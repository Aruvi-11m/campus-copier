# 📊 CampusCopier Accounting & Control Chart

This directory contains manual accounting files for tracking the business operations of CampusCopier.

## Files

### `orders_log.csv`
A log of all accepted print orders. Update this after each batch of orders is completed.

**Columns:**
| Column | Description |
|--------|-------------|
| `Date` | Date the order was placed (YYYY-MM-DD) |
| `OrderID` | The order ID (e.g., CC-1001) |
| `CustomerName` | Name of the student |
| `AcceptedByAdmin` | Which admin accepted the order (Barathwaj / Thamizaruvi) |
| `Pages` | Total number of pages printed |
| `PrintMode` | BW_SINGLE, BW_DOUBLE, BW_4UP, or COLOR_SINGLE |
| `Copies` | Number of copies |
| `Binding` | NONE, SOFT, or SPIRAL |
| `TotalAmount` | Total amount charged (in ₹) |
| `PaymentMethod` | UPI or CASH |
| `PaymentStatus` | PAID or UNPAID |

### `control_chart.csv`
A daily/weekly summary for tracking costs, revenue, and profit.

**Columns:**
| Column | Description |
|--------|-------------|
| `Date` | Date of the entry (YYYY-MM-DD) |
| `CostPerPage` | Your current cost per page for paper + ink (in ₹) |
| `AmountReceived` | Total amount received from orders that day (in ₹) |
| `MaterialsPurchased` | Cost of materials purchased that day — paper, ink, binding supplies (in ₹) |
| `ProfitGained` | AmountReceived - MaterialsPurchased (in ₹) |
| `Notes` | Any additional notes |

## How to Use

1. **After completing orders**: Copy the order details from the admin dashboard into `orders_log.csv`.
2. **At the end of each day/week**: Add a row to `control_chart.csv` with your costs and revenue.
3. **Commit and push**: `git add accounting/ && git commit -m "Update accounting logs" && git push`

> **Tip**: In the future, we can add an "Export to CSV" button in the admin dashboard to auto-generate the orders_log data for easy copy-paste.

## Important Notes

- **These files are manually maintained.** They are NOT auto-synced from the database.
- **Do NOT delete old entries.** This is your historical record.
- **Both admins** should update these files and commit regularly to keep the data in sync.
