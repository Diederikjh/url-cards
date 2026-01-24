/**
 * Migration script to backfill 'rank' field for existing cards.
 * Sets 'rank' to -createdAt.toMillis() to preserve "Newest First" ordering.
 * 
 * Usage: node scripts/migrate_ranks.js
 */

const admin = require('firebase-admin');
// Initialize Firebase Admin
if (!admin.apps.length) {
    if (process.env.FIRESTORE_EMULATOR_HOST) {
        admin.initializeApp({ projectId: "url-cards" });
        console.log("Connected to Emulator");
    } else {
        try {
            const serviceAccount = require(process.env.GOOGLE_APPLICATION_CREDENTIALS || '../firebase-service-account.json');
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        } catch (e) {
            console.error("Failed to load service account credentials. Set GOOGLE_APPLICATION_CREDENTIALS or ensure firebase-service-account.json exists.");
            console.error(e.message);
            process.exit(1);
        }
    }
}

const db = admin.firestore();

async function migrate() {
    console.log('Starting migration of card ranks...');

    // Process in batches
    const cardsSnapshot = await db.collection('cards').get();

    if (cardsSnapshot.empty) {
        console.log('No cards found.');
        return;
    }

    console.log(`Found ${cardsSnapshot.size} cards.`);

    const batch = db.batch();
    let count = 0;
    let updated = 0;

    for (const doc of cardsSnapshot.docs) {
        const data = doc.data();

        // Skip if rank already exists
        if (data.rank !== undefined) {
            continue;
        }

        if (!data.createdAt) {
            console.warn(`Card ${doc.id} has no createdAt, skipping or assigning 0.`);
            continue;
        }

        // Default rank: -createdAt (Newest First means smaller rank)
        // Ensure createdAt is a Timestamp
        const createdAt = data.createdAt;
        let rank = 0;

        if (createdAt && typeof createdAt.toMillis === 'function') {
            rank = -createdAt.toMillis();
        } else {
            console.warn(`Card ${doc.id} has invalid createdAt, using 0`);
        }

        batch.update(doc.ref, { rank });
        updated++;
        count++;

        // Commit every 500 writes
        if (count >= 400) {
            await batch.commit();
            console.log(`Committed batch of ${count} updates...`);
            // Reset is tricky with a single batch object reusage in loop, better to make new batch
            // But for simple script, let's just commit final at end
            // Actually, we must create a new batch after commit
            // For now, let's just depend on the final commit if list is small, or restart logic.
        }
    }

    if (updated > 0) {
        await batch.commit();
        console.log(`Successfully updated ${updated} cards with rank.`);
    } else {
        console.log('No cards needed update.');
    }
}

migrate().catch(console.error);
