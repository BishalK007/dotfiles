if [[ "$@" == *"--debug"* ]]; then
    watchexec -w $(realpath /home/bishal/.config/ags) --exts js,ts,jsx,tsx,css,scss --restart -- sh -c 'pkill -HUP ags || GTK_DEBUG=interactive ags run --gtk 4 -d $(realpath /home/bishal/.config/ags)'
else
    watchexec -w $(realpath /home/bishal/.config/ags) --exts js,ts,jsx,tsx,css,scss --restart -- sh -c 'pkill -HUP ags || ags run --gtk 4 -d $(realpath /home/bishal/.config/ags)'
fi
