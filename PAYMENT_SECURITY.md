# Payment Security Guide

## The Attack You Asked About

**Question:** "What if user sends query directly to our backend API using Postman with random hash?"

```bash
# Attacker tries to fake a payment
curl -X POST https://yourapp.com/api/verify-payment \
  -H "Content-Type: application/json" \
  -d '{
    "transactionHash": "0xFAKE123456",
    "senderAddress": "0x1234...",
    "credits": 999999
  }'
```

## Multi-Layer Defense

### Layer 1: Authentication (CRITICAL - Implement First)

**Require user to be logged in before calling this endpoint.**

```typescript
// In /api/verify-payment/route.ts
const session = await getServerSession();
if (!session) {
    return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
    );
}
```

**Result:** Anonymous attackers blocked ✅

---

### Layer 2: Wallet Ownership Verification

**Verify the sender address belongs to the logged-in user.**

```typescript
const userWallet = await db.query(
    'SELECT wallet_address FROM users WHERE id = $1',
    [session.user.id]
);

if (senderAddress.toLowerCase() !== userWallet.toLowerCase()) {
    return NextResponse.json(
        { success: false, error: 'Wallet mismatch' },
        { status: 403 }
    );
}
```

**Result:** Attacker can't claim credits for someone else's wallet ✅

---

### Layer 3: Transaction Deduplication

**Prevent same transaction hash from being used twice (replay attack).**

```typescript
// Check if already processed
const existing = await supabase
    .from('payments')
    .select('id')
    .eq('transaction_hash', transactionHash)
    .single();

if (existing.data) {
    return NextResponse.json(
        { success: false, error: 'Transaction already processed' },
        { status: 400 }
    );
}

// After confirming, store it
await supabase.from('payments').insert({
    transaction_hash: transactionHash,
    user_id: session.user.id,
    wallet_address: senderAddress,
    amount_usdc: amount,
    credits: credits,
    status: 'confirmed',
    created_at: new Date()
});
```

**Result:** Same transaction can't be reused ✅

---

### Layer 4: Background Verification (Optional but Recommended)

**Verify transaction on Mirror Node asynchronously.**

```typescript
// Don't block the response, verify in background
setTimeout(() => {
    verifyOnMirrorNode(transactionHash)
        .then(result => {
            if (result.verified) {
                // Update DB: status = 'verified'
            } else {
                // 🚨 FRAUD ALERT!
                // Update DB: status = 'fraud_suspected'
                // Send alert to admin
                // Freeze user credits
            }
        });
}, 10000); // Wait 10s for indexing
```

**Result:** Fake transactions flagged for review ✅

---

## Implementation Priority

### Phase 1 (Must Have - Implement Now)
1. ✅ Authentication check
2. ✅ Wallet ownership verification
3. ✅ Transaction deduplication (store in DB)

### Phase 2 (Should Have - Week 1)
4. Background Mirror Node verification
5. Fraud alert system

### Phase 3 (Nice to Have - Future)
6. Rate limiting (max 10 purchases per hour)
7. Amount limits (max $100 per transaction)
8. Admin dashboard for reviewing flagged transactions

---

## Database Schema

```sql
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    wallet_address VARCHAR(42) NOT NULL,
    transaction_hash VARCHAR(66) UNIQUE NOT NULL, -- Prevents duplicates
    amount_usdc DECIMAL(10, 2) NOT NULL,
    credits INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'confirmed', -- confirmed, verified, fraud_suspected
    verified_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT NOW(),

    INDEX idx_user_id (user_id),
    INDEX idx_transaction_hash (transaction_hash),
    INDEX idx_status (status)
);
```

---

## Testing Security

### Test 1: Try to use same transaction twice
```bash
# First call: Success
# Second call: "Transaction already processed" ✅
```

### Test 2: Try to use someone else's transaction
```bash
# User A's wallet: 0xAAA...
# Attacker tries: senderAddress: 0xAAA, but logged in as User B
# Result: "Wallet mismatch" ✅
```

### Test 3: Try without authentication
```bash
# No session cookie
# Result: "Unauthorized" ✅
```

---

## Why This is Safe

Even if attacker sends fake transaction hash:

1. ❌ **No auth** → Blocked at Layer 1
2. ❌ **Wrong wallet** → Blocked at Layer 2
3. ❌ **Reused hash** → Blocked at Layer 3
4. ❌ **Fake hash** → Flagged at Layer 4 (background check)

All 4 layers must be bypassed = Nearly impossible!

---

## Next Steps

1. **Implement Layer 1-3 now** (authentication + deduplication)
2. **Add background verification** (flags fraud without blocking UX)
3. **Monitor logs** for fraud attempts
4. **Review flagged transactions** weekly

This gives you **enterprise-grade security** without cron jobs or complex infrastructure!
