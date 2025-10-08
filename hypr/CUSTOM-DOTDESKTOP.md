# Says what the custom-dotdesktop folder is supposed to do
- we basically made a script: `toggle-special-window-app.sh`
- It launches specified special window app like: ytmusic, whatsapp, gemini 
- we also wanna make sure there exists .desktop so we can launch the same using something like: fuzzel
- SO the `custom-dotdesktop` containes all the .desktop files that call this `toggle-special-window-app.sh` to launch the app window
- run the `copy.sh` file it will copy the .desktop files to the `~/.local/share/applications` dir so that stuff like fuzzel can find them