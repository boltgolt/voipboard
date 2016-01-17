var electron = require("electron")
var fs = require("fs")
var pulseServer = require("./pulse.js")
var webServer = require("./webserver.js")
var soundData = require("./sounds/data.js")

var ipc
var app = electron.app
var BrowserWindow = electron.BrowserWindow
var mainWindow = null
var printWaiting = false

// Print complete codes:
//
// 0: INFO
// 1: OKAY
// 2: FAIL
// 3: WARN

getPrintCode = function (pre) {
	switch (pre) {
		case 1:
			return "\033[32mOKAY"
			break;
		case 2:
			return "\033[1;31mFAIL"
			break;
		case 3:
			return "\033[38;5;202mWARN"
			break;
		default:
			return "\033[37mINFO"
	}
}

global.printStatus = function (pre) {
	if (!printWaiting) {
		return
	}

	process.stdout.write("\r" + printWaiting[0] + getPrintCode(pre) + "\033[0m" + printWaiting[1])

	printWaiting = false
}

global.print = function (pre, text, wait) {
	if (printWaiting) {
		printStatus(1)
	}

	var d = new Date()
	var h = 0
	var m = 0
	var s = 0
	var ms = 0

	if (d.getHours() < 10) { h = "0" + d.getHours() }
	else { h = d.getHours() }

	if (d.getMinutes() < 10) { m = "0" + d.getMinutes() }
	else { m = d.getMinutes() }

	if (d.getSeconds() < 10) { s = "0" + d.getSeconds() }
	else { s = d.getSeconds() }

	process.stdout.write("[" + h + ":" + m + ":" + s + "] [")

	if (wait) {
		process.stdout.write("\033[37m....\033[0m")

		printWaiting = ["[" + h + ":" + m + ":" + s + "] [", "] " + text + "\n"]
	}
	else {
		if (pre) {
			process.stdout.write(getPrintCode(pre) + "\033[0m")
		}
		else {
			process.stdout.write("\033[37mINFO\033[0m")
		}
	}

	process.stdout.write("] " + text)

	if (!wait) {
		process.stdout.write("\n")
	}
}

global.crit = function(error) {
	ipc.send("crit", error)
}

global.getSoundById = function(id) {
	for (var i = 0; i < soundData.length; i++) {
		if (soundData[i].id == id) {
			return soundData[i]
		}
	}

	return false
}


app.on("ready", function() {
	ipc = require("electron-safe-ipc/host")
	var foundApps = []

	print(null, "Loading configuration", true)

	try {
		global.config = JSON.parse(fs.readFileSync("config.json", "utf8"))
	}
	catch (err) {
		console.log(err);
		printStatus(2)
		crit("Could not read configuration")
	}

	printStatus(1)

	window = new BrowserWindow({width: 800, height: 600, icon: __dirname + "/icon.png", title: "Voipboard", kiosk: true, resizable: false})
	window.loadURL("file://" + __dirname + "/gui/index.html");
	// window.openDevTools(true)

	pulseServer.startServer(function() {
		pulseServer.getRecording(function(apps) {
			foundApps = apps
			ipc.send("listRecording", apps)
		})
	})

	ipc.on("pickedRecorder", function(id) {
		pulseServer.bindRecording(id, function() {
			webServer.startServer(function(webEvents) {

				webEvents.on("playSound", function(id) {
					var sound = getSoundById(id)
					print(0, 'PLaying sound "' + sound.name + '"')
					pulseServer.playSound(__dirname + "/sounds/wav/" + id + ".wav")
				})

				webEvents.on("connectionCange", function(nr) {
					ipc.send("connectionCange", nr)
				})
			})

			for (var i = 0; i < foundApps.length; i++) {
				if (foundApps[i].id == id) {
					ipc.send("showMainInterface", foundApps[i])
				}
			}

			pulseServer.playSound(__dirname + "/sounds/active.wav")
		})
	})

	window.on("closed", function() {
		pulseServer.cleanUp()
	})
})

process.stdin.resume()
process.on("exit", pulseServer.cleanUp)
process.on("SIGINT", pulseServer.cleanUp)
process.on("uncaughtException", pulseServer.cleanUp)
