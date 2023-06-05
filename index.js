const audioContext = new AudioContext();
const canvas = byId("tap-area");
const fileInput = byId("fileInput");
const gainNodes = [];
const library = byId("library");
const normalGain = 0.15; 
const reader = new FileReader();

let activePress; let chords = []; let index; let midi; let notes; 
let on = false; let press; let ticks = []; let tuning;

function byId(id) {return document.getElementById(id);};

function setChord(i, gain) {
  const chord = chords[i];
  for (let note of chord) {
    gainNodes[note.midi].gain.setTargetAtTime(gain,
      audioContext.currentTime, 0.015);
  }  
}


function getChords(notes) {
  ticks = []; chords = [];
  for (let note of notes) {
    let index = ticks.indexOf(note.ticks);
    if (index > -1) {
      chords[index].push(note);
    } else {
      let i = 0;
      while ((i < ticks.length) && (ticks[i] < note.ticks)) {i++;}
      chords.splice(i, 0, [note]); // should insert chord in correct location
      ticks.splice(i, 0, note.ticks);
    }
  }
  return chords;
}

function key(e) {
  function down(e) {
    const strPress = "" + press;
    const badKeys = ["Alt","Arrow","Audio","Enter","Home","Launch","Meta",
        "Play","Tab"];
    if (on && !badKeys.some(badKey => strPress.includes(badKey)) && !e.repeat
      && (index < chords.length) && (press !== activePress)) {
        if (index > 0) {
          setChord(index-1, 0); // turn the old oscillators off
        }
        setChord(index, normalGain); // turn the new oscillators on
        activePress = press; index++;
    }
  }

  function up() {
    if (on && (press === activePress)) {
        setChord(index-1, 0); // turn the old oscillators off
        activePress = null;
    }
  }

  if (e.type.includes("key")) {press = e.key;} 
  else {press = e.pointerId;}
  if (["keydown","pointerdown"].includes(e.type)) {down(e);} else {up();}
}

function resetVars() {
    activePress = null; index = 0; 
    for (let gainNode of gainNodes) {gainNode.gain.value = 0;}
}

function start() { 
    window.setTimeout(() => {
        if (!on) {
          tuning = {pitch: 9, octave: 4, text: "a4", frequency: 440}; 

          const tuningMidiNumber = tuning.pitch + 12 * (tuning.octave + 1);
      
          for (let i = 0; i < 128; i++) {
            const freq = tuning.frequency * 2**((i - tuningMidiNumber) / 12);
          
            const oscillator = new OscillatorNode(audioContext, 
              {frequency: freq});
            const gainNode = new GainNode(audioContext, {gain: 0});
          
            oscillator.connect(gainNode).connect(audioContext.destination);
            oscillator.start();

            gainNodes.push(gainNode);
          }

          on = true;
        }
        resetVars();
        document.activeElement.blur();
    });
}

// Add music options
let optgroup = document.createElement("optgroup");
optgroup.label = "tobis-notenarchiv-midi";

// Retrieve text file
fetch("https://michaelcchu.github.io/easyplay20/dir.txt")
.then( response => response.text())
.then( data => {
  const lines = data.split("\n");
  for (let line of lines) {
    const option = document.createElement("option");
    option.text = line; optgroup.append(option);
  }

  library.add(optgroup);

  library.addEventListener("change", loadMusic);
  loadMusic();
})
.catch( e => {console.log( e );} );

function loadMusic() {
  const option = library.options[library.selectedIndex];
  fetch("https://michaelcchu.github.io/easyplay20/midi/" + option.text)
  .then( response => response.arrayBuffer())
  .then( data => {setup(data);})
  .catch( e => {console.log( e );} );

  document.activeElement.blur();
}

fileInput.addEventListener("change", () => {
    const file = fileInput.files[0]; 
    if (file) {reader.readAsArrayBuffer(file);}
    document.activeElement.blur();
});

function setup(arrayBuffer) {
  midi = new Midi(arrayBuffer);
  notes = [];
  for (let track of midi.tracks) {
    for (let note of track.notes) {
      notes.push(note);
    }
  }
  chords = getChords(notes);
  resetVars();
}

reader.addEventListener("load", (e) => {setup(e.target.result);});

for (let et of ["down","up"]) {
  canvas.addEventListener("pointer"+et, key, {passive: false});
  document.addEventListener("key"+et, key, {passive: false});
}

byId("start").addEventListener("click", start);

function resize() {
  document.getElementsByClassName("wrapper")[0].style.height = 
    (window.innerHeight - 17)  + "px";
}

resize();
window.addEventListener('resize', resize);

// Turn off default event listeners
const ets = ['focus', 'pointerover', 'pointerenter', 'pointerdown', 
  'touchstart', 'gotpointercapture', 'pointermove', 'touchmove', 'pointerup', 
  'lostpointercapture', 'pointerout', 'pointerleave', 'touchend'];
for (let et of ets) {
  canvas.addEventListener(et, function(event) {
    event.preventDefault();
    event.stopPropagation();
  }, {passive: false}); 
}