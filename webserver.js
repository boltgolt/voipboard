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
					html = html.replace("/*NEED_AUTH*/", (config.web.password == false) ? "none" : "block")
					html = html.replace("<!--SEARCH_TEXT-->", config.web.text.search)
					html = html.replace("<!--NEED_AUTH_TEXT-->", config.web.text.needAuth)
					html = html.replace("<!--PICK_TEXT-->", config.web.text.pickSound)
					html = html.replace("<!--LOADING_TEXT-->", config.web.text.loading)

					res.write(html)
				}
				else if (req.url == "/style.css") {
					res.write(fs.readFileSync("board/style.css", "utf8"))
				}
				else if (req.url == "/script.js") {
					var js = fs.readFileSync("board/script.js", "utf8")
					js = js.replace("/*JSON_SOUND_DATA*/", JSON.stringify(soundData))
					js = js.replace("/*DISCONN_TEXT*/", config.web.text.disconnect)
					js = js.replace("/*BLOCK_TEXT*/", config.web.text.blocked)

					res.write(js)
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
				"timeout": false,
				"auth": false,
				"id": client.id,
				"spam": {
					"blocked": false,
					"second": 0,
					"requests": 0
				}
			}

			clientCount++
			webserverEvents.emit("connectionCange", clientCount)

			if (config.web.password == false) {
				user.auth = true
			}

			client.on("play", function(data) {
				if (user.cooldown || !user.auth || user.spam.blocked) {
					return
				}

				var sound = getSoundById(data)

				if (!sound) {
					return
				}

				user.cooldown = true

				user.timeout = setTimeout(function () {
					user.cooldown = false
					client.emit("released")
				}, (sound.duration + .5) * 1000);

				webserverEvents.emit("playSound", {"soundId": data, "userId": user.id})

				if (config.web.blockSpam != 0) {
					if (user.spam.second != Math.round(new Date().getTime() / 1000)) {
						user.spam.second = Math.round(new Date().getTime() / 1000)
					}
					else {
						user.spam.requests++

						if (user.spam.requests >= config.web.blockSpam) {
							user.spam.blocked = true
							client.emit("blocked")
						}
					}

				}
			})

			client.on("kill", function() {
				if (user.pid == 0 || !user.auth) {
					return
				}

				try {
					client.emit("released")
					// No idea why, but fixes bug
					spawn("kill", [user.pid + 1])
					user.cooldown = false
					user.pid = 0
					clearTimeout(user.timeout)
				} catch (e) {}
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
