# HR App — Πλάνο εκκίνησης (MVP)

## Στόχος
Να φτιάξουμε εφαρμογή HR με έμφαση σε:
- διαχείριση εργαζομένων,
- αιτήματα αδειών,
- παρακολούθηση εργασιών/εγκρίσεων,
- mobile-first χρήση (Android) και πλήρη πρόσβαση από PC.

## MVP (έκδοση 1)
### 1) Authentication & Roles
- Login με email/password ή Google SSO.
- Ρόλοι: **Admin**, **HR Manager**, **Employee**.
- Role-based permissions (ποιος βλέπει/εγκρίνει τι).

### 2) Employee Directory
- Προφίλ εργαζομένου (όνομα, θέση, τμήμα, manager, στοιχεία επικοινωνίας).
- Upload εγγράφων/εικόνων (π.χ. συμβάσεις, πιστοποιήσεις).
- Αναζήτηση και φίλτρα.

### 3) Leave Management
- Υποβολή αίτησης άδειας από κινητό.
- Ροή έγκρισης (Employee -> Manager -> HR).
- Καταστάσεις: **Pending / Approved / Rejected / Done**.
- Ιστορικό ενεργειών.

### 4) Tasks & HR Workflows
- Καρτέλες τύπου Kanban (To Do / In Progress / Done).
- Ανάθεση σε μέλος ομάδας.
- Check/Done από PC και κινητό.

### 5) Notifications
- Push/email ειδοποιήσεις για νέες αιτήσεις και αλλαγές κατάστασης.
- Υπενθυμίσεις για εκκρεμείς εγκρίσεις.

## Τεχνολογική πρόταση (γρήγορη και ασφαλής)
- **Frontend (Web/PC):** React + TypeScript.
- **Mobile (Android πρώτα):** React Native.
- **Backend:** Node.js (NestJS ή Express).
- **Database:** PostgreSQL.
- **Storage για αρχεία/εικόνες:** S3-compatible object storage.
- **Auth:** Firebase Auth ή Auth0.

## 1ο Sprint (1-2 εβδομάδες)
1. Setup project + authentication + roles.
2. Employee directory (CRUD).
3. Leave request flow (submit + approve/reject).
4. Basic dashboard με counters (Pending/Approved/Done).

## Τι χρειάζομαι από εσένα για να ξεκινήσουμε
- Πόσοι χρήστες θα το χρησιμοποιούν αρχικά;
- Θέλετε μόνο ελληνικά ή και αγγλικά;
- Θέλετε Google login υποχρεωτικά;
- Σε cloud θέλετε να τρέχει (GCP/AWS/Azure);
- Υπάρχουν νομικές απαιτήσεις (GDPR, audit logs, retention);

Με αυτά μπορώ να σου δώσω αμέσως:
- αναλυτικό backlog,
- schema βάσης,
- οθόνες (screens) ανά ρόλο,
- και τεχνικό implementation plan βήμα-βήμα.
