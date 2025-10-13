{
  description = "Dev shell for AGS + AstalHyprland development";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-25.05";
    flake-utils.url = "github:numtide/flake-utils";
    ags_flake.url = "github:Aylur/ags";
    astal = {
      url = "github:aylur/astal";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
      ags_flake,
      astal,
    }:
    let
      systems = flake-utils.lib.defaultSystems;
    in
    flake-utils.lib.eachSystem systems (
      system:
      let
        pkgs = import nixpkgs { inherit system; };
        lib = pkgs.lib;
        ags_github_package = ags_flake.packages.${system}.default;
        # Astal packages that ship GSettings schemas and GI typelibs
        astalPkgs = [
          astal.packages.${system}.astal4
          astal.packages.${system}.io
          astal.packages.${system}.hyprland
          astal.packages.${system}.tray
          astal.packages.${system}.wireplumber
          astal.packages.${system}.battery
          astal.packages.${system}.powerprofiles
          astal.packages.${system}.bluetooth
          astal.packages.${system}.network
          astal.packages.${system}.notifd
        ];
        # Build schema path to the actual compiled directories in each package
        # Currently only astal-notifd ships a gsettings schema; include both potential store paths
        gschemasPath = lib.concatStringsSep ":" [
          "${astal.packages.${system}.notifd}/share/gsettings-schemas/astal-notifd-0.1.0/glib-2.0/schemas"
        ];
        giTypelibPath = lib.makeSearchPath "lib/girepository-1.0" astalPkgs;
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs =
            with pkgs;
            [
              ags_github_package
              # Astal libraries
            ]
            ++ astalPkgs
            ++ [
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
          # Export env so Gio/GI can find schemas and typelibs
          GSETTINGS_SCHEMA_DIR = gschemasPath;
          GI_TYPELIB_PATH = giTypelibPath;
          shellHook = ''
            echo "Welcome to the AGS + AstalHyprland + AstalTray dev shell!"
          '';
        };
      }
    );
}
