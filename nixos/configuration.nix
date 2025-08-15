# Edit this configuration file to define what should be installed on
# Edit this configuration file to define what should be installed on
# Edit this configuration file to define what should be installed on
# your system.  Help is available in the configuration.nix(5) man page
# and in the NixOS manual (accessible by running ‘nixos-help’).

{
  config,
  pkgs,
  lib,
  ...
}:

let
  gdk = pkgs.google-cloud-sdk.withExtraComponents (
    with pkgs.google-cloud-sdk.components;
    [
      gke-gcloud-auth-plugin
    ]
  );
  unstable = import <nixos-unstable> {
    config = {
      allowUnfree = true;
    };
  };

  home-manager = builtins.fetchTarball {
    url = "https://github.com/nix-community/home-manager/archive/release-25.05.tar.gz";
  };

  eww_flake = builtins.getFlake "github:elkowar/eww";
  eww_github_package = eww_flake.packages.${builtins.currentSystem}.eww;
  ghostty_flake = builtins.getFlake "github:ghostty-org/ghostty";
  ghostty_github_package = ghostty_flake.packages.${builtins.currentSystem}.default;

  ags_flake = builtins.getFlake "github:Aylur/ags";
  ags_github_package = ags_flake.packages.${builtins.currentSystem}.default;

  astral_flake = builtins.getFlake "github:aylur/astal";
  astral_github_package = astral_flake.packages.${builtins.currentSystem}.default;

  hyprpanel_flake = builtins.getFlake "github:Jas-SinghFSU/HyprPanel";
  hyprpanel_github_package = hyprpanel_flake.packages.${builtins.currentSystem}.default;

  hyprlock_flake = builtins.getFlake "github:hyprwm/hyprlock";
  hyprlock_github_package = hyprlock_flake.packages.${builtins.currentSystem}.default;

  # Downgraded v4l2 pkg
  my_v4l2 = pkgs.linuxPackages.v4l2loopback.overrideAttrs (old: {
    version = "0.13.2-manual";
    src = pkgs.fetchFromGitHub {
      owner = "umlaeute";
      repo = "v4l2loopback";
      rev = "v0.13.2";
      sha256 = "rcwgOXnhRPTmNKUppupfe/2qNUBDUqVb3TeDbrP5pnU=";
    };
  });

in

