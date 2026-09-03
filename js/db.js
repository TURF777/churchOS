/* ===================================================
   ChurchOS — Firestore Data-Access Layer (db.js)
   Wraps all Firestore CRUD with simple functions that
   replace the old localStorage read/write pattern.
   =================================================== */

(function () {
  'use strict';

  const db   = window.ChurchOS.db;
  const FieldValue = firebase.firestore.FieldValue;

  /* ---------------------------------------------------
     dbAdd  — Create a new document (auto-ID)
     Returns the new document ID.
     --------------------------------------------------- */
  async function dbAdd(collectionName, data) {
    try {
      const docRef = await db.collection(collectionName).add({
        ...data,
        deleted:   data.deleted   ?? false,
        createdAt: data.createdAt || FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      return docRef.id;
    } catch (err) {
      console.error(`[db.js] dbAdd(${collectionName}) failed:`, err);
      throw err;
    }
  }

  /* ---------------------------------------------------
     dbSet  — Create/overwrite a document with a known ID
     Used for user profiles keyed by Firebase Auth uid.
     --------------------------------------------------- */
  async function dbSet(collectionName, docId, data) {
    try {
      await db.collection(collectionName).doc(docId).set({
        ...data,
        deleted:   data.deleted   ?? false,
        createdAt: data.createdAt || FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      return docId;
    } catch (err) {
      console.error(`[db.js] dbSet(${collectionName}, ${docId}) failed:`, err);
      throw err;
    }
  }

  /* ---------------------------------------------------
     dbGet  — Fetch a single document by ID
     Returns the document data with `id` included, or null.
     --------------------------------------------------- */
  async function dbGet(collectionName, docId) {
    try {
      const snap = await db.collection(collectionName).doc(docId).get();
      if (!snap.exists) return null;
      return { id: snap.id, ...snap.data() };
    } catch (err) {
      console.error(`[db.js] dbGet(${collectionName}, ${docId}) failed:`, err);
      throw err;
    }
  }

  /* ---------------------------------------------------
     dbGetAll — Fetch all documents, with optional filters.
     Automatically excludes soft-deleted documents unless
     `includeDeleted: true` is passed.

     filters = [
       { field: 'role', op: '==', value: 'leader' },
       { field: 'department', op: '==', value: 'Youth Ministry' },
     ]

     options = {
       includeDeleted: false,   // default: exclude deleted
       orderBy: 'createdAt',    // optional sort field
       orderDir: 'desc',        // 'asc' or 'desc'
       limitTo: 50,             // optional limit
     }
     --------------------------------------------------- */
  async function dbGetAll(collectionName, filters, options) {
    try {
      const opts = options || {};
      let query = db.collection(collectionName);

      // Exclude soft-deleted by default
      if (!opts.includeDeleted) {
        query = query.where('deleted', '==', false);
      }

      // Apply additional filters
      if (Array.isArray(filters)) {
        filters.forEach(f => {
          query = query.where(f.field, f.op || '==', f.value);
        });
      }

      // Ordering
      if (opts.orderBy) {
        query = query.orderBy(opts.orderBy, opts.orderDir || 'asc');
      }

      // Limit
      if (opts.limitTo) {
        query = query.limit(opts.limitTo);
      }

      const snapshot = await query.get();
      const results = [];
      snapshot.forEach(doc => {
        results.push({ id: doc.id, ...doc.data() });
      });
      return results;
    } catch (err) {
      console.error(`[db.js] dbGetAll(${collectionName}) failed:`, err);
      throw err;
    }
  }

  /* ---------------------------------------------------
     dbUpdate — Update specific fields on a document
     --------------------------------------------------- */
  async function dbUpdate(collectionName, docId, changes) {
    try {
      await db.collection(collectionName).doc(docId).update({
        ...changes,
        updatedAt: FieldValue.serverTimestamp(),
      });
      return docId;
    } catch (err) {
      console.error(`[db.js] dbUpdate(${collectionName}, ${docId}) failed:`, err);
      throw err;
    }
  }

  /* ---------------------------------------------------
     dbSoftDelete — Mark a document as deleted (soft delete)
     Preserves the project-wide soft-delete convention.
     --------------------------------------------------- */
  async function dbSoftDelete(collectionName, docId) {
    try {
      await db.collection(collectionName).doc(docId).update({
        deleted:   true,
        deletedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      return docId;
    } catch (err) {
      console.error(`[db.js] dbSoftDelete(${collectionName}, ${docId}) failed:`, err);
      throw err;
    }
  }

  /* ---------------------------------------------------
     dbRestore — Un-delete a soft-deleted document
     --------------------------------------------------- */
  async function dbRestore(collectionName, docId) {
    try {
      await db.collection(collectionName).doc(docId).update({
        deleted:   false,
        deletedAt: firebase.firestore.FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      return docId;
    } catch (err) {
      console.error(`[db.js] dbRestore(${collectionName}, ${docId}) failed:`, err);
      throw err;
    }
  }

  /* ---------------------------------------------------
     dbDelete — Permanently delete a document
     Use sparingly — prefer dbSoftDelete.
     --------------------------------------------------- */
  async function dbDelete(collectionName, docId) {
    try {
      await db.collection(collectionName).doc(docId).delete();
      return docId;
    } catch (err) {
      console.error(`[db.js] dbDelete(${collectionName}, ${docId}) failed:`, err);
      throw err;
    }
  }

  /* ---------------------------------------------------
     dbListen — Real-time listener via onSnapshot()
     This is the KEY addition Firestore gives over localStorage:
     dashboards update live when another user (on another
     device) adds/changes data, without manual refresh.

     Returns an unsubscribe function.

     callback receives an array of documents.

     filters and options follow the same shape as dbGetAll.
     --------------------------------------------------- */
  function dbListen(collectionName, filters, options, callback) {
    // Allow (collectionName, callback) shorthand
    if (typeof filters === 'function') {
      callback = filters;
      filters  = null;
      options  = {};
    }
    // Allow (collectionName, filters, callback)
    if (typeof options === 'function') {
      callback = options;
      options  = {};
    }

    const opts = options || {};
    let query = db.collection(collectionName);

    // Exclude soft-deleted by default
    if (!opts.includeDeleted) {
      query = query.where('deleted', '==', false);
    }

    // Apply filters
    if (Array.isArray(filters)) {
      filters.forEach(f => {
        query = query.where(f.field, f.op || '==', f.value);
      });
    }

    // Ordering
    if (opts.orderBy) {
      query = query.orderBy(opts.orderBy, opts.orderDir || 'asc');
    }

    // Limit
    if (opts.limitTo) {
      query = query.limit(opts.limitTo);
    }

    // Attach the real-time listener
    const unsubscribe = query.onSnapshot(
      (snapshot) => {
        const results = [];
        snapshot.forEach(doc => {
          results.push({ id: doc.id, ...doc.data() });
        });
        callback(results, snapshot);
      },
      (err) => {
        console.error(`[db.js] dbListen(${collectionName}) error:`, err);
      }
    );

    return unsubscribe;
  }

  /* ---------------------------------------------------
     dbListenDoc — Real-time listener for a single document
     Returns an unsubscribe function.
     --------------------------------------------------- */
  function dbListenDoc(collectionName, docId, callback) {
    const unsubscribe = db.collection(collectionName).doc(docId).onSnapshot(
      (doc) => {
        if (doc.exists) {
          callback({ id: doc.id, ...doc.data() });
        } else {
          callback(null);
        }
      },
      (err) => {
        console.error(`[db.js] dbListenDoc(${collectionName}, ${docId}) error:`, err);
      }
    );
    return unsubscribe;
  }

  /* ---------------------------------------------------
     dbBatchWrite — Write multiple documents atomically
     ops = [
       { type: 'set',    collection: 'members', id: 'abc', data: {...} },
       { type: 'update', collection: 'members', id: 'abc', data: {...} },
       { type: 'delete', collection: 'members', id: 'abc' },
     ]
     --------------------------------------------------- */
  async function dbBatchWrite(ops) {
    try {
      const batch = db.batch();
      ops.forEach(op => {
        const ref = db.collection(op.collection).doc(op.id);
        if (op.type === 'set') {
          batch.set(ref, {
            ...op.data,
            updatedAt: FieldValue.serverTimestamp(),
          }, { merge: true });
        } else if (op.type === 'update') {
          batch.update(ref, {
            ...op.data,
            updatedAt: FieldValue.serverTimestamp(),
          });
        } else if (op.type === 'delete') {
          batch.delete(ref);
        }
      });
      await batch.commit();
    } catch (err) {
      console.error('[db.js] dbBatchWrite failed:', err);
      throw err;
    }
  }

  /* ---------------------------------------------------
     Seed Helper — Write seed data to a collection
     only if the collection is currently empty.
     Used on first launch to populate initial data.
     --------------------------------------------------- */
  async function dbSeedIfEmpty(collectionName, seedArray) {
    try {
      const snapshot = await db.collection(collectionName)
        .limit(1)
        .get();

      if (snapshot.empty) {
        console.log(`[db.js] Seeding ${collectionName} with ${seedArray.length} documents...`);
        const batch = db.batch();
        seedArray.forEach(item => {
          const ref = item.id
            ? db.collection(collectionName).doc(item.id)
            : db.collection(collectionName).doc();
          batch.set(ref, {
            ...item,
            deleted:   item.deleted   ?? false,
            createdAt: item.createdAt || FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          });
        });
        await batch.commit();
        console.log(`[db.js] Seeded ${collectionName} ✓`);
        return true;
      }
      return false;
    } catch (err) {
      console.error(`[db.js] dbSeedIfEmpty(${collectionName}) failed:`, err);
      return false;
    }
  }

  /* ---------------------------------------------------
     Timestamp Helpers
     --------------------------------------------------- */
  function serverTimestamp() {
    return FieldValue.serverTimestamp();
  }

  function toDateString(firestoreTimestamp) {
    if (!firestoreTimestamp) return '—';
    // Handle Firestore Timestamp objects
    if (firestoreTimestamp.toDate) {
      return firestoreTimestamp.toDate().toISOString().slice(0, 10);
    }
    // Handle ISO strings
    if (typeof firestoreTimestamp === 'string') {
      return firestoreTimestamp.slice(0, 10);
    }
    return '—';
  }

  function toDateTimeString(firestoreTimestamp) {
    if (!firestoreTimestamp) return '—';
    if (firestoreTimestamp.toDate) {
      return firestoreTimestamp.toDate().toISOString().replace('T', ' ').slice(0, 19);
    }
    if (typeof firestoreTimestamp === 'string') {
      return firestoreTimestamp.replace('T', ' ').slice(0, 19);
    }
    return '—';
  }

  /* ---------------------------------------------------
     Expose Global API
     --------------------------------------------------- */
  window.ChurchOS = window.ChurchOS || {};
  window.ChurchOS.dbAdd         = dbAdd;
  window.ChurchOS.dbSet         = dbSet;
  window.ChurchOS.dbGet         = dbGet;
  window.ChurchOS.dbGetAll      = dbGetAll;
  window.ChurchOS.dbUpdate      = dbUpdate;
  window.ChurchOS.dbSoftDelete  = dbSoftDelete;
  window.ChurchOS.dbRestore     = dbRestore;
  window.ChurchOS.dbDelete      = dbDelete;
  window.ChurchOS.dbListen      = dbListen;
  window.ChurchOS.dbListenDoc   = dbListenDoc;
  window.ChurchOS.dbBatchWrite  = dbBatchWrite;
  window.ChurchOS.dbSeedIfEmpty = dbSeedIfEmpty;
  window.ChurchOS.serverTimestamp    = serverTimestamp;
  window.ChurchOS.toDateString       = toDateString;
  window.ChurchOS.toDateTimeString   = toDateTimeString;

})();
