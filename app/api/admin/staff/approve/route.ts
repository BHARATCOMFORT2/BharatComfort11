rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    /* ───────────────────────────────
       🔐 Helper Functions
    ─────────────────────────────── */
    function isSignedIn() {
      return request.auth != null;
    }

    function isAdmin() {
      return isSignedIn() &&
        (request.auth.token.role == 'admin' ||
         request.auth.token.isAdmin == true ||
         request.auth.token.admin == true);
    }

    function isPartner() {
      return isSignedIn() &&
        (request.auth.token.role == 'partner' || isAdmin());
    }

    function isSelf(uid) {
      return isSignedIn() && request.auth.uid == uid;
    }

    /* ───────────────────────────────
       👤 USERS
    ─────────────────────────────── */
    match /users/{uid} {
      allow read: if isSelf(uid) || isAdmin();
      allow create: if isSelf(uid);

      allow update: if isSelf(uid)
        && !(request.resource.data.diff(resource.data).affectedKeys()
             .hasAny(["role", "isAdmin", "status", "isActive"]));

      allow delete: if isSelf(uid) || isAdmin();
      allow write: if isAdmin();
    }

    match /users/{uid}/wallet/{entryId} {
      allow read: if isSelf(uid) || isAdmin();
      allow create, update, delete: if isAdmin();
    }

    /* ───────────────────────────────
       🧑‍💼 PARTNERS
    ─────────────────────────────── */
    match /partners/{uid} {
      allow read: if isSelf(uid) || isAdmin();
      allow create: if isSelf(uid);

      allow update: if isSelf(uid)
        && !("role" in request.resource.data)
        && !("isAdmin" in request.resource.data);

      allow delete: if isSelf(uid) || isAdmin();

      match /kycDocs/{docId} {
        allow read: if isSelf(uid) || isAdmin();
        allow create: if isSelf(uid);
        allow update, delete: if isAdmin();
      }

      match /kycAudit/{auditId} {
        allow read: if isSelf(uid) || isAdmin();
        allow create: if isSelf(uid) || isAdmin();
        allow update, delete: if isAdmin();
      }
    }

    /* ───────────────────────────────
       📞 STAFF / TELECALLERS ✅ FINAL
    ─────────────────────────────── */
    match /staff/{staffId} {

      // ✅ Admin full control
      allow read, write, delete: if isAdmin();

      // ✅ Staff can read only his own profile
      allow read: if isSelf(staffId);

      // ❌ Staff cannot create profile directly
      allow create: if false;

      // ✅ Staff can update LIMITED fields only
      allow update: if isSelf(staffId)
        && !(request.resource.data.diff(resource.data).affectedKeys()
             .hasAny(["role", "status", "isActive"]));
    }

    /* ───────────────────────────────
       ✅ TELECALLER LEADS (TASKS)
    ─────────────────────────────── */
    match /leads/{leadId} {

      // ✅ Admin full control
      allow read, write, delete: if isAdmin();

      // ✅ Telecaller can read only assigned leads
      allow read: if isSignedIn()
        && resource.data.assignedTo == request.auth.uid;

      // ✅ Telecaller can update only status + notes
      allow update: if isSignedIn()
        && resource.data.assignedTo == request.auth.uid
        && request.resource.data.diff(resource.data).affectedKeys()
             .hasOnly(["status", "partnerNotes", "updatedAt"]);

      // ❌ No client-side lead create
      allow create: if false;
    }

    /* ───────────────────────────────
       📅 BOOKINGS
    ─────────────────────────────── */
    match /bookings/{bookingId} {
      allow read: if isSignedIn()
        && request.query != null
        && request.query.where.size() > 0
        && request.query.where[0].value == request.auth.uid;

      allow read: if isAdmin();

      allow create: if isSignedIn()
        && request.resource.data.userId == request.auth.uid;

      allow update: if isAdmin()
        || (isSignedIn() && resource.data.userId == request.auth.uid)
        || (isSignedIn() && resource.data.partnerId == request.auth.uid);

      allow delete: if isAdmin();
    }

    /* ───────────────────────────────
       💳 PAYMENTS
    ─────────────────────────────── */
    match /payments/{paymentId} {
      allow read: if isSignedIn()
        && request.query != null
        && request.query.where.size() > 0
        && request.query.where[0].value == request.auth.uid;

      allow read: if isAdmin();
      allow create, update, delete: if isAdmin();
    }

    /* ───────────────────────────────
       💸 REFUNDS
    ─────────────────────────────── */
    match /refunds/{refundId} {
      allow read: if isSignedIn()
        && request.query != null
        && request.query.where.size() > 0
        && request.query.where[0].value == request.auth.uid;

      allow read: if isAdmin();

      allow create: if isSignedIn()
        && request.resource.data.userId == request.auth.uid;

      allow update: if isSignedIn()
        && resource.data.userId == request.auth.uid;

      allow delete: if isAdmin();
    }

    /* ───────────────────────────────
       💰 SETTLEMENTS
    ─────────────────────────────── */
    match /settlements/{sid} {

      allow read: if isSignedIn()
        && request.query != null
        && request.query.where.size() > 0
        && request.query.where[0].value == request.auth.uid;

      allow read: if isAdmin();

      allow create: if isPartner()
        && request.resource.data.partnerId == request.auth.uid;

      allow update: if isSignedIn()
        && resource.data.partnerId == request.auth.uid;

      allow delete, write: if isAdmin();
    }

    /* ───────────────────────────────
       ⚖️ SETTLEMENT DISPUTES
    ─────────────────────────────── */
    match /settlement_disputes/{disputeId} {
      allow read: if isAdmin()
        || (isSignedIn() && resource.data.partnerId == request.auth.uid);

      allow create: if isPartner()
        && request.resource.data.partnerId == request.auth.uid;

      allow update: if isSignedIn()
        && resource.data.partnerId == request.auth.uid;

      allow delete: if isAdmin();

      match /messages/{msgId} {
        allow read: if isAdmin()
          || (isSignedIn()
              && get(/databases/$(database)/documents/settlement_disputes/$(disputeId))
                 .data.partnerId == request.auth.uid);

        allow create: if isSignedIn()
          && request.resource.data.uid == request.auth.uid;

        allow update, delete: if isAdmin();
      }
    }

    /* ───────────────────────────────
       🔔 NOTIFICATIONS
    ─────────────────────────────── */
    match /notifications/{id} {
      allow read: if isSignedIn()
        && request.query != null
        && request.query.where.size() > 0
        && request.query.where[0].value == request.auth.uid;

      allow read: if isAdmin();

      allow update: if isSignedIn()
        && resource.data.userId == request.auth.uid;

      allow delete, write: if isAdmin();
    }

    /* ───────────────────────────────
       ⭐ REVIEWS / STORIES
    ─────────────────────────────── */
    match /reviews/{id} {
      allow read: if true;
      allow create: if isSignedIn()
        && request.resource.data.userId == request.auth.uid;

      allow update, delete: if isSignedIn()
        && resource.data.userId == request.auth.uid;
    }

    match /stories/{id} {
      allow read: if true;
      allow create: if isSignedIn()
        && request.resource.data.userId == request.auth.uid;

      allow update, delete: if isSignedIn()
        && resource.data.userId == request.auth.uid;
    }

    /* ───────────────────────────────
       🎁 REFERRALS
    ─────────────────────────────── */
    match /referrals/{rid} {
      allow read: if isAdmin()
        || isSelf(resource.data.referrerId)
        || isSelf(resource.data.referredUserId);

      allow create: if isSignedIn()
        && request.resource.data.referrerId == request.auth.uid;

      allow update, delete: if isAdmin();
    }

    match /referral_codes/{uid} {
      allow read: if isSelf(uid) || isAdmin();
      allow create: if isSelf(uid);
      allow update, delete: if isAdmin();
    }

    match /rewards/{rewardId} {
      allow read: if (isSignedIn()
        && resource.data.userId == request.auth.uid) || isAdmin();

      allow create, update, delete: if isAdmin();
    }

    /* ───────────────────────────────
       🏠 PUBLIC DOCUMENTS
    ─────────────────────────────── */
    match /homepage/{docId} {
      allow read: if true;
      allow write: if isAdmin();
    }

    match /listings/{id} {
      allow read: if true;
      allow write, delete: if isAdmin();
    }

    match /featured_listings/{id} {
      allow read: if true;
      allow write, delete: if isAdmin();
    }

    match /promotions/{id} {
      allow read: if true;
      allow write: if isAdmin();
    }

    match /trending_destinations/{id} {
      allow read: if true;
      allow write: if isAdmin();
    }

    match /recent_stories/{id} {
      allow read: if true;
      allow write: if isAdmin();
    }
  }
}
