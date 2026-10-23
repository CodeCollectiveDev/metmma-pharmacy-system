# Batch numbers and capitalisation

**Is the batch number case sensitive? No.**

The system stores every batch number in **upper case**, so `abc-01`, `AbC-01` and `ABC-01` are treated as the same batch. When you type a batch number on **Add product** or **Edit product**, the form shows it in upper case as you type, and the server saves it that way.

## What this means for staff

- Searching or scanning `abc-01` still finds the product stored as `ABC-01`. Lookups were always case-insensitive; only the way the value is stored has changed.
- If you add a product whose **name** and **batch number** already exist, the app shows an advisory:

  > This batch already exists — do you want to add units to it instead?

  Use the **Add stock** button in the message to add the delivery to the existing record.

- The warning is **advisory only**. You can still save when the batches genuinely differ (for example, the same batch number supplied by a different supplier). Choose **Keep both batches** to do that.

## What changed for the database

The `20261005_batch_numbers.sql` migration:

1. Rewrites existing batch numbers to upper case (only the letter case changes — no rows are deleted or merged).
2. Reports any duplicate `product_code` + `batch_number` + `expiry_date` combinations in the migration log for manual review.
3. Adds a supporting index for the duplicate-batch advisory.

Merging two existing product records that turn out to be the same batch is out of scope and is left for manual review.
