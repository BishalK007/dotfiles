pgrep eww | xargs kill {}

cargo watch -x run --workdir $HOME/.config/eww & 

sleep 2
echo "eww:start" | socat - UNIX-CONNECT:/tmp/eww_main_socket.sock
