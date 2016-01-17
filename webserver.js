var http = require("http")
var io = require("socket.io")
var fs = require("fs")
var EventEmitter = require("events")
var soundData = require("./sounds/data.js")

var webserverEvents = new EventEmitter()
var clientCount = 0

module.exports = {
	startServer: function(callback) {
		print(null, "Starting webserver", true)

		var server = http.createServer(function(req, res){
			try {
				if (req.url == "/") {
					var orgHTML = fs.readFileSync("board/landing.html", "utf8")
					var list = ""

					for (var i = 0; i < soundData.length; i++) {
						list += "<li id='" + soundData[i].id  + "'><img src='/img/" + soundData[i].id  + "'>"
							+ "<span>" + soundData[i].name + "</span>"
							+ "<small>" + soundData[i].source + "</small>"
							+ "<div>" + soundData[i].duration + " second" + (soundData[i].duration == 1 ? "" : "s") + "</div></li>"
					}

					res.write(orgHTML.replace("<!--SOUND_LISTING-->", list))
				}
				else if (req.url == "/style.css") {
					res.write(fs.readFileSync("board/style.css", "utf8"))
				}
				else if (req.url == "/script.js") {
					res.write(fs.readFileSync("board/script.js", "utf8"))
				}

				else if (req.url.substring(0, 5) == "/img/") {
					var id = req.url.split("/")[req.url.split("/").length - 1]

					if (getSoundById(id)) {
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
		}).listen(config.serverPort)

		var socket = io.listen(server);

		socket.on("connection", function(client) {
			clientCount++
			webserverEvents.emit("connectionCange", clientCount)

			client.on("play", function(data) {
				webserverEvents.emit("playSound", data)
			})

			client.on("disconnect", function() {
				clientCount--
				webserverEvents.emit("connectionCange", clientCount)
			})
		})

		printStatus(1)

		callback(webserverEvents)
	}
}
