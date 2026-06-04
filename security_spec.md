# Security Specification - Cuidado Ativo

## 1. Data Invariants

- **Identity Ownership**: All data (medications, logs) must be explicitly owned by the authenticated `userId`.
- **Relational Integrity**: `IntakeLog` documents must reside under the correct `/users/{userId}/logs` path and reference a medication belonging to that user.
- **Immutable Fields**: `createdAt` and `userId` fields are immutable after creation.
- **Server Timestamps**: `createdAt` and `updatedAt` must match `request.time`.
- **Strict Schema**: No "shadow fields" allowed. All keys must match the blueprint.
- **Size Constraints**: Names, instructions, and list sizes are strictly bounded to prevent resource exhaustion.

## 2. The "Dirty Dozen" Payloads

1. **Identity Spoofing**: Attempt to create a user profile under `/users/attacker` using `uid: 'victim'`.
2. **Cross-User Write**: Authenticated as `UserA`, attempt to write to `/users/UserB/medications/med1`.
3. **Shadow Update**: Attempt to add `isAdmin: true` to a medication document.
4. **Denial of Wallet (ID)**: Attempt to use a 2KB string as a `medicationId`.
5. **Denial of Wallet (Data)**: Attempt to save a 500KB string in medication `instructions`.
6. **Immutability Breach**: Attempt to update `createdAt` on an existing medication.
7. **Timestamp Fraud**: Attempt to set `updatedAt` to a past date instead of `request.time`.
8. **Invalid Enum**: Attempt to set `userRole` to `super-admin`.
9. **Unverified Access**: Attempt to write data with `email_verified: false` (if enabled in rules).
10. **Orphaned Log**: Attempt to create a log referencing a `medicationId` that doesn't exist.
11. **Array Poisoning**: Attempt to inject 1000 items into the `times` array for a medication.
12. **Blanket Query**: Attempt to `list` medications without a `where('userId', '==', auth.uid)` filter (if path allows, but here it's subcollection based).

## 3. Test Runner (Draft)

```typescript
// firestore.rules.test.ts (Pseudo-code for reference)
import { assertSucceeds, assertFails } from '@firebase/rules-unit-testing';

// ... setup ...

it('should deny creating medication for another user', async () => {
  const db = getFirestore(authA);
  const ref = doc(db, 'users/userB/medications/med1');
  await assertFails(setDoc(ref, { name: 'Aspirin', userId: 'userB', ... }));
});

it('should deny updating createdAt', async () => {
  const db = getFirestore(authA);
  const ref = doc(db, 'users/userA/medications/med1');
  await assertFails(updateDoc(ref, { createdAt: someOldDate }));
});
```
