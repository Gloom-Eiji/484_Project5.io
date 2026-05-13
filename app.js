/* 1. LOCATION DATA  — verified against labeled Google Maps screenshot */
const locations = [
  {
    /* INSTRUCTOR-ASSIGNED: Baseball Field (F7)
       Label "Matador Baseball Field" visible near Harbold St, east campus.
       Circled by student in Image 2. Pin drops ~34.2453, -118.5262.
       Field spans south of Harbold, west of Zelzah. */
    name: "Baseball Field",
    bounds: {
      north: 34.2462,
      south: 34.2442,
      east:  -118.5248,
      west:  -118.5278
    }
  },
  {
    /* STUDENT PICK #1: Art and Design Center (D6)
       Label "Mike Curb College Of Arts, Media And..." + "Art Galleries"
       visible in upper-left of screenshot near Plummer St / Lot D6.
       Confirmed by student circling this area in previous screenshots. */
    name: "Art and Design Center",
    bounds: {
      north: 34.2438,
      south: 34.2424,
      east:  -118.5305,
      west:  -118.5330
    }
  },
  {
    /* STUDENT PICK #2: Oviatt Library (D4)
       Label "CSUN University Library" clearly visible center-left
       of campus in Image 2, west of Lindley Ave near Cleary Walk. */
    name: "Oviatt Library",
    bounds: {
      north: 34.2410,
      south: 34.2396,
      east:  -118.5305,
      west:  -118.5330
    }
  },
  {
    /* STUDENT PICK #3: Student Recreation Center (G4)
       Label "Student Recreation Center" visible bottom-right of Image 2,
       east of Lindley Ave near Vincennes St / Matador Dr intersection. */
    name: "Student Recreation Center",
    bounds: {
      north: 34.2405,
      south: 34.2391,
      east:  -118.5238,
      west:  -118.5263
    }
  },
  {
    /* STUDENT PICK #4: University Student Union (F4)
       Label "University Student Union" visible bottom-center of Image 2,
       just west of Lindley Ave near Vincennes St. */
    name: "University Student Union",
    bounds: {
      north: 34.2407,
      south: 34.2393,
      east:  -118.5272,
      west:  -118.5297
    }
  }
];

/*2. GAME STATE */
let map;
let currentIndex  = 0;
let correctCount  = 0;
let wrongCount    = 0;
let drawnShapes   = [];
let timerInterval = null;
let elapsedSecs   = 0;
let gameActive    = false;

/* 3. MAP INITIALISATION — callback from Google Maps script*/
function initMap() {
  /* Center on CSUN campus core */
  const csunCenter = { lat: 34.2420, lng: -118.5285 };

  map = new google.maps.Map(document.getElementById("map"), {
    center:   csunCenter,
    zoom:     17,
    minZoom:  16,   // don't let user zoom out too far
    maxZoom:  19,   // allow zooming in for precision

    /* Pan is NOW ALLOWED so user can explore campus */
    draggable:            true,
    scrollwheel:          false,  // no scroll-zoom (keeps it fair)
    disableDoubleClickZoom: true, // dblclick = guess, not zoom
    disableDefaultUI:     true,   // hide Google's UI chrome
    keyboardShortcuts:    false,

    styles: [
      { elementType: "geometry",           stylers: [{ color: "#141414" }] },
      { elementType: "labels.text.fill",   stylers: [{ color: "#aaaaaa" }] },
      { elementType: "labels.text.stroke", stylers: [{ color: "#141414" }] },
      { featureType: "road",
        elementType: "geometry",           stylers: [{ color: "#2a2a2a" }] },
      { featureType: "road",
        elementType: "geometry.stroke",    stylers: [{ color: "#141414" }] },
      { featureType: "road",
        elementType: "labels.text.fill",   stylers: [{ color: "#777777" }] },
      { featureType: "water",
        elementType: "geometry",           stylers: [{ color: "#0a0a0a" }] },
      { featureType: "poi.school",
        elementType: "geometry",           stylers: [{ color: "#1e1e1e" }] },
      { featureType: "poi",
        elementType: "labels.icon",        stylers: [{ visibility: "off" }] }
    ]
  });

  /* Double-click = user's guess */
  map.addListener("dblclick", function (event) {
    if (!gameActive) return;
    handleGuess(event.latLng);
  });

  startGame();
}

/*4. GAME FLOW*/

function startGame() {
  currentIndex = 0;
  correctCount = 0;
  wrongCount   = 0;
  elapsedSecs  = 0;
  gameActive   = true;

  /* Clear previous round shapes */
  drawnShapes.forEach(function(s) { s.setMap(null); });
  drawnShapes = [];

  /* Reset UI */
  $("#log-list").empty();
  $("#results-panel").addClass("hidden");
  $("#current-prompt").show();
  $("#timer-display").text("0:00");
  updateScoreDisplay();

  clearInterval(timerInterval);
  timerInterval = setInterval(tickTimer, 1000);

  showQuestion();
}

