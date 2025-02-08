# { pkgs ? import <nixpkgs> {} }:

# pkgs.mkShell {
#   name = "gtk-dev-env";

#   # Tools for configuring and building GTK projects
#   nativeBuildInputs = [
#     pkgs.pkg-config
#     pkgs.gobject-introspection
#     pkgs.meson
#     pkgs.ninja
#     pkgs.autoconf
#     pkgs.automake
#     pkgs.libtool
#     pkgs.autoconf-archive
#   ];

#   # Libraries and dependencies for GTK development (both GTK3 and GTK4)
#   buildInputs = [
#     pkgs.gtk3
#     pkgs.gtk4
#     pkgs.gtk4-layer-shell
#     pkgs.glib
#     pkgs.cairo
#     pkgs.pango
#     pkgs.atk
#     pkgs.gdk-pixbuf
#   ];

#   # Environment tweaks: set PKG_CONFIG_PATH if needed
#   shellHook = ''
#     export PKG_CONFIG_PATH=${pkgs.gtk3.dev}/lib/pkgconfig:${pkgs.gtk4.dev}/lib/pkgconfig:$PKG_CONFIG_PATH
#     echo "GTK development environment is ready."
#   '';
# }

(import (
  let
    lock = builtins.fromJSON (builtins.readFile ./flake.lock);
  in
  fetchTarball {
    url =
      lock.nodes.flake-compat.locked.url
        or "https://github.com/edolstra/flake-compat/archive/${lock.nodes.flake-compat.locked.rev}.tar.gz";
    sha256 = lock.nodes.flake-compat.locked.narHash;
  }
) { src = ./.; }).shellNix
