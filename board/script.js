var socket = io();


socket.on("connect", function(){
	console.log("conn");
});

socket.on("disconnect", function(){
	// do semething
});

window.addEventListener("load", function() {
	var buttons = document.getElementsByTagName("li")

	for (var i = 0; i < buttons.length; i++) {
		buttons[i].addEventListener("click", function(event) {
			socket.emit("play", event.target.id)
		})
	}
})
