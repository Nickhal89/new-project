export type Competency =
  | 'service'
  | 'stress'
  | 'teamwork'
  | 'reliability'
  | 'learning'
  | 'integrity'
  | 'validity';

export type ItemType = 'likert' | 'sjt' | 'tradeoff' | 'validity';

export type LikertItem = {
  question_id: string;
  type: 'likert';
  competency: Exclude<Competency, 'validity'>;
  prompt_el: string;
  scale: { min: 1; max: 5; labels_el: [string, string, string, string, string] };
  scoring: { kind: 'likert_1_5'; reverse?: boolean };
  hr_why_templates_el: { high: string; mid: string; low: string };
};

export type SjtItem = {
  question_id: string;
  type: 'sjt';
  competency: Exclude<Competency, 'validity'>;
  prompt_el: string;
  options: Array<{
    key: 'A' | 'B' | 'C';
    text_el: string;
    weight_0_5: number;
  }>;
  scoring: { kind: 'choice_weight_0_5' };
  hr_why_templates_el: { high: string; mid: string; low: string };
};

export type TradeoffItem = {
  question_id: string;
  type: 'tradeoff';
  competency: 'validity';
  prompt_el: string;
  choices: Array<{
    key: 'A' | 'B';
    text_el: string;
    mapping: Partial<Record<Exclude<Competency, 'validity'>, number>>;
  }>;
  scoring: { kind: 'forced_choice_points' };
  hr_why_templates_el: { high: string; mid: string; low: string };
};

export type ValidityItem = {
  question_id: string;
  type: 'validity';
  competency: 'validity';
  prompt_el: string;
  scale: { min: 1; max: 5; labels_el: [string, string, string, string, string] };
  scoring: {
    kind: 'validity_flag';
    threshold_gte: number;
    flag: 'impression_management' | 'unrealistic_self_presentation';
  };
  hr_why_templates_el: { high: string; mid: string; low: string };
};

export type WaiterItem = LikertItem | SjtItem | TradeoffItem | ValidityItem;

export const WAITER_PROFILE_V1 = {
  id: 'waiter_service_v1',
  title_el: 'Waiter / Service Staff',
  competencies: [
    { key: 'service' as const, label_el: 'Εξυπηρέτηση & Φιλοξενία' },
    { key: 'stress' as const, label_el: 'Αντοχή σε Πίεση' },
    { key: 'teamwork' as const, label_el: 'Ομαδικότητα & Επικοινωνία' },
    { key: 'reliability' as const, label_el: 'Συνέπεια & Ακρίβεια' },
    { key: 'learning' as const, label_el: 'Ταχύτητα Εκμάθησης' },
    { key: 'integrity' as const, label_el: 'Ακεραιότητα & Κανόνες' }
  ],
  weights: {
    service: 0.25,
    stress: 0.2,
    reliability: 0.2,
    teamwork: 0.15,
    learning: 0.1,
    integrity: 0.1
  }
} as const;

const LIKERT_LABELS_EL: [string, string, string, string, string] = [
  'Διαφωνώ απόλυτα',
  'Διαφωνώ',
  'Ούτε/ούτε',
  'Συμφωνώ',
  'Συμφωνώ απόλυτα'
];

