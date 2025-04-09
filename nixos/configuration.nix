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

  astral_flake = builtins.getFlake "github:aylur/astal";
  astral_github_package = astral_flake.packages.${builtins.currentSystem}.default;
  
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
    # proxy.httpProxy = "127.0.0.1:3128"; # use the squid cache
    # proxy.httpsProxy = "127.0.0.1:3128"; # use the squid cache
    firewall.allowedTCPPorts = [ 
      139
      445
    ];
  };

  services.samba = {
    enable = true;
    securityType = "user"; # Or "share" for less secure, passwordless access within your network
    shares = {
      network_share = { # This is the name of your share as it will appear on Android
        path = "/home/share/network_share"; # The directory you want to share
        readOnly = false; # Set to true if you only want to allow reading
        guestOk = "no"; # Set to "yes" for passwordless access (less secure)
        users = "bishal"; # Replace "bishal" with your Linux username or a specific Samba user
      };
    };
  };


  

  users.users.jellyfin = {
    isSystemUser = true;
    description = "Jellyfin service account";
    extraGroups = [ "audio" "video" ];  # add any other groups as needed
    hashedPassword = "$6$Qc2dKuH0sJSZkkFT$8flE6mA70zDk/dEWvW7xf7XNChfZdm4RrKwJMw1qJsMVOmoju5vn.T7oRcLyBxXQzWtXmKcXlnmt/MI9ANWaS0";  # replace with your hash
  };

  services.jellyfin = {
    enable = true;
    openFirewall = true;  # opens port 8096 by default
    user = "jellyfin";    # run as the dedicated system user
    # (Any additional Jellyfin options can be added via extraConfig)
  };

  # fileSystems."/home/share/network_share/mnt" = {
  #   device = "/dev/disk/by-uuid/7be10710-211a-4cd1-81ff-ea48eeb2b314";
  #   fsType = "xfs";
  #   options = [ "defaults" ];
  # };


  #TODO
  # cache in network
  # services.squid = {
  #   enable = true;
  #   package = pkgs.squid;
  #   proxyPort = 3128;
  #   proxyAddress = "127.0.0.1";

  #   extraConfig = ''
  #     # Allocate 20GB for caching
  #     cache_dir ufs /var/spool/squid 20000 16 256

  #     # Set the maximum object size to 5GB
  #     maximum_object_size 5000 MB
  #     maximum_object_size_in_memory 512 KB

  #     # Increase cache memory (optional, adjust as needed)
  #     cache_mem 512 MB

  #     # Allow local machine to use the proxy
  #     acl localnet src 127.0.0.1/32
  #     http_access allow localnet
  #     http_access allow localhost

  #     # Store only cacheable large objects
  #     refresh_pattern -i \.tar\.gz$ 1440 90% 2880 reload-into-ims
  #     refresh_pattern -i \.iso$ 1440 90% 2880 reload-into-ims
  #     refresh_pattern -i \.deb$ 1440 90% 2880 reload-into-ims
  #     refresh_pattern -i \.nix$ 1440 90% 2880 reload-into-ims

  #     # Increase storage efficiency
  #     cache_swap_low 90
  #     cache_swap_high 95
  #   '';
  # };

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
  
  # Enable the Gnome Desktop Environment.
  # services.xserver.displayManager.gdm.enable = true;
  # services.xserver.desktopManager.gnome.enable = true;
  
  # Turn on hyprland
  programs.hyprland = {
   enable = true;
  };
  environment.sessionVariables.NIXOS_OZONE_WL = "1";

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
 

	services.cloudflare-warp.enable = true;


  # Enable OpenGL
  hardware.graphics = {
    enable = true;
  };

  # Enable nvidia gpu
  hardware.nvidia = {
    modesetting.enable = true;   # Enables NVIDIA modesetting for Wayland.
    package = config.boot.kernelPackages.nvidiaPackages.stable;
    prime.offload.enable = true;
    prime.offload.enableOffloadCmd = true;
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

  # Allow unfree packages
  nixpkgs.config.allowUnfree = true;

  #Allow unsafe packages
  nixpkgs.config.permittedInsecurePackages = [
        "qbittorrent-4.6.4"
        "squid-6.10"
  ];

  # List packages installed in system profile. To search, run:
  # $ nix search wget


  nixpkgs.config = {
    android_sdk.accept_license = true;
  };

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
    alacritty
    fastfetch
    mongodb-compass
    cargo-watch
    brightnessctl
    unstable.awscli2
    wireshark
    obs-studio
    ags_github_package
    astral_github_package
    jdk23
	  android-tools
    android-studio
    jellyfin
    jellyfin-web
    jellyfin-ffmpeg
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

      set clipboard=unnamedplus
    '';

    # Add wl-clipboard to the packages available to Neovim
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

          # cmd to stop and start samba and jellyfin services-
          ns() {
            local action="$1"
            local services=(
              "samba-nmbd.service"
              "samba-smbd.service"
              "samba-winbindd.service"
              "jellyfin.service"
            )

            if [[ "$action" == "start" ]]; then
              for service in "''${services[@]}"; do
                sudo systemctl start "$service"
                echo "Started $service"
              done
            elif [[ "$action" == "stop" ]]; then
              for service in "''${services[@]}"; do
                sudo systemctl stop "$service"
                echo "Stopped $service"
              done
            else
              echo "Usage: ns/network_share [start|stop]"
              return 1
            fi
          }
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

    # The state version is required and should stay at the version you
    # originally installed.
    home.stateVersion = "24.05";
  };
  
  # ENable flakes
  nix.settings.experimental-features = [ "nix-command" "flakes" ];
}
