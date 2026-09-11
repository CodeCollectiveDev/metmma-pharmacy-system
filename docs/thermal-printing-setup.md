# Thermal Receipt Printing Setup

This guide explains what is needed to make direct thermal receipt printing work end-to-end. The feature is built on `node-thermal-printer` running inside the backend. ESC/POS receipt data is generated server-side and sent straight to the printer, so the cashier no longer has to use the browser print dialog.

## 1. Hardware Requirements

| Item | Notes |
| --- | --- |
| Thermal receipt printer | Any ESC/POS-compatible printer (e.g. Epson TM-T20X/T88, generic POS58/80mm) |
| Connection | Either of the two supported types below |
| Thermal paper | Rolls matching the printer width (58mm or 80mm) |

### Supported printer connections

Two connection modes are supported. Choose the one that matches your printer.

| Mode | `PRINTER_TYPE` | Requirements |
| --- | --- | --- |
| Network (TCP/IP) | `network` | Printer has an IP address. Ethernet or Wi-Fi connected printer. Communication happens over the raw ESC/POS port (default `9100`). |
| System / USB | `usb` | Printer is plugged into the POS computer over USB and registered as an OS printer (e.g. CUPS on Linux, "Printers" on Windows). Uses the OS printer name. |

> **Note:** If both modes apply, `network` is normally the most reliable for a shared counter printer. A printer on a USB connection is only reachable from the machine it is physically connected to.

## 2. Backend Prerequisites

1. Install the printer library (already in `backend/package.json`):

```bash
cd backend
npm install
```

2. The backend must be running and reachable from the browser app:

```bash
npm start   # or: node server.js
```

## 3. Backend Configuration (`.env`)

Copy the example environment file and fill in the values for your printer:

```bash
cd backend
cp .env.example .env   # if you don't already have a .env
```

Configure the printer settings in `backend/.env`:

```dotenv
# Connection type: 'network' or 'usb'
PRINTER_TYPE=network

# --- For network printers ---
PRINTER_HOST=192.168.1.100      # IP address of the thermal printer
PRINTER_PORT=9100               # raw ESC/POS port (default 9100)

# --- For USB / system printers ---
PRINTER_INTERFACE=printer:POS58 # OS printer name
PRINTER_DRIVER=epson            # usually 'epson'

# --- General ---
PRINTER_WIDTH=42                # receipt text width in characters:
                                #   58mm paper  -> 32-42
                                #   80mm paper  -> 42-48
PHARMACY_NAME=METMMA Pharmacy   # name printed at the top of the receipt
```

| Variable | Default | Description |
| --- | --- | --- |
| `PRINTER_TYPE` | `network` | `network` (TCP/IP) or `usb` (OS printer) |
| `PRINTER_HOST` | `127.0.0.1` | Printer IP / hostname (network mode) |
| `PRINTER_PORT` | `9100` | Raw ESC/POS port (network mode) |
| `PRINTER_INTERFACE` | `printer:POS58` | System printer name, must be prefixed with `printer:` (USB mode) |
| `PRINTER_DRIVER` | `epson` | Printer driver family (`epson`, `star`, `tanca`, `brother`, ...) |
| `PRINTER_WIDTH` | `42` | Receipt column width in characters; depends on paper width |
| `PHARMACY_NAME` | `METMMA Pharmacy` | Header name on the receipt |

> Restart the backend after changing `.env` — settings are read once at startup.

## 4. Test the Printer Connection

Before using the POS, verify the printer is reachable. The backend exposes a test endpoint that prints a small test page:

```bash
curl -X POST http://localhost:3000/api/print/test
```

**Successful response:**

```json
{ "success": true, "message": "Test page printed successfully" }
```

If it fails, the response is `502` with an error message (for example `connect ECONNREFUSED 192.168.1.100:9100`, which means the printer is unreachable on the network).

## 5. Printing a Receipt

The POS prints automatically:

1. A cashier completes a sale in the POS.
2. The backend records the sale and returns the official `receiptNumber` (`REC-...`).
3. The POS sends the receipt data to `POST /api/print/receipt`.
4. The backend formats ESC/POS commands and prints to the configured printer.
5. The POS shows **either**:
   - ✅ "Receipt sent to the thermal printer" (success), **or**
   - ⚠️ a warning that the thermal printer is unavailable and to use the **Print** button.

### Manual print

Every receipt dialog has a **Print** button. It tries the thermal printer first; if that fails, it falls back to the standard browser print dialog (which is still styled for the receipt).

## 6. What the Receipt Contains

The ESC/POS receipt includes:

- Pharmacy name (`PHARMACY_NAME`) and "Sales Receipt"
- Receipt number (`REC-...`)
- Date and time
- Cashier name
- Line items: product name, quantity, unit price, line total
- Subtotal, VAT (16.5%), total
- Payment method (CASH / CARD)
- Amount paid and change (cash sales)
- "Thank you for your purchase!" footer + paper cut command

## 7. Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `connect ECONNREFUSED` | Wrong printer IP/port, or printer powered off | Check `PRINTER_HOST` / `PRINTER_PORT`; ping the printer; confirm it is on and on the same network |
| `connect ETIMEDOUT` | Printer on a different subnet / firewall blocks port 9100 | Verify network routing; allow the port in the firewall |
| USB mode fails | Wrong printer name in `PRINTER_INTERFACE` | List system printers (Linux: `lpstat -p`; Windows: Settings → Printers) and use the exact name, e.g. `printer:ESC/POS` |
| Paper jams / blank receipt | Wrong `PRINTER_WIDTH` or unsupported driver | Try `PRINTER_WIDTH` of `42` (80mm) / `32` (58mm); switch `PRINTER_DRIVER` |
| Garbled text/symbols | Character encoding mismatch | Keep `PRINTER_DRIVER` matching your printer brand; verify the printer supports ESC/POS |
| Offline message in POS | Backend unreachable from the browser | Confirm backend is running; check browser is online; the sale still completes and the receipt remains printable later |
| Browser dialog still opens | Printer not configured on the backend host | That is the intended fallback — fix `.env` and confirm with the test endpoint |

## 8. Passing the Acceptance Criteria

- ✅ Receipt data → ESC/POS: `backend/api/services/printerService.js`
- ✅ All transaction info on receipt (method, paid, change included)
- ✅ Thermal paper sizing via `PRINTER_WIDTH`
- ✅ Sale → configured printer confirmed to the user
- ✅ Printer errors handled (`502` response + friendly POS message)
- ✅ Browser printing still available (`window.print()` fallback preserved)

---

**Related files**

| File | Purpose |
| --- | --- |
| `backend/api/services/printerService.js` | ESC/POS formatting + printer connection |
| `backend/api/controllers/printController.js` | `POST /api/print/receipt`, `POST /api/print/test` |
| `backend/api/routes/printRoutes.js` | Route registration |
| `backend/.env.example` | Example environment configuration |
| `frontend/src/modules/pos/views/PosView.vue` | Receipt dialog, auto-print + browser fallback |
| `frontend/src/services/api/dataService.js` | `printReceipt()` client method |