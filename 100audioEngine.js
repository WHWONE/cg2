// === audioEngine_updated.js ===
// Handles audio playback, sampler initialization, and recording logic.

let sampler;
let recorder;
let isRecording = false;

// ------------------------------------------------------------
// Unlock Audio (user gesture required in browsers)
// ------------------------------------------------------------
async function unlockAudio() {
  try {
    await Tone.start(); // Resume AudioContext
    if (typeof initSampler === "function") {
      initSampler();
    }
    console.log("✅ Audio unlocked and sampler initialized.");
    const el = document.getElementById("audio-status");
    if (el) el.textContent = "Audio Unlocked. Ready!";
  } catch (e) {
    console.error("Audio unlock failed:", e);
  }
}
window.unlockAudio = unlockAudio;

// ------------------------------------------------------------
// Initialize Sampler (basic piano)
// ------------------------------------------------------------
function initSampler() {
  try {
    sampler = new Tone.Sampler({
      urls: {
        "C4": "C4.mp3",
        "D#4": "Ds4.mp3",
        "F#4": "Fs4.mp3",
        "A4": "A4.mp3"
      },
      baseUrl: "samples/piano/",
      onload: () => {
        console.log("🎹 Sampler ready.");
        const s = document.getElementById("audioStatus");
        if (s) s.textContent = "Samples Loaded. Ready.";
      }
    }).toDestination();
  } catch (e) {
    console.error("Sampler init failed:", e);
  }
}
window.initSampler = initSampler;

// ------------------------------------------------------------
// Playback - Play a specific generated progression
// ------------------------------------------------------------
function playSpecificProgression(index) {
  console.log("🎵 playSpecificProgression called:", index);

  if (!sampler) {
    console.warn("Sampler not initialized.");
    return;
  }

  const progression = window.allGeneratedProgressions[index];
  if (!progression || progression.length === 0) {
    console.warn("⚠️ No progression data to play.");
    return;
  }

  const chordDuration = 1.5; // seconds per chord (adjust to your tempo)
  const totalDuration = chordDuration * progression.length;

  // Start playback
  let time = Tone.now();
  progression.forEach(ch => {
    const notes = ch.notes.split("-").map(n => n.trim());
    notes.forEach(n => sampler.triggerAttackRelease(n, "4n", time));
    time += chordDuration;
  });

  // Auto-stop recording after last chord if currently recording
  if (typeof recorder !== "undefined" && isRecording) {
    console.log("🕓 Scheduling auto-stop after", totalDuration, "seconds");
    Tone.Transport.scheduleOnce(async () => {
      console.log("🛑 Auto-stopping recorder (playback done).");
      await stopRecording(true);
    }, `+${totalDuration}`);
  }

  // Start transport if not running
  Tone.Transport.start();
}
window.playSpecificProgression = playSpecificProgression;

// ------------------------------------------------------------
// Recording Logic
// ------------------------------------------------------------
async function startRecording() {
  try {
    await Tone.start();
    if (!recorder) {
      recorder = new Tone.Recorder();
      Tone.Destination.connect(recorder);
    }

    recorder.start();
    isRecording = true;
    const rs = document.getElementById("recordStatus");
    if (rs) rs.textContent = "🎙️ Recording...";
    const startBtn = document.getElementById("recordButton");
    const stopBtn = document.getElementById("stopButton");
    if (startBtn) startBtn.disabled = true;
    if (stopBtn) stopBtn.disabled = false;

    console.log("🎙️ Recording started.");
  } catch (e) {
    console.error("Recording start failed:", e);
  }
}
window.startRecording = startRecording;

async function stopRecording(auto = false) {
  try {
    if (!recorder || !isRecording) {
      console.warn("⚠️ Recorder not active.");
      return;
    }

    const rs = document.getElementById("recordStatus");
    if (rs) rs.textContent = "⏳ Finalizing...";

    const recordingBlob = await recorder.stop();
    isRecording = false;

    const url = URL.createObjectURL(recordingBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = auto ? "auto_recording.wav" : "progression_recording.wav";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    if (rs) rs.textContent = auto
      ? "✅ Recording finished automatically."
      : "✅ Recording finished. Download ready!";

    const startBtn = document.getElementById("recordButton");
    const stopBtn = document.getElementById("stopButton");
    if (startBtn) startBtn.disabled = false;
    if (stopBtn) stopBtn.disabled = true;

    console.log("✅ Recording stopped and file downloaded.");
  } catch (e) {
    console.error("Recording stop failed:", e);
    const rs = document.getElementById("recordStatus");
    if (rs) rs.textContent = "⚠️ Recording failed.";
  }
}
window.stopRecording = stopRecording;

function downloadRecording() {
  alert("The recording downloads automatically when you stop.");
}
window.downloadRecording = downloadRecording;
