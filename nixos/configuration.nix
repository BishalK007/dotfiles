# Edit this configuration file to define what should be installed on
# your system.  Help is available in the configuration.nix(5) man page
# and in the NixOS manual (accessible by running ‘nixos-help’).

{ config, pkgs, ... }:

let
  gdk = pkgs.google-cloud-sdk.withExtraComponents( with pkgs.google-cloud-sdk.components; [
    gke-gcloud-auth-plugin
  ]);
  unstable = import <nixos-unstable> { config = { allowUnfree = true; }; };

  eww_flake = builtins.getFlake "github:elkowar/eww";
  eww_github_package = eww_flake.packages.${builtins.currentSystem}.eww;

  home-manager = builtins.fetchTarball {
    url = "https://github.com/nix-community/home-manager/archive/release-24.11.tar.gz";
  };
  ghostty_flake = builtins.getFlake "github:ghostty-org/ghostty";
  ghostty_github_package = ghostty_flake.packages.${builtins.currentSystem}.default;

  ags_flake = builtins.getFlake "github:Aylur/ags";
  ags_github_package = ags_flake.packages.${builtins.currentSystem}.default;
in

{
  imports =
    [ # Include the results of the hardware scan.
      ./hardware-configuration.nix
      (import "${home-manager}/nixos")
    ];
  #___ OVERLAY IMPORTS ____#
  nixpkgs.overlays = [
    (import /etc/nixos/overlays/repototxt-overlay.nix)
  ];

  # Bootloader.
  boot.loader.systemd-boot.enable = true;
  boot.loader.efi.canTouchEfiVariables = true;

  networking.hostName = "nixos"; # Define your hostname.
  # networking.wireless.enable = true;  # Enables wireless support via wpa_supplicant.

  # Configure network proxy if necessary
  # networking.proxy.default = "http://user:password@proxy:port/";
  # networking.proxy.noProxy = "127.0.0.1,localhost,internal.domain";

  # Enable networking
  networking = {
    networkmanager.enable = true;
    networkmanager.dns = "default";  # Use "dnsmasq" or "systemd-resolved" if needed.
    nameservers = [ "8.8.8.8" "8.8.4.4" ];  # Google's DNS servers.
  };
  #networking.wireguard.enable = true;
	
  # Set your time zone.
  time.timeZone = "Asia/Kolkata";

  # Select internationalisation properties.
  i18n.defaultLocale = "en_IN";

  i18n.extraLocaleSettings = {
    LC_ADDRESS = "en_IN";
    LC_IDENTIFICATION = "en_IN";
    LC_MEASUREMENT = "en_IN";
    LC_MONETARY = "en_IN";
    LC_NAME = "en_IN";
    LC_NUMERIC = "en_IN";
    LC_PAPER = "en_IN";
    LC_TELEPHONE = "en_IN";
    LC_TIME = "en_IN";
  };

  # Enable the X11 windowing system.
  # You can disable this if you're only using the Wayland session.
  services.xserver.enable = true;
  # services.displayManager.autoLogin.enable = true;
  # services.displayManager.autoLogin.user = "bishal";

  # Enable the KDE Plasma Desktop Environment.
  # services.displayManager.sddm.enable = true;
  # services.desktopManager.plasma6.enable = true;



  # Configure keymap in X11
  services.xserver.xkb = {
    layout = "us";
    variant = "";
  };

  # Enable CUPS to print documents.
  services.printing.enable = true;

  
  # Enable sound with pipewire.
  hardware.pulseaudio.enable = false;
  security.rtkit.enable = true;
  services.pipewire = {
    enable = true;
    alsa.enable = true;
    alsa.support32Bit = true;
    pulse.enable = true;
    # If you want to use JACK applications, uncomment this
    #jack.enable = true;

    # use the example session manager (no others are packaged yet so this is enabled by default,
    # no need to redefine it in your config for now)
    #media-session.enable = true;
  };

  # Enable touchpad support (enabled default in most desktopManager).
  # services.xserver.libinput.enable = true;
  


  # Enable OpenGL
  hardware.graphics = {
    enable = true;
  };

  # Enable nvidia gpu
  hardware.nvidia = {
    modesetting.enable = true;   # Enables NVIDIA modesetting for Wayland.
    package = config.boot.kernelPackages.nvidiaPackages.stable;
  };
  # hardware.nvidia-container-toolkit.enable = true; #Enables container toolkit
  # hardware.opengl.setLdLibraryPath = true;  # Ensure OpenGL compatibility.

  # Define a user account. Don't forget to set a password with ‘passwd’.

  users.users.bishal = {
    isNormalUser = true;
    description = "Bishal Karmakar";
    extraGroups = [ "networkmanager" "wheel" "docker" "libvirtd" ]; # ____ Added docker group ______ #
    packages = with pkgs; [
      kdePackages.kate
    #  thunderbird
    ];
  };

  # Install firefox.
  programs.firefox.enable = true;

  # Turn on hyprland
  programs.hyprland = {
   enable = true;
  };
  environment.sessionVariables.NIXOS_OZONE_WL = "1";


  
  


  # Allow unfree packages
  nixpkgs.config.allowUnfree = true;

  #Allow unsafe packages
  nixpkgs.config.permittedInsecurePackages = [
        "qbittorrent-4.6.4"
  ];

  # List packages installed in system profile. To search, run:
  # $ nix search wget

  environment.systemPackages = with pkgs; [
  #  vim # Do not forget to add an editor to edit configuration.nix! The Nano editor is also installed by default.
    wget
    # neovim ## Later as enable 
    xclip
    google-chrome
    unstable.vscode
    gh
    git
    git-lfs
    unstable.bun
    yarn
    pnpm
    fzf
    gdk
    python3
    python312Packages.pip
    gcc
    gnumake42
    go
    # ffmpeg
    nodejs_22
    gnupg 
    pass
    docker-credential-helpers
    dig
    inetutils
    wl-clipboard
    qemu
    qemu_kvm
    virt-manager
    htop
    nix-prefetch-scripts
    repototxt
    jq
    kdePackages.konsole
    kitty
    waybar
    # nerdfonts -- used nix-env
    river
    dracula-icon-theme
    hyprpaper
    fuzzel 
    networkmanagerapplet
    blueman
    xfce.thunar
    btop
    themechanger
    hyprcursor
    grim
    wf-recorder
    hyprlock
    slurp
    playerctl 
    libsForQt5.qt5.qtwayland
    qbittorrent
    vlc
    slack
    rustup
    home-manager
    telegram-desktop
    audacity
    gimp-with-plugins
    eww_github_package
    socat
    bc
    unstable.code-cursor
    neofetch
    pinta
    ffmpeg-full
    obsidian
    (azure-cli.withExtensions [ azure-cli.extensions.aks-preview ]) # to install with extentions
    libreoffice-qt6-fresh
    cloudflare-warp
    alacritty
    fastfetch
    mongodb-compass
	cargo-watch
	brightnessctl
	unstable.awscli2
	wireshark
	obs-studio
    # gnome-keyring
    # glib
    # gsettings-desktop-schemas
    # libsecret
    # gnome-shell
];
  # Fonts __ 
  fonts.packages = with pkgs; [
    (nerdfonts.override { fonts = [ "FiraCode" "DroidSansMono" ]; })
    noto-fonts
    noto-fonts-cjk-sans
    noto-fonts-emoji
  ];

  # 1. Enable gnome-keyring
  services.gnome.gnome-keyring ={
    enable = true;
  };
  security.pam.services.login.enableGnomeKeyring = true;
  programs.seahorse.enable = true;

  # Some programs need SUID wrappers, can be configured further or are
  # started in user sessions.
  # programs.mtr.enable = true;
  # programs.gnupg.agent = {
  #   enable = true;
  #   enableSSHSupport = true;
  # };

  # List services that you want to enable:

  # Enable the OpenSSH daemon.
  # services.openssh.enable = true;

  # Open ports in the firewall.
  # networking.firewall.allowedTCPPorts = [ ... ];
  # networking.firewall.allowedUDPPorts = [ ... ];
  # Or disable the firewall altogether.
  # networking.firewall.enable = false;

  # This value determines the NixOS release from which the default
  # settings for stateful data, like file locations and database versions
  # on your system were taken. It‘s perfectly fine and recommended to leave
  # this value at the release version of the first install of this system.
  # Before changing this value read the documentation for this option
  # (e.g. man configuration.nix or on https://nixos.org/nixos/options.html).
  system.stateVersion = "24.05"; # Did you read the comment?


  ##_________MY CONFIGS ____________________##
   
  programs.bash.shellAliases = { # __ Aliases __ #
    vi = "nvim"; 
    vim = "nvim";
    svi = "sudo nvim";  # sudo versions of the alias
    svim = "sudo nvim";

    c = "sudo nvim /etc/nixos/configuration.nix";
    cc = "sudo EDITOR=\"code --wait\" sudoedit /etc/nixos/configuration.nix";
    rb = "sudo nixos-rebuild switch";
    rbu = "sudo nix-channel --update nixos && sudo nixos-rebuild switch";

    ## __________ Miscellaneous ________________##
    btop = "btop --utf-force";
  };
  
  # virtualisation.docker.enable = true; # __ Install Docker __ #
  virtualisation.docker = {
    enable = true;
    daemon.settings = {
      "features" = {
        "containerd-snapshotter" = true;
      };
    };
  };

  ## __________ NEOVIM _______________________ ##
  programs.neovim = {
  enable = true;
  configure = {
    customRC = ''
      set number
      set autoindent
      set tabstop=4
      set shiftwidth=4
      set smarttab
      set softtabstop=4
      set mouse=a
    '';
    packages.myVimPackage = with pkgs.vimPlugins; {
      start = [ ctrlp ];
    };
  };
};

  # __ FOR QEMU __ #
  virtualisation.libvirtd.enable = true;
  virtualisation.libvirtd.qemu.package = pkgs.qemu_kvm;

 
  # Enable Bluetooth
  hardware.bluetooth.enable = true; # enables support for Bluetooth
  hardware.bluetooth.powerOnBoot = true; # powers up the default Bluetooth controller on boot
  hardware.bluetooth.settings = {
	General = {
		Experimental = true;
	};
  };
  services.blueman.enable = true;

  
  home-manager.backupFileExtension = "backup";
  home-manager.users.bishal = { pkgs, ... }: {
    home.packages = [ 
      pkgs.atool 
      pkgs.httpie
	    pkgs.shared-mime-info
      # pkgs.gtk4
      # pkgs.gtk-layer-shell
    ];
    # home.sessionVariables = {
    #   GDK_BACKEND = "wayland";
    #   CLUTTER_BACKEND = "wayland";
    #   SDL_VIDEODRIVER = "wayland";
    #   MOZ_ENABLE_WAYLAND = "1";
    # };
    programs.bash = {
      enable = true;
        # Set GTK environment variables (optional but recommended)
        sessionVariables = {
          GTK_THEME = "Nordic:darker";
          GTK_PRIMARY_BUTTON_WARPS_SLIDER = "1";
        };
        initExtra = ''
          fastfetch
          # Function to parse and format the current Git branch
          parse_git_branch() {
              branch=$(git branch 2>/dev/null | sed -n '/^\*/s/^\* //p')
              if [ -n "$branch" ]; then
                  echo "[$branch] "
              fi
          }

          # Export the customized PS1 with proper colors and spacing
          export PS1="\[\e[38;5;135m\]\u@\h \[\e[38;5;183m\]\w \[\e[38;5;135m\]\$(parse_git_branch)\[\e[38;5;183m\]\$ "

          #For nix-global path
          export PATH="$HOME/.npm-global/bin:$PATH"
        '';
    };
    programs.zoxide = {
      enable = true;
      enableBashIntegration = true;
      options = [
        "--cmd cd"
      ];
    };
    gtk = {
      enable = true;
      theme = {
        package = pkgs.nordic;
        name = "Nordic-darker";
      };
    };


    # Set GTK environment variables (optional but recommended)
    # home.environment.variables = {
    #   GTK_THEME = "Adwaita";
    #   GTK_PRIMARY_BUTTON_WARPS_SLIDER = "1";
    # };

    # Create GTK 2.0 settings.ini
    # home.file.".config/gtk-2.0/settings.ini".text = ''
    #   [Settings]
    #   gtk-theme-name=Adwaita:dark
    #   gtk-application-prefer-dark-theme=true
    #   gtk-primary-button-warps-slider=true
    # '';

    # # Create GTK 3.0 settings.ini
    # home.file.".config/gtk-3.0/settings.ini".text = ''
    #   [Settings]
    #   gtk-theme-name=Adwaita:dark
    #   gtk-application-prefer-dark-theme=true
    #   gtk-icon-theme-name=Dracula
    #   gtk-cursor-theme-name=Adwaita
    #   gtk-cursor-theme-size=25
    #   gtk-font-name=Noto Sans, 10
    #   gtk-xft-antialias=1
    #   gtk-xft-hinting=1
    #   gtk-xft-hintstyle=hintslight
    #   gtk-xft-rgba=none
    #   gtk-xft-dpi=98304
    #   gtk-overlay-scrolling=true
    #   gtk-key-theme-name=Default
    #   gtk-menu-images=true
    #   gtk-button-images=true
    #   gtk-primary-button-warps-slider=true
    # '';

    # # Create GTK 4.0 settings.ini
    # home.file.".config/gtk-4.0/settings.ini".text = ''
    #   [Settings]
    #   gtk-theme-name=Adwaita:dark
    #   gtk-application-prefer-dark-theme=true
    #   gtk-icon-theme-name=Dracula
    #   gtk-cursor-theme-name=Adwaita
    #   gtk-cursor-theme-size=25
    #   gtk-font-name=Noto Sans, 10
    #   gtk-xft-antialias=1
    #   gtk-xft-hinting=1
    #   gtk-xft-hintstyle=hintslight
    #   gtk-xft-rgba=none
    #   gtk-xft-dpi=98304
    #   gtk-overlay-scrolling=true
    #   gtk-primary-button-warps-slider=true
    # '';

      # The state version is required and should stay at the version you
      # originally installed.
      home.stateVersion = "24.05";
    };
  
  
	
  # ENable flakes
  nix.settings.experimental-features = [ "nix-command" "flakes" ];

  # # Enable gtk settings-
  # environment.variables = {
  #   GTK_THEME = "Adwaita:dark";
  #   GTK_PRIMARY_BUTTON_WARPS_SLIDER = "1";
  #   GSETTINGS_SCHEMA_DIR = "${pkgs.glib}/share/glib-2.0/schemas";
  #   GSETTINGS_SCHEMA_DIR_TEST = "${pkgs.glib}/share/glib-2.0/schemas";
  #   TEST_ONE = "TEST";
  # };

	
  
}
