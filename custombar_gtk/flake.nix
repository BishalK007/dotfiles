{
  description = "A flake for GTK4 Rust development";

  inputs = {
    # Needed for converting the flake into a legacy shell.nix
    flake-compat.url = "github:edolstra/flake-compat/refs/pull/65/head";

    # Use the unstable channel (or adjust as needed)
    nixpkgs.url = "github:nixos/nixpkgs/nixpkgs-unstable";

    # Overlay to provide the rust-bin toolchain (or you can use rustup via home-manager, etc.)
    rust-overlay = {
      url = "github:oxalica/rust-overlay";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = { self, nixpkgs, rust-overlay, flake-compat }:
    let
      # Combine overlays: the rust overlay plus any additional overlays you might add.
      overlays = [
        (import rust-overlay)
        # You could add custom overlays here if needed.
      ];

      # Function to get a package set for a given system.
      pkgsFor = system: import nixpkgs { inherit system overlays; };

      # Define the target systems for which you want to build the package/shell.
      targetSystems = [ "x86_64-linux" "aarch64-linux" ];

      # Create a Rust toolchain from the rust-toolchain.toml file in your repo.
      mkRustToolchain = pkgs: pkgs.rust-bin.fromRustupToolchainFile ./rust-toolchain.toml;
    in {
      # Define packages (for example, a GTK demo binary)
      packages = nixpkgs.lib.genAttrs targetSystems (system:
        let
          pkgs         = pkgsFor system;
          rust         = mkRustToolchain pkgs;
          rustPlatform = pkgs.makeRustPlatform { cargo = rust; rustc = rust; };
          # If you have a Cargo.toml, you can extract the version; otherwise default to "0.1.0"
          version = if builtins.pathExists "./Cargo.toml"
                    then (builtins.fromTOML (builtins.readFile ./Cargo.toml)).package.version
                    else "0.1.0";
        in {
          gtk_demo = rustPlatform.buildRustPackage {
            pname            = "gtk-demo";
            version          = version;
            src              = ./.;
            cargoLock        = { lockFile = ./Cargo.lock; };
            # Adjust the binary name if necessary
            cargoBuildFlags  = [ "--bin" "gtk-demo" ];

            nativeBuildInputs = with pkgs; [ 
              pkg-config 
              wrapGAppsHook 
              gobject-introspection
              meson
              ninja
              autoconf
              automake
              libtool
              autoconf-archive
            ];
            # Use gtk4 as your system dependency for GTK4 development.
            buildInputs       = with pkgs; [ gtk4 ];
          };
        }
      );

      # Define a development shell for interactive development.
      devShells = nixpkgs.lib.genAttrs targetSystems (system:
        let
          pkgs = pkgsFor system;
          rust = mkRustToolchain pkgs;
        in {
          default = pkgs.mkShell {
            buildInputs = [
              rust
              pkgs.pkg-config
              pkgs.gtk3
              pkgs.gtk4
              pkgs.gtk4-layer-shell
              pkgs.gdk-pixbuf
              pkgs.glib
              pkgs.cairo
              pkgs.pango
              pkgs.atk
              pkgs.glade
            ];
            RUST_SRC_PATH = "${rust}/lib/rustlib/src/rust/library";
            PKG_CONFIG_PATH = "${pkgs.gtk3.dev}/lib/pkgconfig:${pkgs.gtk4.dev}/lib/pkgconfig:$PKG_CONFIG_PATH";
          };
        }
      );
    };
}
