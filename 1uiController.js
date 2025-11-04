// === uiController_updated.js ===
// UI bridge: builds progressions, renders boxes, renders full analysis.
// Expects musicLogic_updated.js + audioEngine.js to be loaded first.

document.addEventListener("DOMContentLoaded", () => {
  const keyEl         = document.getElementById("keySelect");
  const qualityEl     = document.getElementById("qualitySelect");
  const lenEl         = document.getElementById("numChords");
  const numExamplesEl = document.getElementById("numExamples");
  const modEl         = document.getElementById("modulationToggle");
  const bassDropEl    = document.getElementById("bassDropToggle");
  const deceptiveEl   = document.getElementById("deceptiveCadence");
  const generateBtn   = document.getElementById("generateButton");
  const out           = document.getElementById("progressionOutput");
  const analysisOut   = document.getElementById("analysisOutput");

  // Make sure globals exist
  window.allGeneratedProgressions = window.allGeneratedProgressions || [];

  populateKeys();

  generateBtn.addEventListener("click", () => {
    const key           = keyEl.value;
    const quality       = qualityEl.value;
    const length        = parseInt(lenEl.value, 10) || 4;
    const numExamples   = parseInt(numExamplesEl.value, 10) || 1;
    const enableMod     = !!modEl.checked;
    const deceptive     = !!deceptiveEl.checked;
    window.isBassDropEnabled = !!bassDropEl.checked;
    window.isModulationEnabled = enableMod;

    const results = [];
    for(let i=0;i<numExamples;i++){
      results.push(buildRuleBasedProgression({key, quality, length, enableMod, deceptive}));
    }
    window.allGeneratedProgressions = results;
    renderProgressions(results, { key, quality });
    analysisOut.innerHTML = renderFullAnalysis(results);
  });

  function populateKeys(){
    const keys = ["C","C#","Db","D","Eb","E","F","F#","Gb","G","Ab","A","Bb","B"];
    keyEl.innerHTML = "";
    keys.forEach(k => {
      const opt = document.createElement("option");
      opt.value = k; opt.textContent = k;
      keyEl.appendChild(opt);
    });
    keyEl.value = "C";
  }
});

// ------------------------------------------------------------
// Build one progression with optional modulation & deceptive cadence
// ------------------------------------------------------------
function buildRuleBasedProgression(opts){
  const {key, quality, length, enableMod, deceptive} = opts;
  const prog = [];
  let context = { key, quality };
  let numeral = "1";
  let prevNotesInfo = null;

  for(let i=0;i<length;i++){
    const root = getRootNote(numeral, context.key, context.quality);
    const chordType = getRandomType(numeral, context.quality);
    const notesInfo = getChordNotes(root, chordType, numeral, context.key, context.quality);

    // Apply restored voicing (single-octave inversion) and choose bass
    const bestBass = getBestBassNote(prevNotesInfo, notesInfo);
    if(notesInfo.voiced) notesInfo.raw = notesInfo.voiced;
    const bassDisplay = (bestBass || root).replace(/\d+$/,"");

    // Symbol with inversion
    const symbol = `${getChordSymbolShorthand(root, chordType)}/${bassDisplay}`;

    // Function label
    const dict = (context.quality==="Major") ? diatonicChordsMajor : diatonicChordsMinor;
    const func = dict[numeral]?.func || "";

    // Assemble chord object used by UI + audio
    prog.push({
      numeral,
      func,
      type: chordType,
      bass: bassDisplay,
      symbol,
      notes: notesInfo.raw.replace(/ /g, "-"),
      context: { key: context.key, quality: context.quality }
    });

    // Pick next numeral
    let next = getRandomNumeral(numeral, context.quality);

    // Deceptive cadence on penultimate chord
    if(deceptive && i===length-2 && (numeral==="5" || numeral==="7")) next = "6";

    // Modulate around the midpoint
    if(enableMod && i === Math.floor(length/2)-1){
      const rel = relatedKeys(context.key, context.quality);
      const pick = getRandomElement(rel) || {key: context.key, quality: context.quality};
      context = { key: pick.key, quality: pick.quality };
      next = "1"; // tonicize new key
    }

    prevNotesInfo = notesInfo;
    numeral = next;
  }

  return prog;
}

// ------------------------------------------------------------
// Rendering
// ------------------------------------------------------------
function renderProgressions(examples, meta){
  const container = document.getElementById("progressionOutput");
  container.innerHTML = "";
  examples.forEach((prog, idx) => {
    const outer = document.createElement("div");
    outer.className = "suggestions-box";
    outer.innerHTML = `
      <div class="progression-title">
        <p>Example ${idx+1}:</p>
        <button class="play-specific-btn" onclick="playSpecificProgression(${idx})">▶️ Play</button>
      </div>
    `;
    const inner = document.createElement("div");
    inner.className = "progression-container";

    // First chord's context for labeling modulation differences (optional)
    const firstCtx = prog[0]?.context || meta;

    prog.forEach(ch => {
      const contextLabel = (ch.context.key!==firstCtx.key || ch.context.quality!==firstCtx.quality)
        ? `(${ch.context.key} ${ch.context.quality==="Major"?"Maj":"min"})` : "";

      const div = document.createElement("div");
      div.className = "chord-unit";
      div.innerHTML = `
        <span class="numeral">${ch.numeral}</span>
        <span class="context-label">${contextLabel}</span>
        <span class="function">${ch.func}</span>
        <span class="symbol">${ch.symbol}</span>
        <span class="notes">${ch.notes}</span>
      `;
      inner.appendChild(div);
    });

    outer.appendChild(inner);
    container.appendChild(outer);
  });
}

// ------------------------------------------------------------
// Full Chord Analysis & Possibilities (Per-Chord Context)
// ------------------------------------------------------------
function renderFullAnalysis(examples){
  if(!examples || !examples.length) return "<p>No analysis available.</p>";

  // Build groups in the order of the first example's numerals,
  // but include per-chord context so modulations show clearly.
  const first = examples[0];
  let html = `
    <div class="analysis-section">
      <h2>Full Chord Analysis & Possibilities</h2>
  `;

  first.forEach(ch => {
    const header = `${ch.context.key} ${ch.context.quality} — Numeral ${ch.numeral} (${getRootNote(ch.numeral, ch.context.key, ch.context.quality)} ${ch.context.quality==="Major"?"Major":"Minor"}, Function: ${ch.func})`;

    html += `<h3>${header}</h3><ul>`;

    const options = getAllChordPossibilities(ch.numeral, ch.context.key, ch.context.quality);
    options.forEach(opt => {
      // opt.label = chord symbol (Am, G7, etc.), opt.notes = "A-C-E"
      html += `<li><strong>${opt.label}</strong>: ${opt.notes.replace(/ /g,"-")}</li>`;
    });

    html += `</ul>`;
  });

  html += `</div>`;
  return html;
}
