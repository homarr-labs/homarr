# Critical persisted flows

Failure modes identified before implementation:

1. Integration creation could skip the real upstream credential check, save a rejected connection, or store plaintext credentials. Exercise the public integration router, actual HTTP adapter and migrated SQLite database; reopen storage and decrypt the saved ciphertext to prove the original credential survives.
2. API responses could expose the saved credential, or an unrelated user could read/change the integration. Check returned objects and denial codes, and verify denied writes leave persisted rows unchanged.
3. Rotating credentials could leave an authenticated upstream session cached or erase credentials when a later form edit submits masked/null values. Seed a real Redis session, update through the router, observe eviction, reopen SQLite and verify the replacement credential is used on the next real connection check.
4. A use-only integration grant could accidentally become full credential-management access. Persist the grant through the management API, then test list versus details access as that user.
5. Creating a board or adding an item could omit related layouts, lose item options, or overwrite the owner's existing home board. Reopen the SQLite file and read through a fresh caller; rerunning current migrations must preserve these saved records. This is restart/idempotency evidence, not a historical-version migration matrix.
6. Private board reads or edits could escape owner/grant checks. Verify unrelated and anonymous denial, explicit view-only sharing, denial of edits, and revocation through public procedures.
7. Public visibility could inadvertently grant edit access. Change visibility through the owner API and verify anonymous read access without allowing unrelated authenticated writes.

Tests use real router middleware, authorization queries, SQLite migrations, cryptography and network requests. The local HTTP fixture implements only the Gluetun connection-check endpoint and rejects the wrong credential; it is a transport fixture, not evidence of compatibility with a deployed Gluetun version. No fetch, database-query, permission or product-service implementations are mocked.

The runner provides a disposable global database and environment configuration. Each flow uses its own file-backed SQLite database and synthetic sessions; these checks do not validate browser login or cookie transport. Temporary databases and the local HTTP server are closed after each flow.
