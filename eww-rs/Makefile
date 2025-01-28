# For Doc and testing dont use inside widgets

.PHONY: tbo test-brightness-open tbc test-brightness-close taa test-audio-autotoggle tavd test-audio-voldown tavu test-audio-volup tao test-audio-open tac test-audio-close tvs test-video-start tvst test-video-stop tpj test-photo-jpeg tpp test-photo-png es eww-start est eww-stop

tvs test-video-start:
	@echo "capture:util:video-mkv:fullscreen:no-copy:no-edit" | socat - UNIX-CONNECT:/tmp/eww_main_socket.sock

tgs test-gif-start:
	@echo "capture:util:photo-gif:fullscreen:no-copy:no-edit" | socat - UNIX-CONNECT:/tmp/eww_main_socket.sock

tvst test-video-stop:
	@echo "capture:util:recstop" | socat - UNIX-CONNECT:/tmp/eww_main_socket.sock

tpj test-photo-jpeg:
	@echo "capture:util:photojpeg:fullscreen:no-copy:no-edit" | socat - UNIX-CONNECT:/tmp/eww_main_socket.sock

tpp test-photo-png:
	@echo "capture:util:photopng:fullscreen:no-copy:no-edit" | socat - UNIX-CONNECT:/tmp/eww_main_socket.sock

tao test-audio-open:
	@echo "audio:widget:open:0:0:300:1:1" | socat - UNIX-CONNECT:/tmp/eww_main_socket.sock

tac test-audio-close:
	@echo "audio:widget:close" | socat - UNIX-CONNECT:/tmp/eww_main_socket.sock

taa test-audio-autotoggle:
	@echo "audio:widget:auto-toggle:0:0:300:1:1:1000" | socat - UNIX-CONNECT:/tmp/eww_main_socket.sock

tavu test-audio-volup:
	@echo "audio:util:volup" | socat - UNIX-CONNECT:/tmp/eww_main_socket.sock
tavd test-audio-voldown:
	@echo "audio:util:voldown" | socat - UNIX-CONNECT:/tmp/eww_main_socket.sock

tbo test-brightness-open:
	@echo "brightness:widget:open:0:0:300:1:1" | socat - UNIX-CONNECT:/tmp/eww_main_socket.sock
tbc test-brightness-close:
	@echo "brightness:widget:close:0:0:300:1:1" | socat - UNIX-CONNECT:/tmp/eww_main_socket.sock

es eww-start:
	@echo "eww:start" | socat - UNIX-CONNECT:/tmp/eww_main_socket.sock

est eww-stop:
	@echo "eww:stop" | socat - UNIX-CONNECT:/tmp/eww_main_socket.sock
