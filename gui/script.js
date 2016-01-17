var electron = require("electron")
var ipc = require("electron-safe-ipc/guest")

var icons = ["skype"]

ipc.on("listRecording", function(apps) {
	for (var i = 0; i < apps.length; i++) {
		var ul = document.getElementById("pickList")
		var li = document.createElement("li")
		li.id = apps[i].id

		var html = "<img src='icons/" + (icons.indexOf(apps[i].binary) != -1 ? apps[i].binary : "unknown") + ".png'>"
			+ "<span>" + apps[i].name + "</span>"
			+ "<small>" + apps[i].binary + "</small>"
		li.innerHTML = html

		var li = ul.appendChild(li)

		li.addEventListener("click", function(event) {
			ipc.send("pickedRecorder", event.target.id)
		})
	}
})

ipc.on("showMainInterface", function(app) {
	document.getElementById("originalImage").src = "icons/" + (icons.indexOf(app.binary) != -1 ? app.binary : "unknown") + ".png"
	document.getElementById("appTitle").innerHTML = app.name

	document.getElementById("appPick").style.opacity = 0

	setTimeout(function () {
		document.getElementById("appPick").style.display = "none"
		document.getElementById("main").style.display = "block"
	}, 400)

	setTimeout(function () {
		document.getElementById("main").style.opacity = 1
	}, 450)
})

ipc.on("connectionCange", function(nr) {
	document.getElementById("connectedCount").innerHTML = nr
	document.getElementById("connectedGrammar").innerHTML = nr == 1 ? "" : "s"
})
