// === musicLogic_updated.js ===
// Core music theory logic (pure functions + data).
// No DOM access and no Tone.js scheduling here.

// ------------------------------------------------------------
// 0) NOTE CONSTANTS & INTERVALS
// ------------------------------------------------------------
const NOTE_TO_INDEX = {
  "C": 0, "B#": 0, "Dbb": 0,
  "C#": 1, "Db": 1,
  "D": 2, "C##": 2, "Ebb": 2,
  "D#": 3, "Eb": 3, "Fbb": 3,
  "E": 4, "Fb": 4, "D##": 4,
  "F": 5, "E#": 5, "Gbb": 5,
  "F#": 6, "Gb": 6,
  "G": 7, "F##": 7, "Abb": 7,
  "G#": 8, "Ab": 8,
  "A": 9, "G##": 9, "Bbb": 9,
  "A#": 10, "Bb": 10, "Cbb": 10,
  "B": 11, "Cb": 11, "A##": 11
};

const INDEX_TO_NOTES = [
  ["C","B#","Dbb"], ["C#","Db"], ["D","C##","Ebb"], ["D#","Eb","Fbb"],
  ["E","Fb"], ["F","E#","Gbb"], ["F#","Gb"], ["G","F##","Abb"],
  ["G#","Ab"], ["A","G##","Bbb"], ["A#","Bb","Cbb"], ["B","Cb","A##"]
];

const scaleIntervalsMajor = [0,2,4,5,7,9,11];
const scaleIntervalsMinor = [0,2,3,5,7,8,10];

// ------------------------------------------------------------
// 1) DIATONIC CHORD DATA & RULES (kept simple but extensible)
// ------------------------------------------------------------
const diatonicChordsMajor = {
  "1": { rootDegree: 1,  quality: "Major",      structure: ["Major","Maj7","6"],  func: "Tonic" },
  "2": { rootDegree: 2,  quality: "Minor",      structure: ["Minor","m7"],        func: "Subdominant" },
  "3": { rootDegree: 3,  quality: "Minor",      structure: ["Minor","m7"],        func: "Mediant" },
  "4": { rootDegree: 4,  quality: "Major",      structure: ["Major","Maj7","6"],  func: "Subdominant" },
  "5": { rootDegree: 5,  quality: "Major",      structure: ["Major","Dominant 7"],func: "Dominant" },
  "6": { rootDegree: 6,  quality: "Minor",      structure: ["Minor","m7","m6","add9","madd9"], func: "Tonic/Subdominant" },
  "7": { rootDegree: 7,  quality: "Diminished", structure: ["Diminished","Half-Diminished"], func: "Leading Tone" }
};

const diatonicChordsMinor = {
  "1": { rootDegree: 1,  quality: "Minor",      structure: ["Minor","m7","m6","add9","madd9"], func: "Tonic" },
  "2": { rootDegree: 2,  quality: "Diminished", structure: ["Diminished","Half-Diminished"],   func: "Subdominant" },
  "3": { rootDegree: 3,  quality: "Major",      structure: ["Major","Maj7","6"],  func: "Mediant" },
  "4": { rootDegree: 4,  quality: "Minor",      structure: ["Minor","m7"],        func: "Subdominant" },
  "5": { rootDegree: 5,  quality: "Major",      structure: ["Major","Dominant 7","7sus4"], func: "Dominant" },
  "6": { rootDegree: 6,  quality: "Major",      structure: ["Major","Maj7","6"],  func: "Submediant" },
  "7": { rootDegree: 7,  quality: "Diminished", structure: ["Diminished","Half-Diminished"],   func: "Leading Tone" }
};

const PROGRESSION_RULES = {
  Major: {
    "1": ["2","3","4","5","6"],
    "2": ["5","7"],
    "3": ["6","4"],
    "4": ["2","5","7"],
    "5": ["1","6"],
    "6": ["2","4"],
    "7": ["1","3"]
  },
  Minor: {
    "1": ["4","5","6"],
    "2": ["5","7"],
    "3": ["6","4"],
    "4": ["1","5","7"],
    "5": ["1","6"],
    "6": ["2","4"],
    "7": ["1","3"]
  }
};

