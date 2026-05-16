# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| v1.6.x (latest) | ✅ |
| v1.5.x | ✅ |
| < v1.5 | ❌ |

## Reporting a Vulnerability

If you discover a security vulnerability in FBiT Staking, please **do not** open a public GitHub issue. Instead, report it privately so we can fix it before public disclosure.

### How to Report

**Email:** parthkurrey740@gmail.com

Please include the following in your report:

- Description of the vulnerability
- Steps to reproduce the issue
- Affected component (Solana contract, Polygon contract, or frontend)
- Potential impact
- Suggested fix (if any)

### Response Timeline

| Step | Timeframe |
|------|-----------|
| Acknowledgement | Within 48 hours |
| Initial assessment | Within 5 days |
| Fix & patch release | Within 14 days (critical), 30 days (others) |
| Public disclosure | After fix is deployed |

## Scope

### In Scope

- Solana Anchor program (`contracts/solana/`)
- Polygon Solidity contract (`contracts/polygon/`)
- Frontend wallet connection logic (`web/src/lib/reown.ts`, `web/src/context/WalletContext.tsx`)
- Smart contract interactions (`web/src/lib/contracts/`)
- Admin panel security (`web/src/components/admin/`)
- API endpoints (`web/src/app/api/`)

### Out of Scope

- Third-party wallet vulnerabilities (Phantom, Solflare, Binance Web3 Wallet)
- RPC provider issues (Helius, PublicNode)
- Vercel platform issues
- Issues requiring physical access to a device

## Smart Contract Security

Both smart contracts implement the following protections:

- **Reentrancy Guard** — prevents reentrancy attacks
- **Access Control** — `onlyOwner` / `onlyAuthority` on all admin functions
- **Emergency Pause** — instantly halts all operations if needed
- **SafeERC20** — safe token transfers (Polygon)
- **Lock Period Enforcement** — prevents early unstaking
- **Input Validation** — amount bounds checked on-chain

> **Note:** The admin panel is a UI gate only. Real enforcement is done by the smart contract's on-chain access control modifiers.

## Disclosure Policy

We follow **Coordinated Vulnerability Disclosure (CVD)**:

1. Reporter submits vulnerability privately
2. We confirm receipt and begin investigation
3. We develop and test a fix
4. Fix is deployed to production
5. Reporter is credited (if desired) in the changelog

We kindly ask that you:
- Give us reasonable time to fix the issue before public disclosure
- Do not exploit the vulnerability or access user funds
- Do not disclose the issue publicly until we confirm the fix is live

Thank you for helping keep FBiT Staking secure.
