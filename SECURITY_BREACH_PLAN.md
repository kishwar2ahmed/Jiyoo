# JIYOO Data Breach Incident Response & Regulatory Notification Plan

**Applicable Frameworks:**
- **India:** Digital Personal Data Protection Act, 2023 (DPDP Act, Section 8(6)) & CERT-In Directions
- **EU / UK:** General Data Protection Regulation (GDPR Articles 33 & 34) / UK GDPR
- **United States:** Applicable State Data Breach Notification Statutes (CCPA/CPRA, etc.)

---

## 1. Decision Authority & Incident Response Team
- **Incident Response Lead & Grievance Officer:** Syed Shams (`shamsjiyoo@gmail.com` / `+91 97393 91891`)
- **Decision Responsibility:** The Incident Response Lead is responsible for declaring a confirmed Personal Data Breach, authorizing credential rotation, and triggering regulatory and user notifications.

## 2. Immediate Containment & Triage (0 – 4 Hours)
1. **Isolate & Revoke:**
   - Rotate compromised environment secrets (`FIREBASE_SERVICE_ACCOUNT_KEY`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `SMTP_PASS`, `CRON_SECRET`) in Vercel / hosting environment variables.
   - Revoke active admin sessions in Firestore collection `admin_sessions` and invalidate Firebase refresh tokens via Firebase Admin SDK (`getAuth().revokeRefreshTokens(uid)`).
2. **Preserve Forensic Evidence:**
   - Export immutable snapshots of `audit_logs`, `razorpayWebhookEvents`, and server access logs before redeploying.
3. **Assess Scope:**
   - Identify affected collections (`users`, `users/{uid}/addresses`, `orders`, `reviews`, `couponRedemptions`) and determine the exact categories of personal data involved (names, emails, phone numbers, delivery addresses). Note: Card numbers and UPI PINs are never stored by JIYOO.

## 3. Regulatory Notification Deadlines
1. **CERT-In (India Cyber Security Incident):**
   - Report qualifying cybersecurity incidents to CERT-In within **6 hours** of detection.
2. **Data Protection Board of India (DPDP Act, 2023 — Section 8(6)):**
   - Notify the Data Protection Board of India and each affected Data Principal without delay in the form and manner prescribed under the DPDP Rules.
3. **EU / UK Supervisory Authorities (GDPR Article 33):**
   - If EU/UK residents are affected and the breach is likely to result in a risk to their rights and freedoms, notify the competent Supervisory Authority within **72 hours** of becoming aware of the breach.

## 4. How Affected Users Are Notified
Affected users are notified directly via email (from `SMTP_FROM`) and, where email is unavailable, via SMS/WhatsApp on their registered phone number. Every user notification must state in plain language:
1. A description of the nature of the personal data breach and when it occurred.
2. The specific categories of data affected (e.g., name, email, delivery address).
3. The immediate steps JIYOO has taken to contain the breach and prevent recurrence.
4. Practical steps the user can take to protect themselves (e.g., resetting passwords, watching for phishing messages).
5. Direct contact details for JIYOO's Grievance & Data Protection Officer (`shamsjiyoo@gmail.com`, `+91 97393 91891`).