const ALL_CHORD_TYPES = [
  "Major","Minor","Maj7","m7","Dominant 7",
  "Diminished","Half-Diminished",
  "sus2","sus4","add9","madd9","6","m6","Dominant 7sus4"
];

// ------------------------------------------------------------
// 2) SMALL HELPERS
// ------------------------------------------------------------
function getRandomElement(arr){ if(!arr||arr.length===0) return undefined; return arr[Math.floor(Math.random()*arr.length)]; }
function clamp(v,min,max){ return Math.min(Math.max(v,min),max); }
function getChromaticIndex(note){ return NOTE_TO_INDEX[note] ?? -1; }

function getDiatonicScale(key, quality){
  const root = getChromaticIndex(key);
  const ints = (quality==="Major") ? scaleIntervalsMajor : scaleIntervalsMinor;
  return ints.map(i => INDEX_TO_NOTES[(root + i) % 12][0]);
}

function getRootNote(numeral, key, quality){
  const scale = getDiatonicScale(key, quality);
  const idx = parseInt(numeral,10)-1;
  return scale[idx] || "Error";
}

// Build chord notes from a root + type. Returns {raw, indices}
function getChordNotes(root, type, numeral, key, quality){
  const rootIdx = getChromaticIndex(root);
  if(rootIdx<0) return { raw: "Error", indices: [] };

  const map = {
    "Major":[0,4,7],
    "Minor":[0,3,7],
    "Maj7":[0,4,7,11],
    "m7":[0,3,7,10],
    "Dominant 7":[0,4,7,10],
    "Diminished":[0,3,6],
    "Half-Diminished":[0,3,6,10],
    "sus2":[0,2,7],
    "sus4":[0,5,7],
    "add9":[0,4,7,14],
    "madd9":[0,3,7,14],
    "6":[0,4,7,9],
    "m6":[0,3,7,9],
    "Dominant 7sus4":[0,5,7,10]
  };
  const pattern = map[type] || [0,4,7];
  const notes = pattern.map(semi => INDEX_TO_NOTES[(rootIdx + semi) % 12][0]);
  const indices = pattern.map(semi => (rootIdx + semi) % 12);
  return { raw: notes.join(" "), indices };
}

function getChordSymbolShorthand(root, type){
  switch(type){
    case "Major": return root;
    case "Minor": return root+"m";
    case "Maj7": return root+"maj7";
    case "m7": return root+"m7";
    case "Dominant 7": return root+"7";
    case "Diminished": return root+"dim";
    case "Half-Diminished": return root+"m7b5";
    case "Dominant 7sus4": return root+"7sus4";
    case "sus2": return root+"sus2";
    case "sus4": return root+"sus4";
    case "add9": return root+"add9";
    case "madd9": return root+"madd9";
    case "6": return root+"6";
    case "m6": return root+"m6";
    default: return root+"("+type+")";
  }
}

// ------------------------------------------------------------
// 3) RANDOM CHORD TYPE & NEXT NUMERAL
// ------------------------------------------------------------
function getRandomType(numeral, quality="Major"){
  const set = (quality==="Major"?diatonicChordsMajor:diatonicChordsMinor)[numeral];
  if(!set || !Array.isArray(set.structure)) return "Major";
  return getRandomElement(set.structure);
}
function getRandomNumeral(currentNumeral, quality="Major"){
  const rules = PROGRESSION_RULES[quality] || PROGRESSION_RULES.Major;
  const list = rules[currentNumeral] || Object.keys(rules);
  return getRandomElement(list);
}

// ------------------------------------------------------------
// 4) RELATED KEY / MODULATION HELPERS
// ------------------------------------------------------------
function relatedKeys(key, quality){
  const idx = getChromaticIndex(key);
  const relMin = INDEX_TO_NOTES[(idx + 9) % 12][0];  // major -> rel minor
  const relMaj = INDEX_TO_NOTES[(idx + 3) % 12][0];  // minor -> rel major
  const dom    = INDEX_TO_NOTES[(idx + 7) % 12][0];  // V
  const subdom = INDEX_TO_NOTES[(idx + 5) % 12][0];  // IV
  if(quality==="Major"){
    return [
      { key: relMin, quality: "Minor" },
      { key: dom,    quality: "Major" },
      { key: subdom, quality: "Major" }
    ];
  }else{
    return [
      { key: relMaj, quality: "Major" },
      { key: dom,    quality: "Minor" },
      { key: subdom, quality: "Minor" }
    ];
  }
}

