# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| v1.7.x (latest) | ✅ |
| v1.6.x | ✅ |
| v1.5.x | ✅ |
| < v1.5 | ❌ |

## Reporting a Vulnerability

If you discover a security vulnerability in FBiT Staking, please **do not** open a public GitHub issue. Instead, report it privately so we can fix it before public disclosure.

### How to Report

**Email:** <contact@futurebit.in>

Please include the following in your report:

- Description of the vulnerability
- Steps to reproduce the issue
- Affected component (Solana contract or frontend)
- Potential impact
- Suggested fix (if any)

### Response Timeline

| Step | Timeframe |
| Acknowledgement | Within 48 hours |
| Initial assessment | Within 5 days |
| Fix & patch release | Within 14 days (critical), 30 days (others) |
| Public disclosure | After fix is deployed |

## Scope

### In Scope

- Solana Anchor program (`contracts/solana/`)
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

The Solana program implements the following protections:

- **PDA-based account validation** — strict owner/seed/signer checks on every instruction
- **Access Control** — authority checks on all admin instructions
- **Emergency Pause** — instantly halts all operations if needed
- **Checked Arithmetic** — overflow/underflow protection throughout
- **Lock Period Enforcement** — prevents early unstaking
- **Input Validation** — amount bounds checked on-chain

> **Note:** The admin panel is a UI gate only. Real enforcement is done by the smart contract's on-chain access control modifiers.

## Known Limitations

These are disclosed transparently rather than silently patched, since the contract lives on a deployed mainnet contract holding real user funds — fixing this requires a new contract version and a migration plan, not a routine patch.

- **Per-user stake cap is enforced per-call, not cumulatively**: `stake()` checks the incoming amount against the 250M-FBiT ceiling, but never against the user's running `total_staked`. A user can exceed the intended per-user ceiling by splitting a large position across multiple `stake()` calls. This does not put other users' funds at risk — it only affects the platform's own risk-concentration assumptions.

## AI-Assisted Layers

Two server-side routes call the Claude API (`@anthropic-ai/sdk`), both rate-limited per-IP and origin-restricted to the production domain:

- `/api/bot-assess` — borderline bot-detection sessions get a Claude risk assessment; fails open (never blocks a user) on any error or API outage.
- `/api/support-chat` — the user-facing support widget; scoped by system prompt to platform facts only, with no access to user funds, wallet state, or contract-write capability.

Neither route can execute on-chain actions or access private keys — they only read request data (session signals, chat messages) and return a text/JSON response.

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
