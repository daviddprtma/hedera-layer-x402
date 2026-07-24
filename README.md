# Hedera X402 Payment Layer

An implementation of the [L402 (Lightning 402) protocol](https://l402.org/) adapted for the **Hedera network**. This project demonstrates how to monetize APIs and digital resources seamlessly using Hedera HBAR, without requiring users to hold HBAR for transaction fees.

## Overview

The X402 protocol leverages the `402 Payment Required` HTTP status code to require micropayments before serving protected resources. In this Hedera implementation, the client authorizes a `TransferTransaction` to pay the resource owner, but the **Facilitator** (a separate service) pays the Hedera network transaction fee and submits the transaction to the network.

### Architecture

This repository is a monorepo containing two main packages:

1. **`@layer402/nextjs` (Frontend & Middleware)**
   - **X402 Client (`lib/x402-client.ts`)**: Browser-side client that fetches protected resources, parses the 402 challenge, signs a transfer transaction using the Hedera SDK, and retries the request with a `payment-signature` header.
   - **X402 Middleware (`lib/x402-middleware.ts`)**: Server-side Next.js route wrapper. It intercepts requests without a valid payment, returns a `402 Payment Required` challenge, and verifies payments by calling the Facilitator before serving the resource.
   - **Playground & Dashboard**: A UI demonstrating the payment flow in action.

2. **`facilitator` (Backend Payment Facilitator)**
   - An Express backend running on `localhost:4020` that acts as the "Fee Payer".
   - It receives signed client transactions (via the middleware), signs them with its own key to cover the Hedera network fee, submits the transaction to the Hedera testnet, and returns the settlement receipt.

## Prerequisites

- [Node.js](https://nodejs.org/en/) (v18 or v20+ recommended)
- Three [Hedera Testnet Accounts](https://portal.hedera.com/) (all requiring ECDSA keys):
  1. **PAY_TO_ACCOUNT**: The receiver of the funds (Resource Owner).
  2. **CLIENT**: The demo user paying for the resource.
  3. **FACILITATOR**: The account absorbing the network transaction fees.

## Getting Started

1. **Clone the repository and install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   Copy the example environment file and fill in your testnet account details:
   ```bash
   cp .env.example .env
   ```
   Open `.env` and configure the following:
   - `PAY_TO_ACCOUNT`: Account ID of the receiver (e.g., `0.0.12345`).
   - `NEXT_PUBLIC_DEMO_CLIENT_ID` & `NEXT_PUBLIC_DEMO_CLIENT_KEY`: Account ID and ECDSA private key of the buyer demo wallet.
   - `FACILITATOR_ACCOUNT_ID` & `FACILITATOR_PRIVATE_KEY`: Account ID and ECDSA private key of the facilitator (fee payer).

3. **Start the development server:**
   This will run both the Next.js frontend (port 3000) and the Facilitator backend (port 4020) concurrently.
   ```bash
   npm run dev
   ```

4. **Open the playground:**
   Navigate to [http://localhost:3000](http://localhost:3000) to see the X402 Payment Layer in action!

## How It Works

1. **Request:** The client attempts to access a protected API route (e.g., `/api/data`).
2. **Challenge:** The X402 middleware intercepts the request. Finding no payment signature, it returns a `402 Payment Required` response containing a base64-encoded challenge (amount, asset, fee payer account, etc.) in the `payment-required` header.
3. **Sign:** The client decodes the challenge, builds a Hedera `TransferTransaction` to pay the required HBAR to the `payTo` account, and signs it (leaving the transaction fee to the facilitator).
4. **Retry:** The client retries the request, attaching the base64-encoded transaction in the `payment-signature` header.
5. **Settle:** The middleware forwards the signature to the Facilitator. The Facilitator signs the transaction (paying the network fee) and submits it to Hedera.
6. **Access Granted:** If the transaction succeeds, the Facilitator returns a success receipt. The middleware then executes the route handler, serving the protected data to the client with a `payment-response` and `x-transaction-id` header!

## Scripts

- `npm run dev`: Starts both the Next.js app and the Facilitator in watch mode.
- `npm run build`: Builds both packages for production.
- `npm run next:dev`: Starts only the Next.js frontend.
- `npm run facilitator:dev`: Starts only the Facilitator backend.


---

## 📹 Demo Video
Here's the demo video for this project: 
<br> 
[![IMAGE ALT TEXT HERE](https://img.youtube.com/vi/fdMM_DFi8W4/0.jpg)](https://www.youtube.com/watch?v=fdMM_DFi8W4)

---