// ------------------------------------------------------------
// 5) VOICING / INVERSION: SINGLE-OCTAVE, MINIMUM MOTION
//    (Restored from original approach using chromatic indices.)
// ------------------------------------------------------------
function getBestBassNote(prevChordNotesInfo, currentChordNotesInfo){
  if(!currentChordNotesInfo || !currentChordNotesInfo.raw) return "C";
  const currNotes = currentChordNotesInfo.raw.split(" ");
  const currIdx   = currentChordNotesInfo.indices && currentChordNotesInfo.indices.length
      ? currentChordNotesInfo.indices
      : currNotes.map(n => getChromaticIndex(n));

  // If no previous chord, keep root as bass and store voiced
  if(!prevChordNotesInfo || !prevChordNotesInfo.indices || prevChordNotesInfo.indices.length===0){
    currentChordNotesInfo.voiced = currNotes.join(" ");
    return currNotes[0];
  }

  const prevIdx = prevChordNotesInfo.indices;
  const prevRootIndex = prevIdx[0];

  let bestBass = currNotes[0];
  let minMovement = Infinity;

  // Try first up to 4 chord tones as possible basses (root/3rd/5th/7th)
  for(let i=0;i<Math.min(currNotes.length,4);i++){
    const bassNote = currNotes[i];
    const bassIndex = currIdx[i];
    let diff = Math.abs(prevRootIndex - bassIndex);
    let movement = Math.min(diff, 12 - diff); // wrap around within octave

    if(movement < minMovement){
      minMovement = movement;
      bestBass = bassNote;
    }
  }

  // Build a single-octave voiced chord with the chosen bass first
  const bassPos = currNotes.indexOf(bestBass);
  const inversion = [...currNotes.slice(bassPos), ...currNotes.slice(0,bassPos)];
  currentChordNotesInfo.voiced = inversion.join(" ");
  return bestBass.replace(/\d+$/,"");
}

// ------------------------------------------------------------
// 6) CHORD POSSIBILITY LISTS FOR ANALYSIS (per numeral)
// ------------------------------------------------------------
function getAllChordPossibilities(numeral, key, quality){
  const dict = (quality==="Major")? diatonicChordsMajor : diatonicChordsMinor;
  const entry = dict[numeral];
  if(!entry) return [];

  // A curated set of types to show like your original palette
  const types = entry.structure.concat(
    entry.quality==="Major" ? ["sus2","sus4","add9","6"] :
    entry.quality==="Minor" ? ["sus2","sus4","m6","madd9","m7","Am11?".replace("A","")] :
    ["Half-Diminished"]
  );

  // Deduplicate while preserving order
  const seen = new Set(); const list = [];
  types.forEach(t => { if(!seen.has(t)){ seen.add(t); list.push(t); }});

  // Compute root and spell notes for each listed type
  const root = getRootNote(numeral, key, quality);
  return list.map(t => {
    const info = getChordNotes(root, t, numeral, key, quality);
    return {
      label: getChordSymbolShorthand(root, t),
      type: t,
      notes: info.raw
    };
  });
}

// ------------------------------------------------------------
// 7) EXPORT (globals for uiController)
// ------------------------------------------------------------
window.NOTE_TO_INDEX = NOTE_TO_INDEX;
window.INDEX_TO_NOTES = INDEX_TO_NOTES;
window.diatonicChordsMajor = diatonicChordsMajor;
window.diatonicChordsMinor = diatonicChordsMinor;
window.PROGRESSION_RULES = PROGRESSION_RULES;
window.ALL_CHORD_TYPES = ALL_CHORD_TYPES;

window.getChromaticIndex = getChromaticIndex;
window.getDiatonicScale = getDiatonicScale;
window.getRootNote = getRootNote;
window.getChordNotes = getChordNotes;
window.getChordSymbolShorthand = getChordSymbolShorthand;

window.getRandomType = getRandomType;
window.getRandomNumeral = getRandomNumeral;
window.relatedKeys = relatedKeys;

window.getBestBassNote = getBestBassNote;
window.getAllChordPossibilities = getAllChordPossibilities;