{
  imports = [
    # Include the results of the hardware scan.
    ./hardware-configuration.nix
    ./lanzaboote.nix
    (import "${home-manager}/nixos")
  ];
  #___ OVERLAY IMPORTS ____#
  nixpkgs.overlays = [
    (import /etc/nixos/overlays/repototxt-overlay.nix)
  ];

  # Bootloader.
  boot.loader.systemd-boot.enable = true;
  boot.loader.systemd-boot.configurationLimit = 5;
  boot.loader.efi.canTouchEfiVariables = true;
  # Enable file systems on boot
  boot.supportedFilesystems = [ "ntfs" ];

  #   boot.kernelPackages = pkgs.linuxPackagesFor (pkgs.linux_6_15.override {
  #   argsOverride = rec {
  #     src = pkgs.fetchurl {
  #       url = "mirror://kernel/linux/kernel/v6.x/linux-${version}.tar.xz";
  #       sha256 = "1dc8qrwvvy34s5lgm43j295ipwaqm8wd8x4qchr14hqlkj9hg9rc";
  #     };
  #     version = "6.15.5";
  #     modDirVersion = "6.15.5";
  #   };
  # });
  # boot.kernelPackages = pkgs.linuxPackages_latest;

  boot.initrd.kernelModules = [ "amdgpu" ];
  boot.kernelParams = [
    "amdgpu.si_support=1"
    "amdgpu.cik_support=1"
  ];

  # Fake cam
  # boot.extraModulePackages = with config.boot.kernelPackages; [ v4l2loopback ];
  boot.extraModulePackages = [ my_v4l2 ];
  boot.kernelModules = [ "v4l2loopback" ];
  boot.extraModprobeConfig = ''
    options v4l2loopback devices=1 video_nr=10 card_label="WebCam" exclusive_caps=1
  '';
  # Will do after kernel 6.14
  #   boot.kernelPatches = let
  #   version = config.boot.kernelPackages.kernel.version;
  # in [
  #   {
  #     name = "asus-armoury";
  #     patch = builtins.fetchurl {
  #       url = "https://gitlab.com/asus-linux/fedora-kernel/-/raw/rog-${lib.versions.majorMinor version}/asus-patch-series.patch";
  #     };
  #     extraStructuredConfig = with lib.kernel; {
  #       ASUS_ARMOURY = module;
  #     };
  #     extraMeta = {
  #       branch = lib.versions.majorMinor version;
  #     };
  #   }
  # ];

  networking.hostName = "nixos"; # Define your hostname.
  # networking.wireless.enable = true;  # Enables wireless support via wpa_supplicant.

  # Configure network proxy if necessary
  # networking.proxy.default = "http://user:password@proxy:port/";
  # networking.proxy.noProxy = "127.0.0.1,localhost,internal.domain";

  # Enable networking
  networking = {
    networkmanager.enable = true;
    networkmanager.dns = "default"; # Use "dnsmasq" or "systemd-resolved" if needed.
    nameservers = [
      "8.8.8.8"
      "8.8.4.4"
    ]; # Google's DNS servers.
    # proxy.httpProxy = "127.0.0.1:3128"; # use the squid cache
    # proxy.httpsProxy = "127.0.0.1:3128"; # use the squid cache
    firewall.allowedTCPPorts = [
      139
      445
    ];
  };

  # services.samba = {
  #   enable = true;
  #   securityType = "user"; # Or "share" for less secure, passwordless access within your network
  #   shares = {
  #     network_share = { # This is the name of your share as it will appear on Android
  #       path = "/home/share/network_share"; # The directory you want to share
  #       readOnly = false; # Set to true if you only want to allow reading
  #       guestOk = "no"; # Set to "yes" for passwordless access (less secure)
  #       users = "bishal"; # Replace "bishal" with your Linux username or a specific Samba user
  #     };
  #   };
  # };
  services.samba.settings = {
    shares = {
      myshare = {
        path = "/home/share/network_share";
        browseable = true;
        writable = true;
      };
    };
    global.security = "user";
  };

  # services.tlp.enable = true;
  services.upower.enable = true;
  services.power-profiles-daemon.enable = true;

  # Service of asusd
  services.asusd = {
    enable = true;
    enableUserService = true;
    # Make sure you have your asusctl package defined, like you already do
    package = unstable.asusctl;
    # This is where you define the fan curves
    fanCurvesConfig = {
      text = ''
        (
          profiles: (
                quiet: [
                    (
                        fan: CPU,
                        pwm: (0, 13, 26, 38, 64, 89, 115, 140),
                        temp: (30, 40, 50, 60, 70, 80, 90, 100),
                        enabled: true,
                    ),
                    (
                        fan: GPU,
                        pwm: (0, 13, 26, 38, 64, 89, 115, 140),
                        temp: (30, 40, 50, 60, 70, 80, 90, 100),
                        enabled: true,
                    ),
                ],
                balanced: [
                    (
                        fan: CPU,
                        pwm: (13, 26, 51, 77, 115, 153, 191, 217),
                        temp: (30, 40, 50, 60, 70, 80, 90, 100),
                        enabled: true,
                    ),
                    (
                        fan: GPU,
                        pwm: (13, 26, 51, 77, 115, 153, 191, 217),
                        temp: (30, 40, 50, 60, 70, 80, 90, 100),
                        enabled: true,
                    ),
                ],
                performance: [
                    (
                        fan: CPU,
                        pwm: (40, 70, 100, 120, 150, 220, 250, 250),
                        temp: (30, 40, 50, 60, 70, 80, 90, 100),
                        enabled: true,
                    ),
                    (
                        fan: GPU,
                        pwm: (55, 100, 150, 200, 250, 255, 255, 255),
                        temp: (30, 40, 50, 60, 70, 80, 90, 100),
                        enabled: true,
                    ),
                ],
                custom: [],
            ),
        )
      '';
     # source = "/etc/asusd/fan_curves.ron";
    };
  };

  # Force asusd to restart when fan curves config changes
  systemd.services.asusd = {
    restartTriggers = [ config.services.asusd.fanCurvesConfig.text ];
  };

  # Enable the supergfxctl daemon for MUX switch control
  services.supergfxd.enable = true;

  # users.users.jellyfin = {
  #   isSystemUser = true;
  #   description = "Jellyfin service account";
  #   extraGroups = [ "audio" "video" ];  # add any other groups as needed
  #   hashedPassword = "$6$Qc2dKuH0sJSZkkFT$8flE6mA70zDk/dEWvW7xf7XNChfZdm4RrKwJMw1qJsMVOmoju5vn.T7oRcLyBxXQzWtXmKcXlnmt/MI9ANWaS0";  # replace with your hash
  # };

  # services.jellyfin = {
  #   enable = true;
  #   openFirewall = true;  # opens port 8096 by default
  #   user = "jellyfin";    # run as the dedicated system user
  #   # (Any additional Jellyfin options can be added via extraConfig)
  # };

  fileSystems."/home/share/drive0" = {
    device = "/dev/disk/by-uuid/9685a37a-b5ab-902c-2e8e-19ab784ae74f";
    fsType = "btrfs";
    options = [
      "rw"
      "defaults"
      "compress=zstd"
      "noatime"
    ];
  };
  systemd.tmpfiles.rules = [
    "d /home/share/drive0 0755 bishal users -"
  ];
  fileSystems."/home/share/drive1" = {
    device = "/dev/disk/by-uuid/3E02C6CE02C689FB";
    fsType = "ntfs-3g";
    options = [
      "defaults"
      "rw"
      "uid=1000"
      "gid=100"
      "dmask=027"
      "fmask=137"
    ];
  };

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
  services.displayManager.autoLogin.enable = true;
  services.displayManager.autoLogin.user = "bishal";

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

  # enable xdg portal-
  xdg.portal.enable = true;
  xdg.portal.extraPortals = with pkgs; [
    xdg-desktop-portal-hyprland
    xdg-desktop-portal-gtk
  ];

  # Make Hyprland the default portal backend (gtk only for file chooser)
  xdg.portal.config = {
    common.default = [ "hyprland" "gtk" ];
  };


  # Configure keymap in X11
  services.xserver.xkb = {
    layout = "us";
    variant = "";
  };

  # Enable CUPS to print documents.
  services.printing.enable = true;

  # Enable sound with pipewire.
  # services.pulseaudio.enable = true; # <- using pipewire
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
    enable32Bit = true;
    extraPackages = with pkgs; [
      nvidia-vaapi-driver
      vaapiVdpau
      nv-codec-headers
    ];
  };

  services.xserver.videoDrivers = [
    "nvidia"
    "modesetting"
    "fbdev"
  ];
  # Enable nvidia gpu
  hardware.nvidia = {
    open = true;
    modesetting.enable = true; # Enables NVIDIA modesetting for Wayland.
    # chech here: https://github.com/NixOS/nixpkgs/blob/nixos-unstable/pkgs/os-specific/linux/nvidia-x11/default.nix
    # package = config.boot.kernelPackages.nvidiaPackages.stable;
    # package = config.boot.kernelPackages.nvidiaPackages.mkDriver {
    #   version = "570.172.08";
    #   sha256_64bit = "sha256-xctt4TPRlOJ6r5S54h5W6PT6/3Zy2R4ASNFPu8TSHKM=";
    #   sha256_aarch64 = "sha256-xctt4TPRlOJ6r5S54h5W6PT6/3Zy2R4ASNFPu8TSHKM=";
    #   openSha256 = "sha256-ZpuVZybW6CFN/gz9rx+UJvQ715FZnAOYfHn5jt5Z2C8=";
    #   settingsSha256 = "sha256-ZpuVZybW6CFN/gz9rx+UJvQ715FZnAOYfHn5jt5Z2C8=";
    #   persistencedSha256 = lib.fakeSha256;
    # };
    package = config.boot.kernelPackages.nvidiaPackages.beta;
    prime = {
      offload.enable = true;
      offload.enableOffloadCmd = true;
      nvidiaBusId = "PCI:01:00:0"; # Your NVIDIA GPU's bus ID
      amdgpuBusId = "PCI:66:00:0"; # Your AMD integrated GPU's bus ID
    };
    nvidiaSettings = true;
    powerManagement.finegrained = true;
    nvidiaPersistenced = true;
  };
  hardware.nvidia-container-toolkit.enable = true; # Enables container toolkit

  hardware.xpad-noone.enable = true;
  # Define a user account. Don't forget to set a password with ‘passwd’.

  users.users.bishal = {
    isNormalUser = true;
    description = "Bishal Karmakar";
    extraGroups = [
      "networkmanager"
      "wheel"
      "docker"
      "libvirtd"
    ]; # ____ Added docker group ______ #
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
    xfce.thunar-volman
    xfce.thunar-vcs-plugin
    xfce.thunar-archive-plugin
    xfce.thunar-media-tags-plugin
    btop
    themechanger
    hyprcursor
    grim
    wf-recorder
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
    (obs-studio.override {
      ffmpeg = ffmpeg_6-full;
    })
    jdk23
    android-tools
    # android-studio
    jellyfin
    jellyfin-web
    jellyfin-ffmpeg
    sbctl
    niv
    rclone
    desktop-file-utils
    gperftools
    pkg-config-unwrapped
    # android-studio-full
    yazi
    yaziPlugins.git
    yaziPlugins.sudo
    yaziPlugins.ouch
    yaziPlugins.chmod
    yaziPlugins.vcs-files
    qpwgraph
    unar
    nixfmt-rfc-style

    # ___ Flakes GO here ____
    # eww_github_package
    hyprpanel_github_package
    ags_github_package
    astral_github_package
    hyprlock_github_package
  ];
  # Fonts __
  fonts.packages = with pkgs; [
    nerd-fonts.fira-code
    nerd-fonts.droid-sans-mono
    noto-fonts
    noto-fonts-cjk-sans
    noto-fonts-emoji
  ];

  # 1. Enable gnome-keyring
  services.gnome.gnome-keyring = {
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

  programs.bash.shellAliases = {
    # __ Aliases __ #
    vi = "nvim";
    vim = "nvim";
    svi = "sudo nvim"; # sudo versions of the alias
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
  home-manager.users.bishal =
    { pkgs, ... }:
    {
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

          # For syncing rclone backups
          rclone-backup() {
            echo "Make sure u have rclone installed and logged in to GDrive and remote name is GdriveRcloneBackup"
            echo "we use GdriveRcloneBackup:/rclone_backups/ as the backup folder"
            local var="$1" # Assign the first argument to the local variable 'var'
            if [[ -z "$var" ]]; then
              echo "Error: Please provide a folder path to backup."
              return 1
            fi
            rclone sync "$var" GdriveRcloneBackup:rclone_backups/
          }
          # Enable bash autocompletion for the first argument of the rclone-backup function
          # complete -F _filedir rclone-backup


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
      home.stateVersion = "24.11";
    };

  # ENable flakes
  nix.settings.experimental-features = [
    "nix-command"
    "flakes"
  ];
}
