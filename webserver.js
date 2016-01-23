var http = require("http")
var io = require("socket.io")
var fs = require("fs")
var EventEmitter = require("events")
var spawn = require("child_process").spawn
var soundData = require("./sounds/data.js")

var webserverEvents = new EventEmitter()
var clientCount = 0

module.exports = {
	startServer: function(callback) {
		print(null, "Starting webserver", true)

		var server = http.createServer(function(req, res){
			try {
				if (req.url == "/") {
					var html = fs.readFileSync("board/landing.html", "utf8")
					html = html.replace("/*JSON_SOUND_DATA*/", JSON.stringify(soundData))
					html = html.replace("/*NEED_AUTH*/", (config.web.password == false) ? "none" : "block")
					html = html.replace("<!--NEED_AUTH_TEXT-->", config.web.text.needAuth)
					html = html.replace("<!--PICK_TEXT-->", config.web.text.pickSound)

					res.write(html)
				}
				else if (req.url == "/style.css") {
					res.write(fs.readFileSync("board/style.css", "utf8"))
				}
				else if (req.url == "/script.js") {
					res.write(fs.readFileSync("board/script.js", "utf8"))
				}
				else if (req.url == "/data.json") {
					res.write(fs.readFileSync("sounds/data.js", "utf8").replace("module.exports = ", ""))
				}

				else if (req.url.substring(0, 5) == "/img/") {
					var id = req.url.split("/")[req.url.split("/").length - 1]

					if (getSoundById(id) || id == "noimage") {
						res.write(fs.readFileSync("sounds/img/" + id + ".png"))
					}
				}
			}
			catch (e) {
				console.log(e);
				res.writeHead(500)
				print(2, "HTTP server error for " + req.url)
			}

			res.end()
		}).listen(config.web.port)

		var socket = io.listen(server);

		socket.on("connection", function(client) {
			var user = {
				"pid": 0,
				"cooldown": false,
				"auth": false,
				"id": client.id
			}

			clientCount++
			webserverEvents.emit("connectionCange", clientCount)

			if (config.web.password == false) {
				user.auth = true
			}

			client.on("play", function(data) {
				console.log(data);
				if (user.cooldown || !user.auth) {
					return
				}
				console.log(data);
				var sound = getSoundById(data)

				if (!sound) {
					return
				}
				console.log(data);
				user.cooldown = true

				setTimeout(function () {
					user.cooldown = false
					client.emit("released")
				}, (sound.duration + .5) * 1000);

				webserverEvents.emit("playSound", {"soundId": data, "userId": user.id})
			})

			client.on("kill", function() {
				if (user.pid == 0 || !user.auth) {
					return
				}

				// No idea why, but fixes bug
				spawn("kill", [user.pid + 1])
				user.cooldown = false
				user.pid = 0
				client.emit("released")
			})

			client.on("tryPassword", function(data) {
				if (user.auth) {
					client.emit("authDone")
				}
				else if (data === config.web.password) {
					client.emit("authDone")
					user.auth = true
				}
			})

			client.on("disconnect", function() {
				clientCount--
				webserverEvents.emit("connectionCange", clientCount)

				if (user.pid != 0) {
					spawn("kill", [user.pid + 1])
					user.pid = 0
				}
			})

			webserverEvents.on("passEcec-" + user.id, function(pid) {
				user.pid = pid
			})
		})

		printStatus(1)

		callback(webserverEvents)
	}
}
