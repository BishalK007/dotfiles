# Important! Read me before you do something.

**Things to keep in mind while setting up a new computer with this `configuration.nix`:**

1.  Always make a backup copy of the initial `configuration.nix` just in case.
2.  Clone the dotfiles and run `init.sh`, check for proper symlinks.
3.  Add the NixOS unstable channel and upgrade channels:

    ```bash
    nix-channel --add https://nixos.org/channels/nixos-unstable nixos-unstable
    sudo nix-channel --update
    ```

4.  In the default `configuration.nix`, add the flakes option:

    ```nix
    nix.settings.experimental-features = [ "nix-command" "flakes" ];
    ```

    Then do a `sudo nixos-rebuild switch`.

5.  Copy the `configuration.nix` from the dotfiles into the new one.
6.  If using any overlays, add them to the appropriate location in your `configuration.nix`.
7.  Make sure to change the `home.stateVersion` of Home Manager in your `configuration.nix` (or wherever it's defined) to the current NixOS version.
8.  Do a `sudo nixos-rebuild switch` and restart the machine.