function showQuestion() {
  const loc  = locations[currentIndex];
  const qNum = currentIndex + 1;
  $("#question-number").text("Q" + qNum);
  $("#question-text").text("Where is " + loc.name + "?");
}

function handleGuess(clickedLatLng) {
  gameActive = false;

  const loc    = locations[currentIndex];
  const bounds = new google.maps.LatLngBounds(
    { lat: loc.bounds.south, lng: loc.bounds.west },
    { lat: loc.bounds.north, lng: loc.bounds.east }
  );

  const isCorrect = bounds.contains(clickedLatLng);

  drawRect(loc.bounds, isCorrect);
  showOverlayMsg(isCorrect);

  if (isCorrect) { correctCount++; } else { wrongCount++; }

  addLogEntry(loc.name, isCorrect);

  setTimeout(function () {
    hideOverlayMsg();
    currentIndex++;
    updateScoreDisplay();

    if (currentIndex < locations.length) {
      gameActive = true;
      showQuestion();
    } else {
      endGame();
    }
  }, 1800);
}

function endGame() {
  clearInterval(timerInterval);
  gameActive = false;
  $("#current-prompt").hide();

  const timeStr = formatTime(elapsedSecs);
  const hsKey   = "csunMapQuizHighScore";
  const prevHS  = localStorage.getItem(hsKey);
  let   newHS   = false;

  if (correctCount === locations.length) {
    if (prevHS === null || elapsedSecs < parseInt(prevHS)) {
      localStorage.setItem(hsKey, elapsedSecs);
      newHS = true;
    }
  }

  updateHighScoreDisplay();

  const headline = correctCount + " Correct, " + wrongCount + " Incorrect";
  let sub = "Finished in " + timeStr + ".";
  if (newHS)       sub += "  New best time!";
  else if (prevHS) sub += "  Best: " + formatTime(parseInt(prevHS));

  $("#results-headline").text(headline);
  $("#results-sub").text(sub);
  $("#results-panel").removeClass("hidden");
}

/*5. DRAWING*/

function drawRect(b, correct) {
  const rect = new google.maps.Rectangle({
    bounds: {
      north: b.north, south: b.south,
      east:  b.east,  west:  b.west
    },
    strokeColor:   correct ? "#16a34a" : "#ff0000",
    strokeOpacity: 0.95,
    strokeWeight:  2,
    fillColor:     correct ? "#22c55e" : "#cc0000",
    fillOpacity:   0.40,
    map:           map,
    zIndex:        1
  });

  addRectAnimation(rect);
  drawnShapes.push(rect);
}

function addRectAnimation(rect) {
  let tick = 0;
  const pulse = setInterval(function () {
    tick++;
    rect.setOptions({ fillOpacity: tick % 2 === 0 ? 0.40 : 0.70 });
    if (tick >= 6) clearInterval(pulse);
  }, 200);
}

/* 6. UI HELPERS */

function addLogEntry(name, isCorrect) {
  const $li = $("<li>")
    .addClass(isCorrect ? "correct-item" : "wrong-item")
    .append($("<span>").addClass("log-location").text(name))
    .append($("<span>").addClass("log-verdict").text(isCorrect ? "Correct!" : "Wrong location"));
  $("#log-list").append($li);
}

function showOverlayMsg(isCorrect) {
  const $msg = $("#map-overlay-msg");
  $msg.removeClass("hidden show-correct show-wrong");
  $msg.addClass(isCorrect ? "show-correct" : "show-wrong")
      .text(isCorrect ? "Correct!" : "Wrong Location");
}

function hideOverlayMsg() {
  $("#map-overlay-msg").addClass("hidden").removeClass("show-correct show-wrong");
}

function updateScoreDisplay() {
  $("#score-display").text(correctCount + " / " + currentIndex);
}

function updateHighScoreDisplay() {
  const hs = localStorage.getItem("csunMapQuizHighScore");
  $("#highscore-display").text(hs ? formatTime(parseInt(hs)) : "--");
}

/* =========================================================
   7. TIMER
   ========================================================= */

function tickTimer() {
  elapsedSecs++;
  $("#timer-display").text(formatTime(elapsedSecs));
}

function formatTime(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m + ":" + (s < 10 ? "0" : "") + s;
}

/* =========================================================
   8. DOCUMENT READY
   ========================================================= */
$(document).ready(function () {
  updateHighScoreDisplay();
  $(document).on("click", "#play-again-btn", function () {
    startGame();
  });
});
