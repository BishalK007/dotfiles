# Appliers notes

This folder contains appliers that push derived colors into different targets.

## PS1 (shell prompt) applier

What it does
- Writes `~/.config/dotfiles/shell-colors.sh` with exported TrueColor sequences.
- Emits both Bash-bracketed (non-printing) and RAW ANSI variants; selects based on `$BASH_VERSION` when sourced.
- Broadcasts to Kitty to reload the prompt in-place: source the snippet and call `__cl_ps1_reload` if present. After that, performs a soft clear with `kitty @ action clear_terminal scroll active` (preserves scrollback).

How to enable hot-reload in Bash
- Add this drop-in to `~/.bashrc` (or Home Manager `programs.bash.initExtra`):

```bash
# Color listener prompt hook
CL_PS1_THEME="$HOME/.config/dotfiles/shell-colors.sh"
[[ -f "$CL_PS1_THEME" ]] && . "$CL_PS1_THEME"

# Optional: show current git branch
parse_git_branch() {
  branch=$(git branch 2>/dev/null | sed -n '/^\*/s/^\* //p')
  [ -n "$branch" ] && echo "[$branch] "
}

# Re-source colors and rebuild PS1 each prompt
__cl_ps1_reload() {
  [[ -f "$CL_PS1_THEME" ]] && . "$CL_PS1_THEME"
  export PS1="$CL_FG_PRIMARY\u@\h $CL_FG_SECONDARY\w $CL_FG_PRIMARY\$(parse_git_branch)$CL_FG_SECONDARY\$ $CL_RESET"
}

# Run after every command
PROMPT_COMMAND="${PROMPT_COMMAND:+$PROMPT_COMMAND; }__cl_ps1_reload"
```

Notes
- nix develop / non-Bash shells: the RAW ANSI variant avoids Bash's `[ ... ]` markers to prevent literal brackets in prompts.
- Busy shells (currently running a command) aren’t interrupted; they’ll pick up new colors at the next prompt via the hook.
- Kitty broadcast requires in `kitty.conf`:
  - `allow_remote_control yes`
  - `listen_on unix:/tmp/kitty-<your-username>`
- For zsh/fish, add an equivalent precmd hook to source the snippet and rebuild your prompt.
