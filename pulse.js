var http = require("http")
var io = require("socket.io")
var fs = require("fs")
var exec = require("child_process").exec

var defaultSink = "alsa_output.usb-Corsair_Raptor_HS40-00-HS40.iec958-stereo"
var defaultSource = "alsa_input.usb-Corsair_Raptor_HS40-00-HS40.analog-mono"

var activeModules = []
var clean = false
var aplaySetup = false

// Weird bug fix
var PlayBoard = "PlayBoard" + Math.random().toString(36).slice(-5)

module.exports = {
	startServer: function(callback) {
		print(null, "Checking pulseaudio status", true)

		exec("pactl stat", function (error, stdout, stderr) {
			if (error) {
				printStatus(2)
				print(null, "Please check if pulseaudio is running")
				process.exit(0)
			}

			printStatus(1)
			print(null, "Starting audio recording sink", true)

			exec("pactl load-module module-null-sink sink_name='GrabBoard' sink_properties=device.description='Sound_grab_Null_sink'", function (error, stdout, stderr) {
				if (error) {
					printStatus(2)
					process.exit(0)
				}

				activeModules.push(stdout.replace(/\D/g, ""))

				printStatus(1)
				print(null, "Starting board/mic playback output", true)

				exec("pactl load-module module-null-sink sink_name='" + PlayBoard + "' sink_properties=device.description='Playback_grab_Null_sink'", function (error, stdout, stderr) {
					if (error) {
						printStatus(2)
						process.exit(0)
					}

					activeModules.push(stdout.replace(/\D/g, ""))

					printStatus(1)
					print(null, "Opening stream between recording and playback sink", true)

					exec("pactl load-module module-loopback source='GrabBoard.monitor' sink='" + PlayBoard + "'", function (error, stdout, stderr) {
						if (error) {
							printStatus(2)
							process.exit(0)
						}

						activeModules.push(stdout.replace(/\D/g, ""))

						printStatus(1)
						print(null, "Streaming board audio to default sink", true)


						exec("pactl load-module module-loopback source='GrabBoard.monitor' sink='" + defaultSink + "'", function (error, stdout, stderr) {
							if (error) {
								printStatus(2)
								process.exit(0)
							}

							activeModules.push(stdout.replace(/\D/g, ""))

							printStatus(1)
							print(null, "Adding mic to playback stream", true)

							exec("pactl load-module module-loopback source='" + defaultSource + "' sink='" + PlayBoard + "'", function (error, stdout, stderr) {
								if (error) {
									printStatus(2)
									process.exit(0)
								}

								activeModules.push(stdout.replace(/\D/g, ""))

								printStatus(1)

								callback()
							})
						})
					})
				})
			})
		})
	},

	getRecording: function(callback) {
		var blacklist = ["pavucontrol"]
		var found = []

		print(null, "Searching for recording applications", true)

		exec("pactl list source-outputs", function (error, stdout, stderr) {
			if (error) {
				printStatus(2)
				process.exit(0)
			}

			var sinks = stdout.split("Output #")
			var sinkId = -1

			for (var i = 0; i < sinks.length; i++) {
				if (sinks[i].indexOf("application.process.binary") == -1) {
					continue
				}

				var name = sinks[i].split('application.name = "')[1].split('"')[0]
				var binary = sinks[i].split('application.process.binary = "')[1].split('"')[0]
				var id = sinks[i].split("\n")[0]

				if (blacklist.indexOf(binary) != -1) {
					continue
				}

				found.push({"name": name, "binary": binary, "id": id})
			}

			printStatus(1)
			callback(found)
		})
	},

	bindRecording: function(sinkId, callback) {
		print(null, "Searching for playback stream ID", true)

		exec("pactl list short sources", function (error, stdout, stderr) {
			if (error) {
				printStatus(2)
				process.exit(0)
			}

			var sources = stdout.split("\n")

			for (var i = 0; i < sources.length; i++) {
				if (sources[i].indexOf("" + PlayBoard + ".monitor") > -1) {
					var sourceId = sources[i].split("\t")[0]
				}
			}

			printStatus(1)
			print(null, "Linking playback stream and VoIP sink", true)

			exec("pactl move-source-output " + sinkId + " " + sourceId, function (error, stdout, stderr) {
				if (error) {
					printStatus(2)
					// process.exit(0)
				}

				printStatus(1)
				print(1, "Pulseaudio ready!")
				callback()
			});
		});
	},

	playSound: function(file, callback) {
		var aplay = exec("aplay " + file, function (error, stdout, stderr) {
			if (error) {
				if (error.signal != "SIGTERM") {
					// print(2, "Error playing sound")
					return
				}
			}
		})

		callback(aplay.pid)

		if (!aplaySetup) {
			aplaySetup = true
			print(0, "First time playing sound: need to setup aplay")

			print(null, "Getting aplay ID", true)

			setTimeout(function () {
				exec("pactl list sink-inputs", function (error, stdout, stderr) {
					if (error) {
						printStatus(2)
						process.exit(0)
					}

					var inputs = stdout.split("Sink Input #")
					var inputID = null

					for (var i = 0; i < inputs.length; i++) {
						if (inputs[i].indexOf("[aplay]") > -1) {
							inputID = inputs[i].split("\n")[0]
						}
					}

					if (inputID === null) {
						printStatus(2)
						return
					}

					printStatus(1)
					print(null, "Getting sink ID", true)

					exec("pactl list short sinks", function (error, stdout, stderr) {
						if (error) {
							printStatus(2)
							process.exit(0)
						}

						var sinks = stdout.split("\n")
						var sinkID = null

						for (var i = 0; i < sinks.length; i++) {
							if (sinks[i].indexOf("GrabBoard") > -1) {
								sinkID = sinks[i].split("\t")[0]
							}
						}

						if (inputID === null) {
							sinkID(2)
							return
						}

						printStatus(1)
						print(null, "Binding aplay to sink", true)

						exec("pactl move-sink-input " + inputID + " " + sinkID, function (error, stdout, stderr) {
							if (error) {
								printStatus(2)
								// process.exit(0)
							}

							printStatus(1)
						})
					})
				})
			}, 150)
		}
	},

	cleanUp: function() {
		if (clean) {
			return
		}

		clean = true

		if (activeModules.length == 0) {
			print(1, "Exiting, have a nice day!")
			return
		}

		print(null, "Cleaning up")

		for (var i = 0; i < activeModules.length; i++) {
			exec("pactl unload-module " + activeModules[i], function (error, stdout, stderr) {
				if (error) {
					print(2, "Could not unload a module")
				}

				activeModules.shift()

				if (activeModules.length == 0) {
					clean = true
					print(1, "Done, have a nice day!")
					process.exit(0)
				}
			})
		}
	}
}
