#!/usr/bin/env bash

# hyprlock launcher with optional wallpaper name import from hyprpaper.conf
# Usage examples:
#   hyprlock.sh                      # just run hyprlock
#   hyprlock.sh --from-hyprpaper     # read current wallpaper from ../hyprpaper.conf
#   hyprlock.sh --from-hyprpaper -- -q   # pass args to hyprlock after --

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
CONF_DEFAULT="$SCRIPT_DIR/../hyprpaper.conf"

parse_hyprpaper_wall_name() {
	local conf_path="$1"
	[[ -f "$conf_path" ]] || return 1

	# Strip comments, find wallpaper lines, take the last, extract path (after comma)
	local line path name
	line=$(sed -e 's/#.*$//' "$conf_path" | grep -E '^[[:space:]]*wallpaper[[:space:]]*=' | tail -n1 || true)
	if [[ -z "${line:-}" ]]; then
		return 1
	fi
	# After '=' there is ", <path>", so split by comma and trim
	path=$(awk -F',' '{print $2}' <<<"$line" | xargs)
	# Expand $HOME inside the path if present
	path="${path//\$HOME/$HOME}"
	# Normalize optional surrounding single/double quotes if present
	path="${path%\"}"
	path="${path#\"}"
	path="${path%\'}"
	path="${path#\'}"
	name="$(basename -- "$path")"
	[[ -n "$name" ]] || return 1
	printf '%s\n' "$name"
}

FROM_HYPRPAPER=false
HYPRPAPER_CONF="$CONF_DEFAULT"

ARGS=()
while (($#)); do
	case "$1" in
		--from-hyprpaper)
			FROM_HYPRPAPER=true
			shift
			;;
		--hyprpaper-conf)
			# optional: allow a custom conf path
			HYPRPAPER_CONF="${2:-}"
			shift 2 || true
			;;
		--)
			shift
			ARGS+=("$@")
			break
			;;
		*)
			ARGS+=("$1")
			shift
			;;
	esac
done

if $FROM_HYPRPAPER; then
	if name=$(parse_hyprpaper_wall_name "$HYPRPAPER_CONF"); then
		export HYPRLOCK_WALLPAPER_NAME="$name"
	fi
fi

pidof hyprlock || hyprlock "${ARGS[@]}"


