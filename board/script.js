var socket = io();


socket.on("connect", function(){
	console.log("conn");
});

socket.on("disconnect", function(){
	// do semething
});

socket.on("released", function(){
	document.getElementById("playing").style.display = "none"
});

window.addEventListener("load", function() {
	var buttons = document.getElementsByTagName("li")

	for (var i = 0; i < buttons.length; i++) {
		buttons[i].addEventListener("click", function(event) {
			socket.emit("play", event.target.id)
			document.getElementById("playing").style.display = "block"
		})
	}

	document.getElementById("kill").addEventListener("click", function() {
		socket.emit("kill")
	})
})
