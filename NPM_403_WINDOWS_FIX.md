# Διόρθωση σφάλματος npm 403 Forbidden (Windows)

Αν βλέπεις μήνυμα `403 Forbidden` στο `npm install`, ακολούθησε **αυτά τα απλά βήματα με τη σειρά**:

1. **Κλείσε VPN/εταιρικό δίκτυο**
   - Αν είσαι σε εταιρικό Wi-Fi/VPN, κλείσ’ το προσωρινά.

2. **Άνοιξε PowerShell ως απλός χρήστης**
   - Μπες στον φάκελο του project.

3. **Βάλε σωστό npm registry**
   - Τρέξε:
   - `npm config set registry https://registry.npmjs.org/`

4. **Σβήσε proxy ρυθμίσεις npm**
   - Τρέξε:
   - `npm config delete proxy`
   - `npm config delete https-proxy`

5. **Καθάρισε cache npm**
   - Τρέξε:
   - `npm cache clean --force`

6. **Έλεγξε σύνδεση npm**
   - Τρέξε:
   - `npm ping`
   - Αν γράψει `PONG`, είσαι ΟΚ.

7. **Τρέξε ξανά εγκατάσταση**
   - `npm install`

8. **Αν συνεχίσει το 403**
   - Κάνε pause στο antivirus “Web Shield” για 5 λεπτά και ξαναδοκίμασε.
   - Δοκίμασε άλλο internet (π.χ. mobile hotspot).

9. **Γρήγορη αυτοματοποιημένη λύση**
   - Τρέξε:
   - `powershell -ExecutionPolicy Bypass -File .\scripts\diagnose-npm.ps1`

10. **Μετά τη διόρθωση**
   - Τρέξε:
   - `npm run dev`
   - Άνοιξε: `http://localhost:3000/demo`