export const WAITER_ITEM_BANK_V1: WaiterItem[] = [
  {
    question_id: 'likert_w_1',
    type: 'likert',
    competency: 'service',
    prompt_el:
      'Όταν ένας πελάτης είναι απαιτητικός, προσπαθώ να καταλάβω τι πραγματικά χρειάζεται πριν απαντήσω.',
    scale: { min: 1, max: 5, labels_el: LIKERT_LABELS_EL },
    scoring: { kind: 'likert_1_5' },
    hr_why_templates_el: {
      high: 'Πελατοκεντρική στάση και προσπάθεια κατανόησης πριν αντίδραση.',
      mid: 'Ικανοποιητική εξυπηρέτηση, με περιθώριο καλύτερης ενεργητικής ακρόασης.',
      low: 'Πιθανή παρορμητική αντίδραση σε δύσκολους πελάτες.'
    }
  },
  {
    question_id: 'likert_w_2',
    type: 'likert',
    competency: 'stress',
    prompt_el: 'Σε περιόδους έντονης πίεσης, διατηρώ σταθερό ρυθμό χωρίς να εκνευρίζομαι.',
    scale: { min: 1, max: 5, labels_el: LIKERT_LABELS_EL },
    scoring: { kind: 'likert_1_5' },
    hr_why_templates_el: {
      high: 'Διατηρεί λειτουργικότητα υπό πίεση (rush hours).',
      mid: 'Αντέχει μέτρια πίεση — χρειάζεται καθαρή ιεράρχηση σε peak.',
      low: 'Ενδέχεται να αποδιοργανώνεται ή να αντιδρά έντονα σε πίεση.'
    }
  },
  {
    question_id: 'likert_w_3',
    type: 'likert',
    competency: 'reliability',
    prompt_el: 'Ελέγχω διπλά τις παραγγελίες πριν τις παραδώσω.',
    scale: { min: 1, max: 5, labels_el: LIKERT_LABELS_EL },
    scoring: { kind: 'likert_1_5' },
    hr_why_templates_el: {
      high: 'Έμφαση στη λεπτομέρεια — μειώνει λάθη σε παραγγελίες.',
      mid: 'Βασικός έλεγχος, αλλά μπορεί να χρειάζεται πιο σταθερή ρουτίνα.',
      low: 'Αυξημένο ρίσκο λαθών / ασυνέπειας στην εκτέλεση.'
    }
  },
  {
    question_id: 'likert_w_4',
    type: 'likert',
    competency: 'teamwork',
    prompt_el: 'Προτιμώ να λύνω παρεξηγήσεις άμεσα αντί να τις αφήνω να μεγαλώσουν.',
    scale: { min: 1, max: 5, labels_el: LIKERT_LABELS_EL },
    scoring: { kind: 'likert_1_5' },
    hr_why_templates_el: {
      high: 'Προληπτική διαχείριση συνεργασίας και επικοινωνίας.',
      mid: 'Λύνει θέματα όταν πιεστεί — όχι πάντα προληπτικά.',
      low: 'Κίνδυνος συσσώρευσης έντασης/παρεξηγήσεων στην ομάδα.'
    }
  },
  {
    question_id: 'likert_w_5',
    type: 'likert',
    competency: 'learning',
    prompt_el: 'Όταν ξεκινώ σε νέο χώρο, μαθαίνω γρήγορα τις διαδικασίες παρατηρώντας.',
    scale: { min: 1, max: 5, labels_el: LIKERT_LABELS_EL },
    scoring: { kind: 'likert_1_5' },
    hr_why_templates_el: {
      high: 'Γρήγορη προσαρμογή σε νέα διαδικασία/περιβάλλον.',
      mid: 'Μαθαίνει με ρυθμό — θέλει πιο καθαρή καθοδήγηση.',
      low: 'Πιθανή αργή προσαρμογή σε αλλαγές και νέα συστήματα.'
    }
  },
  {
    question_id: 'likert_w_6',
    type: 'likert',
    competency: 'integrity',
    prompt_el: 'Αν κάνω λάθος σε παραγγελία, το αναφέρω αμέσως.',
    scale: { min: 1, max: 5, labels_el: LIKERT_LABELS_EL },
    scoring: { kind: 'likert_1_5' },
    hr_why_templates_el: {
      high: 'Ανάληψη ευθύνης και διαφάνεια στα λάθη.',
      mid: 'Συνήθως αναλαμβάνει ευθύνη — υπό πίεση ίσως καθυστερεί.',
      low: 'Κίνδυνος απόκρυψης/μετακύλισης ευθύνης σε λάθη.'
    }
  },
  {
    question_id: 'likert_w_7',
    type: 'likert',
    competency: 'service',
    prompt_el: 'Ακόμη και αν είμαι κουρασμένος, προσπαθώ να διατηρώ θετική εικόνα προς τον πελάτη.',
    scale: { min: 1, max: 5, labels_el: LIKERT_LABELS_EL },
    scoring: { kind: 'likert_1_5' },
    hr_why_templates_el: {
      high: 'Σταθερή εικόνα εξυπηρέτησης — καλό front-line presence.',
      mid: 'Κρατά επίπεδο στις περισσότερες περιπτώσεις.',
      low: 'Επηρεάζεται εύκολα — ρίσκο αρνητικής εμπειρίας πελάτη.'
    }
  },
  {
    question_id: 'likert_w_8',
    type: 'likert',
    competency: 'stress',
    prompt_el: 'Όταν συμβαίνουν πολλά ταυτόχρονα, δυσκολεύομαι να ιεραρχήσω.',
    scale: { min: 1, max: 5, labels_el: LIKERT_LABELS_EL },
    scoring: { kind: 'likert_1_5', reverse: true },
    hr_why_templates_el: {
      high: 'Ικανότητα ιεράρχησης σε πολυδιεργασία (peak ώρες).',
      mid: 'Μέτρια ιεράρχηση — χρειάζεται πιο καθαρό workflow.',
      low: 'Πιθανή αποδιοργάνωση σε peak περιβάλλον.'
    }
  },
  {
    question_id: 'likert_w_9',
    type: 'likert',
    competency: 'teamwork',
    prompt_el: 'Εάν ένας συνάδελφος μείνει πίσω, προσφέρομαι να βοηθήσω.',
    scale: { min: 1, max: 5, labels_el: LIKERT_LABELS_EL },
    scoring: { kind: 'likert_1_5' },
    hr_why_templates_el: {
      high: 'Συνεργατική στάση — βοηθά την ομάδα να κρατήσει ρυθμό.',
      mid: 'Βοηθά όταν υπάρχει χρόνος — όχι πάντα προληπτικά.',
      low: 'Ατομικιστική τάση — ρίσκο ασυντονισμού σε rush.'
    }
  },
  {
    question_id: 'likert_w_10',
    type: 'likert',
    competency: 'reliability',
    prompt_el: 'Μου έχει τύχει να καθυστερώ επειδή υπολόγισα λάθος τον χρόνο.',
    scale: { min: 1, max: 5, labels_el: LIKERT_LABELS_EL },
    scoring: { kind: 'likert_1_5', reverse: true },
    hr_why_templates_el: {
      high: 'Καλός έλεγχος χρόνου/συνέπεια.',
      mid: 'Μικρές αστοχίες χρόνου — βελτιώνεται με ρουτίνα.',
      low: 'Ρίσκο ασυνέπειας ωραρίων/καθυστερήσεων.'
    }
  },
  {
    question_id: 'likert_w_11',
    type: 'likert',
    competency: 'learning',
    prompt_el: 'Ζητώ feedback όταν θέλω να βελτιωθώ.',
    scale: { min: 1, max: 5, labels_el: LIKERT_LABELS_EL },
    scoring: { kind: 'likert_1_5' },
    hr_why_templates_el: {
      high: 'Αναπτυξιακή νοοτροπία — μαθαίνει από feedback.',
      mid: 'Δέχεται feedback όταν δοθεί, αλλά δεν το ζητά συστηματικά.',
      low: 'Αντίσταση σε feedback — πιο αργή βελτίωση στην πράξη.'
    }
  },
  {
    question_id: 'likert_w_12',
    type: 'likert',
    competency: 'integrity',
    prompt_el: 'Κάποιες φορές οι κανόνες μπορούν να παρακαμφθούν αν δεν το προσέξει κανείς.',
    scale: { min: 1, max: 5, labels_el: LIKERT_LABELS_EL },
    scoring: { kind: 'likert_1_5', reverse: true },
    hr_why_templates_el: {
      high: 'Σταθερή στάση σε κανόνες/πολιτικές.',
      mid: 'Πρακτικός/η — θέλει καθαρά SOP και έλεγχο.',
      low: 'Πιθανή ανοχή σε παρακάμψεις — ρίσκο policy violations.'
    }
  },
  {
    question_id: 'sjt_w_1',
    type: 'sjt',
    competency: 'service',
    prompt_el: 'Πελάτης παραπονιέται για καθυστέρηση. Τι κάνεις πρώτα;',
    options: [
      { key: 'A', text_el: 'Εξηγώ ήρεμα την κατάσταση και προτείνω λύση/εναλλακτική.', weight_0_5: 5 },
      { key: 'B', text_el: 'Του λέω ότι φταίει η κουζίνα και ότι δεν μπορώ να κάνω κάτι.', weight_0_5: 2 },
      { key: 'C', text_el: 'Λέω “θα δω” και φεύγω χωρίς σαφή ενημέρωση.', weight_0_5: 3 }
    ],
    scoring: { kind: 'choice_weight_0_5' },
    hr_why_templates_el: {
      high: 'Διαχειρίζεται παράπονα με λύση και ήρεμη επικοινωνία.',
      mid: 'Καλό intent αλλά χρειάζεται πιο καθαρή δέσμευση/ενημέρωση.',
      low: 'Ρίσκο μετακύλισης ευθύνης ή ασάφειας προς τον πελάτη.'
    }
  },
  {
    question_id: 'sjt_w_2',
    type: 'sjt',
    competency: 'stress',
    prompt_el: 'Δύο τραπέζια ζητούν ταυτόχρονα βοήθεια. Πώς αντιδράς;',
    options: [
      { key: 'A', text_el: 'Ιεραρχώ και ενημερώνω το ένα ότι επιστρέφω σε 1-2 λεπτά.', weight_0_5: 5 },
      { key: 'B', text_el: 'Πηγαίνω σε αυτό που φωνάζει πιο δυνατά.', weight_0_5: 2 },
      { key: 'C', text_el: 'Περιμένω μήπως πάει κάποιος άλλος.', weight_0_5: 1 }
    ],
    scoring: { kind: 'choice_weight_0_5' },
    hr_why_templates_el: {
      high: 'Σωστή ιεράρχηση και διαχείριση προσδοκιών σε peak.',
      mid: 'Ανταποκρίνεται αλλά όχι με βέλτιστη ιεράρχηση.',
      low: 'Ρίσκο αποδιοργάνωσης/παθητικότητας σε πίεση.'
    }
  },
  {
    question_id: 'sjt_w_3',
    type: 'sjt',
    competency: 'teamwork',
    prompt_el: 'Συνάδελφος κάνει λάθος σε λογαριασμό. Τι κάνεις;',
    options: [
      { key: 'A', text_el: 'Τον/την ενημερώνω διακριτικά και βοηθάω να διορθωθεί.', weight_0_5: 5 },
      { key: 'B', text_el: 'Το επισημαίνω μπροστά στον πελάτη για να “φανεί”.', weight_0_5: 1 },
      { key: 'C', text_el: 'Δεν παρεμβαίνω, ας το λύσει μόνος/η του/της.', weight_0_5: 2 }
    ],
    scoring: { kind: 'choice_weight_0_5' },
    hr_why_templates_el: {
      high: 'Διακριτική συνεργασία και προστασία εμπειρίας πελάτη.',
      mid: 'Ουδέτερη στάση — χρειάζεται πιο ενεργό teamwork.',
      low: 'Ρίσκο τοξικής συμπεριφοράς ή κακού handoff.'
    }
  },
  {
    question_id: 'sjt_w_4',
    type: 'sjt',
    competency: 'reliability',
    prompt_el: 'Ξέχασες να περάσεις παραγγελία. Πώς το χειρίζεσαι;',
    options: [
      { key: 'A', text_el: 'Το παραδέχομαι και διορθώνω άμεσα ενημερώνοντας σωστά.', weight_0_5: 5 },
      { key: 'B', text_el: 'Λέω ότι καθυστέρησε η κουζίνα.', weight_0_5: 1 },
      { key: 'C', text_el: 'Ελπίζω να μην το καταλάβουν και το αφήνω.', weight_0_5: 0 }
    ],
    scoring: { kind: 'choice_weight_0_5' },
    hr_why_templates_el: {
      high: 'Σταθερή ευθύνη και ταχεία διόρθωση σφαλμάτων.',
      mid: 'Διορθώνει αλλά με τάση για δικαιολογίες.',
      low: 'Υψηλό ρίσκο απόκρυψης/συσσώρευσης προβλημάτων.'
    }
  },
  {
    question_id: 'sjt_w_5',
    type: 'sjt',
    competency: 'learning',
    prompt_el: 'Αλλάζει το POS/σύστημα. Τι κάνεις τις πρώτες 2 μέρες;',
    options: [
      { key: 'A', text_el: 'Ζητώ σύντομη εκπαίδευση και το δοκιμάζω άμεσα.', weight_0_5: 5 },
      { key: 'B', text_el: 'Περιμένω να το μάθω “στην πράξη” χωρίς να ρωτήσω.', weight_0_5: 3 },
      { key: 'C', text_el: 'Το αποφεύγω όσο μπορώ.', weight_0_5: 1 }
    ],
    scoring: { kind: 'choice_weight_0_5' },
    hr_why_templates_el: {
      high: 'Γρήγορη εκμάθηση/πρωτοβουλία σε νέα εργαλεία.',
      mid: 'Μαθαίνει με τριβή αλλά όχι με δομημένο τρόπο.',
      low: 'Αντίσταση σε αλλαγές — αργή προσαρμογή.'
    }
  },
  {
    question_id: 'sjt_w_6',
    type: 'sjt',
    competency: 'integrity',
    prompt_el: 'Βλέπεις συνάδελφο να χειρίζεται ρέστα “χωρίς απόδειξη”. Τι κάνεις;',
    options: [
      { key: 'A', text_el: 'Το αναφέρω στον υπεύθυνο με ψυχραιμία.', weight_0_5: 5 },
      { key: 'B', text_el: 'Δεν εμπλέκομαι, “δεν είναι δική μου δουλειά”.', weight_0_5: 2 },
      { key: 'C', text_el: 'Το αγνοώ εντελώς.', weight_0_5: 1 }
    ],
    scoring: { kind: 'choice_weight_0_5' },
    hr_why_templates_el: {
      high: 'Σεβασμός κανόνων και προστασία επιχείρησης.',
      mid: 'Ουδέτερη στάση — χρειάζεται ξεκάθαρα SOP/κουλτούρα.',
      low: 'Ανοχή σε παρατυπίες — ρίσκο για cash handling.'
    }
  },
  {
    question_id: 'sjt_w_7',
    type: 'sjt',
    competency: 'service',
    prompt_el: 'VIP πελάτης έρχεται χωρίς κράτηση σε γεμάτο χώρο. Τι κάνεις;',
    options: [
      { key: 'A', text_el: 'Εξηγώ ευγενικά και προσπαθώ να βρω λύση (αναμονή/εναλλακτικό).', weight_0_5: 5 },
      { key: 'B', text_el: 'Λέω “δεν γίνεται τίποτα” χωρίς πρόταση.', weight_0_5: 2 },
      { key: 'C', text_el: 'Τον αφήνω να περιμένει χωρίς ενημέρωση.', weight_0_5: 1 }
    ],
    scoring: { kind: 'choice_weight_0_5' },
    hr_why_templates_el: {
      high: 'Διαχειρίζεται προσδοκίες και βρίσκει λύση με επαγγελματισμό.',
      mid: 'Κρατά κανόνες αλλά χρειάζεται καλύτερη επικοινωνία.',
      low: 'Ρίσκο αρνητικής εμπειρίας λόγω ασαφούς/απότομης στάσης.'
    }
  },
  {
    question_id: 'sjt_w_8',
    type: 'sjt',
    competency: 'stress',
    prompt_el: 'Σε peak ώρα 3 τραπέζια ζητούν ταυτόχρονα. Πώς κρατάς τόνο/ρυθμό;',
    options: [
      { key: 'A', text_el: 'Κρατάω ήρεμο τόνο, δίνω σύντομη ενημέρωση και προχωράω με σειρά.', weight_0_5: 5 },
      { key: 'B', text_el: 'Απαντάω νευρικά/κοφτά για να τελειώνω.', weight_0_5: 1 },
      { key: 'C', text_el: 'Αγνοώ προσωρινά μέχρι να “ηρεμήσουν”.', weight_0_5: 2 }
    ],
    scoring: { kind: 'choice_weight_0_5' },
    hr_why_templates_el: {
      high: 'Δείχνει αυτοέλεγχο και διαχείριση πίεσης με επικοινωνία.',
      mid: 'Διατηρεί ρυθμό αλλά με ατέλειες στην επικοινωνία.',
      low: 'Ρίσκο σύγκρουσης/αρνητικού tone υπό πίεση.'
    }
  },
  {
    question_id: 'sjt_w_9',
    type: 'sjt',
    competency: 'teamwork',
    prompt_el: 'Βλέπεις backlog στην κουζίνα. Τι κάνεις στο σέρβις;',
    options: [
      { key: 'A', text_el: 'Προσαρμόζω ρυθμό και ενημερώνω πελάτες εγκαίρως.', weight_0_5: 5 },
      { key: 'B', text_el: 'Πιέζω την κουζίνα μπροστά σε όλους.', weight_0_5: 1 },
      { key: 'C', text_el: 'Δεν λέω τίποτα, “θα βγει όταν βγει”.', weight_0_5: 2 }
    ],
    scoring: { kind: 'choice_weight_0_5' },
    hr_why_templates_el: {
      high: 'Συντονισμός front/back of house με σωστή ενημέρωση πελατών.',
      mid: 'Λειτουργεί αλλά χρειάζεται καλύτερο handoff/επικοινωνία.',
      low: 'Ρίσκο κακής συνεργασίας ή κακής εμπειρίας πελάτη.'
    }
  },
  {
    question_id: 'sjt_w_10',
    type: 'sjt',
    competency: 'reliability',
    prompt_el: 'Χάνεις/ξεχνάς shift. Ποια είναι η πιο σωστή κίνηση;',
    options: [
      { key: 'A', text_el: 'Ζητώ συγγνώμη και προτείνω κάλυψη/αντικατάσταση/extra βάρδια.', weight_0_5: 5 },
      { key: 'B', text_el: 'Λέω ότι δεν ενημερώθηκα, άρα “δεν φταίω”.', weight_0_5: 2 },
      { key: 'C', text_el: 'Δεν το θεωρώ σημαντικό, “απλά έτυχε”.', weight_0_5: 0 }
    ],
    scoring: { kind: 'choice_weight_0_5' },
    hr_why_templates_el: {
      high: 'Αναλαμβάνει ευθύνη και αποκαθιστά πρακτικά τη ζημιά.',
      mid: 'Υπάρχει τάση για δικαιολογία — χρειάζεται σαφήνεια κανόνων.',
      low: 'Ρίσκο χαμηλής συνέπειας/δέσμευσης.'
    }
  },
  {
    question_id: 'sjt_w_11',
    type: 'sjt',
    competency: 'learning',
    prompt_el: 'Έρχεται νέο μενού. Πώς προετοιμάζεσαι για ερωτήσεις πελατών;',
    options: [
      { key: 'A', text_el: 'Διαβάζω/μαθαίνω βασικά και ρωτάω στοχευμένα για λεπτομέρειες.', weight_0_5: 5 },
      { key: 'B', text_el: 'Μαθαίνω μόνο όταν με ρωτήσουν την ώρα της δουλειάς.', weight_0_5: 2 },
      { key: 'C', text_el: 'Δεν ασχολούμαι ιδιαίτερα — “θα δω εκεί”.', weight_0_5: 0 }
    ],
    scoring: { kind: 'choice_weight_0_5' },
    hr_why_templates_el: {
      high: 'Προετοιμασία και γρήγορη εκμάθηση — λιγότερα λάθη/αμηχανία.',
      mid: 'Θα μάθει στην πράξη αλλά με κόστος στην εμπειρία πελάτη.',
      low: 'Αντίσταση στην προετοιμασία — ρίσκο κακής ενημέρωσης.'
    }
  },
  {
    question_id: 'sjt_w_12',
    type: 'sjt',
    competency: 'integrity',
    prompt_el: 'Το ταμείο στο τέλος δείχνει +10€. Τι κάνεις;',
    options: [
      { key: 'A', text_el: 'Το αναφέρω αμέσως και το καταγράφω όπως ορίζεται.', weight_0_5: 5 },
      { key: 'B', text_el: 'Το αφήνω — “δεν πειράζει”.', weight_0_5: 2 },
      { key: 'C', text_el: 'Το κρατάω/το μοιράζω.', weight_0_5: 0 }
    ],
    scoring: { kind: 'choice_weight_0_5' },
    hr_why_templates_el: {
      high: 'Καθαρή στάση σε cash handling και κανόνες.',
      mid: 'Ουδέτερη στάση — χρειάζεται κανόνες και εποπτεία.',
      low: 'Υψηλό ρίσκο σε θέματα εμπιστοσύνης/ταμείου.'
    }
  },
  {
    question_id: 'tradeoff_w_1',
    type: 'tradeoff',
    competency: 'validity',
    prompt_el: 'Σε ώρα αιχμής τι προτιμάς να πετύχεις πρώτα;',
    choices: [
      { key: 'A', text_el: 'Τέλεια εξυπηρέτηση έστω και λίγο πιο αργά.', mapping: { service: 3, reliability: 1 } },
      { key: 'B', text_el: 'Πολύ γρήγορη εξυπηρέτηση με μικρές ατέλειες.', mapping: { stress: 2, teamwork: 1 } }
    ],
    scoring: { kind: 'forced_choice_points' },
    hr_why_templates_el: {
      high: 'Δείχνει ξεκάθαρη προτεραιοποίηση σε ρόλο εξυπηρέτησης.',
      mid: 'Ισορροπεί προτεραιότητες ανάλογα με συνθήκες.',
      low: 'Ασυνεπής προτεραιοποίηση — θέλει σαφές πλαίσιο.'
    }
  },
  {
    question_id: 'tradeoff_w_2',
    type: 'tradeoff',
    competency: 'validity',
    prompt_el: 'Όταν η ομάδα πιέζεται, τι σε εκφράζει περισσότερο;',
    choices: [
      { key: 'A', text_el: 'Βοηθάω την ομάδα ακόμα κι αν καθυστερήσω προσωπικά.', mapping: { teamwork: 3, service: 1 } },
      { key: 'B', text_el: 'Τελειώνω πρώτα τα δικά μου για να “μην εκτεθώ”.', mapping: { reliability: 2 } }
    ],
    scoring: { kind: 'forced_choice_points' },
    hr_why_templates_el: {
      high: 'Συνεργατική κατεύθυνση σε περιβάλλον rush.',
      mid: 'Πρακτική στάση — εξαρτάται από κουλτούρα ομάδας.',
      low: 'Πιθανή ατομικιστική λειτουργία σε περιόδους πίεσης.'
    }
  },
  {
    question_id: 'tradeoff_w_3',
    type: 'tradeoff',
    competency: 'validity',
    prompt_el: 'Σε κανόνες και διαδικασίες τι σε εκφράζει περισσότερο;',
    choices: [
      { key: 'A', text_el: 'Οι κανόνες είναι σταθεροί και τους ακολουθώ.', mapping: { integrity: 3, reliability: 1 } },
      { key: 'B', text_el: 'Προσαρμόζονται ανάλογα την περίσταση.', mapping: { service: 1, stress: 1 } }
    ],
    scoring: { kind: 'forced_choice_points' },
    hr_why_templates_el: {
      high: 'Δείχνει σαφή προσανατολισμό σε compliance και συνέπεια.',
      mid: 'Πρακτικός/η — θέλει σαφή SOP για να μην υπάρξει drift.',
      low: 'Κίνδυνος “γκρίζων ζωνών” αν δεν υπάρχει πλαίσιο.'
    }
  },
  {
    question_id: 'tradeoff_w_4',
    type: 'tradeoff',
    competency: 'validity',
    prompt_el: 'Τι σε εκφράζει περισσότερο σε ένα χώρο εργασίας;',
    choices: [
      { key: 'A', text_el: 'Μου αρέσουν αλλαγές και να μαθαίνω νέα πράγματα.', mapping: { learning: 3 } },
      { key: 'B', text_el: 'Προτιμώ σταθερότητα και λίγες αλλαγές.', mapping: { reliability: 1 } }
    ],
    scoring: { kind: 'forced_choice_points' },
    hr_why_templates_el: {
      high: 'Δείχνει προσαρμοστικότητα και learning velocity.',
      mid: 'Ισορροπεί σταθερότητα/μάθηση.',
      low: 'Πιθανή δυσκολία σε αλλαγές διαδικασιών.'
    }
  },
  {
    question_id: 'validity_w_1',
    type: 'validity',
    competency: 'validity',
    prompt_el: 'Δεν έχω κάνει ποτέ κανένα λάθος στη δουλειά.',
    scale: { min: 1, max: 5, labels_el: LIKERT_LABELS_EL },
    scoring: { kind: 'validity_flag', threshold_gte: 5, flag: 'impression_management' },
    hr_why_templates_el: {
      high: 'Σημείωση: ένδειξη υπερβολικά “τέλειας” αυτοπαρουσίασης (έλεγχος αξιοπιστίας).',
      mid: 'Ουδέτερο.',
      low: 'Ουδέτερο.'
    }
  },
  {
    question_id: 'validity_w_2',
    type: 'validity',
    competency: 'validity',
    prompt_el: 'Πάντα συμφωνώ με όλους τους συναδέλφους μου.',
    scale: { min: 1, max: 5, labels_el: LIKERT_LABELS_EL },
    scoring: { kind: 'validity_flag', threshold_gte: 5, flag: 'unrealistic_self_presentation' },
    hr_why_templates_el: {
      high: 'Σημείωση: πιθανή “unrealistic” αυτοεικόνα (έλεγχος αξιοπιστίας).',
      mid: 'Ουδέτερο.',
      low: 'Ουδέτερο.'
    }
  }
];

export const WAITER_ITEMS_BY_ID = Object.fromEntries(
  WAITER_ITEM_BANK_V1.map((i) => [i.question_id, i])
) as Record<string, WaiterItem>;
