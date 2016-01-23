var keys = [
	{
		"codes": [103, 36],
		"button": "7",
		"timeout": false
	},
	{
		"codes": [104, 38],
		"button": "8",
		"timeout": false
	},
	{
		"codes": [105, 33],
		"button": "9",
		"timeout": false
	},
	{
		"codes": [100, 37],
		"button": "4",
		"timeout": false
	},
	{
		"codes": [101, 12],
		"button": "5",
		"timeout": false
	},
	{
		"codes": [102, 39],
		"button": "6",
		"timeout": false
	},
	{
		"codes": [97, 35],
		"button": "1",
		"timeout": false
	},
	{
		"codes": [98, 40],
		"button": "2",
		"timeout": false
	},
	{
		"codes": [99, 34],
		"button": "3",
		"timeout": false
	},
	{
		"codes": [96, 45],
		"button": "0",
		"timeout": false
	}
]

var socket = io()
var picking = false
var playInterval

socket.on("connect", function() {
	console.log("conn");
})

socket.on("disconnect", function() {
	// do semething
})

socket.on("released", function() {
	if (playInterval) {
		clearInterval(playInterval)
		playInterval = false
	}

	updateProgress(0)
})

socket.on("authDone", function() {
	if (document.getElementById("passwordInput").value != "") {
		localStorage.password = document.getElementById("passwordInput").value
	}
	else {
		document.getElementById("auth").style.display = "none"
	}

	document.getElementById("auth").style.opacity = 0
	document.getElementById("auth").children[0].style.marginTop = "10vh"

	setTimeout(function () {
		document.getElementById("auth").style.display = "none"
	}, 500)
})

window.addEventListener("load", function() {
	document.getElementById("searchClear").addEventListener("click", updateSearch)
	document.getElementById("searchInput").addEventListener("keyup", updateSearch)
	document.getElementById("searchButton").addEventListener("click", updateSearch)
	updateSearch()

	document.getElementById("passwordInput").addEventListener("keyup", function() {
		socket.emit("tryPassword", document.getElementById("passwordInput").value)
	})

	if (localStorage.password) {
		socket.emit("tryPassword", localStorage.password)
	}

	for (var i = 0; i <= 9; i++) {
		if (localStorage["button" + i]) {
			document.getElementById("button" + i).dataset.sound = localStorage["button" + i]
			document.getElementById("button" + i).children[0].src = "/img/" + localStorage["button" + i]
		}

		document.getElementById("button" + i).addEventListener("click", function(event) {
			if (event.target.dataset.sound) {
				play(event.target.dataset.sound)
			}
		})
	}

	window.addEventListener("keydown", function(event) {
		function setPicking(i) {
			keys[i].timeout = setTimeout(function () {
				picking = keys[i].button
				document.getElementById("button" + keys[i].button).style.zIndex = 2
				document.getElementById("button" + keys[i].button).style.boxShadow = "0px 0px 50px 0px rgba(204, 204, 204, 0.2)"

				document.getElementById("picking").style.display = "block"

				setTimeout(function () {
					document.getElementById("picking").style.opacity = 1
				}, 10)

			}, 1000)
		}

		for (var i = 0; i < keys.length; i++) {
			for (var t = 0; t < keys[i].codes.length; t++) {
				if (keys[i].codes[t] == event.keyCode) {
					event.preventDefault()

					if (document.getElementById("button" + keys[i].button).className == "active") {
						return
					}

					document.getElementById("button" + keys[i].button).className = "active"

					if (!keys[i].timeout) {
						setPicking(i)
					}

					if (document.getElementById("button" + keys[i].button).dataset.sound) {
						play(document.getElementById("button" + keys[i].button).dataset.sound)
					}
				}
			}
		}
	})

	window.addEventListener("keyup", function(event) {
		for (var i = 0; i < keys.length; i++) {
			for (var t = 0; t < keys[i].codes.length; t++) {
				if (keys[i].codes[t] == event.keyCode) {
					document.getElementById("button" + keys[i].button).className = ""

					if (keys[i].timeout) {
						clearTimeout(keys[i].timeout)
					}
					keys[i].timeout = false
				}
			}
		}
	})
})

function updateSearch() {
	var query = document.getElementById("searchInput").value
	var ul = document.getElementById("soundUl")
	var found = []

	ul.innerHTML = ""

	if (query == "") {
		found = sounds
	}
	else {
		for (var i = 0; i < sounds.length; i++) {
			if (sounds[i].name.indexOf(query) > -1) {
				var newFound = JSON.parse(JSON.stringify(sounds[i]))
				newFound.name = newFound.name.split(query).join("<strong>" + query + "</strong>")
				found.push(newFound)
			}
		}
	}

	for (var i = 0; i < found.length; i++) {
		var li = document.createElement("li")

		li.addEventListener("click", function(event) {
			if (picking) {
				document.getElementById("button" + picking).dataset.sound = event.target.id
				document.getElementById("button" + picking).style.boxShadow = ""
				document.getElementById("button" + picking).children[0].src = "/img/" + event.target.id

				document.getElementById("picking").style.opacity = 0

				setTimeout(function () {
					document.getElementById("button" + picking).style.zIndex = "initial"
					document.getElementById("picking").style.display = "none"

					picking = false
				}, 300)

				localStorage["button" + picking] = event.target.id
			}
			else {
				play(event.target.id)
			}
		})
		li.id = found[i].id

		var html = "<img src='/img/" + found[i].id  + "'>"
			+ "<span>" + found[i].name + "</span>"
			+ "<small>" + found[i].source + "</small>"
			+ "<div>" + found[i].duration + " second" + (found[i].duration == 1 ? "" : "s") + "</div>"
		li.innerHTML = html

		ul.appendChild(li)
	}


}

function play(id) {
	socket.emit("play", id)

	var duration = 0
	var played = 0

	for (var i = 0; i < sounds.length; i++) {
		if (sounds[i].id == id) {
			duration = sounds[i].duration
		}
	}

	playInterval = setInterval(function () {
		played += 0.1

		if (played / duration * 100 >= 100) {
			clearInterval(playInterval)
			playInterval = false
			updateProgress(0)
			return
		}

		updateProgress(played / duration * 100)
	}, 100)
}

function updateProgress(proc) {
	var bars = document.getElementsByClassName("playProgress")

	for (var i = 0; i < bars.length; i++) {
		bars[i].style.width = proc + "%"
	}
}
