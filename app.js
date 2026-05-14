const locations = [
  {
    name: "Baseball Field",
    bounds: {
      north: 34.24398,
      south: 34.24273,
      east:  -118.52569,
      west:  -118.52745
    }
  },
  {
    name: "Jacaranda Hall",
    bounds: {
      north: 34.24215,
      south: 34.24094,
      east:  -118.52776,
      west:  -118.52938
    }
  },
  {
    name: "University Library",
    bounds: {
      north: 34.24051,
      south: 34.23968,
      east:  -118.52859,
      west:  -118.52998
    }
  },
  {
    name: "G6 Parking Structure",
    bounds: {
      north: 34.24225,
      south: 34.24108,
      east:  -118.52330,
      west:  -118.52448
    }
  },
  {
    name: "Student Recreation Center",
    bounds: {
      north: 34.24051,
      south: 34.23915,
      east:  -118.52445,
      west:  -118.52559
    }
  }
];

let map;
let currentIndex  = 0;
let correctCount  = 0;
let wrongCount    = 0;
let drawnShapes   = [];
let timerInterval = null;
let elapsedSecs   = 0;
let gameActive    = false;

function initMap() {
  const csunCenter = { lat: 34.2420, lng: -118.5270 };

  map = new google.maps.Map(document.getElementById("map"), {
    center:   csunCenter,
    zoom:     17,
    minZoom:  16,
    maxZoom:  19,
    draggable:              true,
    scrollwheel:            false,
    disableDoubleClickZoom: true,
    disableDefaultUI:       true,
    keyboardShortcuts:      false,

    styles: [
      { elementType: "geometry",           stylers: [{ color: "#141414" }] },
      { elementType: "labels",             stylers: [{ visibility: "off" }] },
      { featureType: "road",
        elementType: "geometry",           stylers: [{ color: "#2a2a2a" }] },
      { featureType: "road",
        elementType: "geometry.stroke",    stylers: [{ color: "#141414" }] },
      { featureType: "water",
        elementType: "geometry",           stylers: [{ color: "#0a0a0a" }] },
      { featureType: "poi.school",
        elementType: "geometry",           stylers: [{ color: "#1e1e1e" }] },
      { featureType: "poi",
        elementType: "labels.icon",        stylers: [{ visibility: "off" }] },
      { featureType: "transit",
        elementType: "labels",             stylers: [{ visibility: "off" }] },
      { featureType: "administrative",
        elementType: "labels",             stylers: [{ visibility: "off" }] }
    ]
  });

  map.addListener("dblclick", function (event) {
    if (!gameActive) return;
    handleGuess(event.latLng);
  });

  startGame();
}

function startGame() {
  currentIndex = 0;
  correctCount = 0;
  wrongCount   = 0;
  elapsedSecs  = 0;
  gameActive   = true;

  drawnShapes.forEach(function(s) { s.setMap(null); });
  drawnShapes = [];

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

function tickTimer() {
  elapsedSecs++;
  $("#timer-display").text(formatTime(elapsedSecs));
}

function formatTime(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m + ":" + (s < 10 ? "0" : "") + s;
}

$(document).ready(function () {
  updateHighScoreDisplay();
  $(document).on("click", "#play-again-btn", function () {
    startGame();
  });
});
