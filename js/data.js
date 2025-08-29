// js/data.js

// 1) Les 10 actions "soft"
export const ACTIONS_BASE = [
    { id: "mordre",      reason: "qu’on me morde",     labelNum: "Action 01", verb: "mordille délicatement" },
    { id: "griffer",     reason: "qu’on me griffe",    labelNum: "Action 02", verb: "griffe très doucement" },
    { id: "chatouiller", reason: "qu’on me chatouille",labelNum: "Action 03", verb: "chatouille" },
    { id: "masser",      reason: "qu’on me masse",     labelNum: "Action 04", verb: "masse" },
    { id: "embrasser",   reason: "qu’on m’embrasse",   labelNum: "Action 05", verb: "embrasse" },
    { id: "effleurer",   reason: "qu’on m’effleure",   labelNum: "Action 06", verb: "effleure" },
    { id: "caresser",    reason: "qu’on me caresse",   labelNum: "Action 07", verb: "caresse" },
    { id: "pincer",      reason: "qu’on me pince (très légèrement)", labelNum: "Action 08", verb: "pince très légèrement" },
    { id: "souffler",    reason: "qu’on me souffle dessus",          labelNum: "Action 09", verb: "souffle" },
    { id: "tapoter",     reason: "qu’on me tapote (doucement)",       labelNum: "Action 10", verb: "tapote tout doucement" },
  ];
  
  // 2) Les 12 zones refus possibles
  export const BODY_PARTS = [
    { id: "joues",        label: "joues",        def: "les joues" },
    { id: "oreilles",    label: "oreilles",    def: "les oreilles",
      for: { souffler: "à l’oreille" } // ex: “souffler à l’oreille”
    },
    { id: "cou",         label: "cou",         def: "le cou",
      for: { souffler: "dans le cou" }
    },
    { id: "nuque",       label: "nuque",       def: "la nuque",
      for: { souffler: "sur la nuque" }
    },
    { id: "cheveux",     label: "cheveux",     def: "les cheveux",
      for: { souffler: "dans les cheveux" }
    },
    { id: "haut_dos",    label: "haut du dos", def: "le haut du dos" },
    { id: "bas_dos",     label: "bas du dos",  def: "le bas du dos" },
    { id: "ventre",      label: "ventre",      def: "le ventre" },
    { id: "avant_bras",  label: "avant-bras",  def: "l’avant-bras" },
    { id: "doigts",       label: "doigts",       def: "les doigts" },
    { id: "cuisses",      label: "cuisses",      def: "les cuisses" },
  ];
  
  // 3) Compatibilité action ↔ zone
  export const ACTION_ZONE_COMPAT = {
    mordre:      ["joues", "oreilles", "cou", "nuque", "haut_dos", "bas_dos", "ventre", "avant_bras", "doigts", "cuisses"],
    griffer:     ["joues", "oreilles", "cou", "nuque", "haut_dos", "bas_dos", "ventre", "avant_bras", "doigts", "cuisses"],
    chatouiller: ["joues", "cou", "nuque", "haut_dos", "bas_dos", "ventre", "avant_bras", "doigts", "cuisses"],
    masser:      ["nuque", "cheveux", "haut_dos", "bas_dos", "ventre", "avant_bras", "doigts", "cuisses"],
    embrasser:   ["joues", "oreilles", "cou", "nuque", "haut_dos", "bas_dos", "ventre", "avant_bras", "doigts", "cuisses"],
    effleurer:   ["joues", "oreilles", "cou", "nuque", "cheveux", "haut_dos", "bas_dos", "ventre", "avant_bras", "doigts", "cuisses"],
    caresser:    ["joues", "oreilles", "cou", "nuque", "cheveux", "haut_dos", "bas_dos", "ventre", "avant_bras", "doigts", "cuisses"],
    pincer:      ["joues", "haut_dos", "bas_dos", "ventre", "avant_bras", "cuisses"],
    souffler:    ["joues", "cou", "nuque", "cheveux", "haut_dos", "bas_dos", "ventre", "avant_bras", "doigts", "cuisses"],
    tapoter:     ["joues", "cou", "nuque", "haut_dos", "bas_dos", "ventre", "avant_bras", "doigts", "cuisses"],
  };
  
  // 4) Générateur de phrase
  export function buildPhrase({
    actor, recipient, actionId, bodyId, n, mode = "count" /* "count" | "time" */
  }) {
    const action = ACTIONS_BASE.find(a => a.id === actionId);
    const body   = BODY_PARTS.find(b => b.id === bodyId);
    if (!action || !body) return "";
  
    // Prépos particulier pour “souffler”
    const specialPrep = body.for?.[actionId];
    const target = (actionId === "souffler")
      ? (specialPrep || `près de ${body.def}`)
      : body.def;
  
    const core = `${action.verb} ${target} de ${recipient}`;
    return mode === "time"
      ? `${actor} ${core} pendant ${n} secondes.`
      : `${actor} ${core} ${n} fois.`;
  }
  