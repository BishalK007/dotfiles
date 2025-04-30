{
  description = "Dev shell for AGS + AstalHyprland development";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-24.11";
    flake-utils.url = "github:numtide/flake-utils";
    ags_flake.url = "github:Aylur/ags";
    astal = {
      url = "github:aylur/astal";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = { self, nixpkgs, flake-utils, ags_flake, astal }: let
    systems = flake-utils.lib.defaultSystems;
  in flake-utils.lib.eachSystem systems (system: let
    pkgs = import nixpkgs { inherit system; };
    ags_github_package = ags_flake.packages.${system}.default;
  in {
    devShells.default = pkgs.mkShell {
      buildInputs = with pkgs; [
        ags_github_package
        # Astal libraries
        astal.packages.${system}.astal4
        astal.packages.${system}.io
        astal.packages.${system}.hyprland
        astal.packages.${system}.tray 
        astal.packages.${system}.wireplumber 
        astal.packages.${system}.battery 
        astal.packages.${system}.powerprofiles 
        # Development dependencies
        vala
        pkg-config
        meson
        ninja
        gobject-introspection
        glib
        gtk4
        gtk4-layer-shell
        json-glib
        # Other tools
        git
        gcc
        python3
        gjs
        watchexec
      ];
      shellHook = ''
        echo "Welcome to the AGS + AstalHyprland + AstalTray dev shell!"
      '';
    };
  });
}