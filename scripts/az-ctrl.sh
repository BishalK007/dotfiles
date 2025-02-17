#!/usr/bin/env bash

###############################################################################
# Configuration
###############################################################################
RESOURCE_GROUP="APPLICATION"
VM_NAME="Bishal-Workspace-kvm"
SSH_KEY_PATH="$HOME/.ssh/Bishal-Workspace-kvm_key.pem"
SSH_USER="bishal"
SSH_HOST_ALIAS="bkws"   # We'll use 'bkws' as the alias in ~/.ssh/config

###############################################################################
# Usage / Help
###############################################################################
usage() {
  echo "Usage: $0 [OPTIONS] [--code [PATHS...]]"
  echo
  echo "Options:"
  echo "  --bk-workspace-s | --bkws   Start the VM if stopped, wait until running, print its public IP."
  echo "  --conn                      SSH into the VM using the retrieved public IP."
  echo "  --code [PATHS...]           Update ~/.ssh/config, ensure VM is running, open VS Code on remote VM."
  echo "                              If no paths are provided, opens VS Code with no folder."
  echo "                              If paths are provided, opens a window for each path."
  echo "  --status                    Check the running status of the VM."
  echo "  --stop                      Stop the VM."
  echo "  --restart                   Restart the VM."
  echo "  -h, --help                  Show this help message and exit."
  echo
  echo "Example:"
  echo "  # Start VM if needed and get IP"
  echo "  $0 --bkws"
  echo
  echo "  # SSH into the VM"
  echo "  $0 --conn"
  echo
  echo "  # Open VS Code Remote-SSH with no folder"
  echo "  $0 --code"
  echo
  echo "  # Open VS Code Remote-SSH on /folder1 and /folder2"
  echo "  $0 --code /folder1 /folder2"
  echo
  echo "  # Check VM status"
  echo "  $0 --status"
  echo
  echo "  # Stop the VM"
  echo "  $0 --stop"
  echo
  echo "  # Restart the VM"
  echo "  $0 --restart"
  exit 1
}

###############################################################################
# Parse Arguments
###############################################################################
start_vm=false
connect_vm=false
code_open=false
status_vm=false
stop_vm=false
restart_vm=false
declare -a code_paths=()

# We need a small state machine to catch arguments for --code
while [[ $# -gt 0 ]]; do
  case "$1" in
    --bk-workspace-s|--bkws)
      start_vm=true
      shift
      ;;
    --conn)
      connect_vm=true
      shift
      ;;
    --code)
      code_open=true
      shift
      # Gather subsequent paths (until we hit another flag or run out of args)
      while [[ $# -gt 0 && ! "$1" =~ ^-- ]]; do
        code_paths+=("$1")
        shift
      done
      ;;
    --status)
      status_vm=true
      shift
      ;;
    --stop)
      stop_vm=true
      shift
      ;;
    --restart)
      restart_vm=true
      shift
      ;;
    -h|--help)
      usage
      ;;
    *)
      echo "Unknown option: $1"
      usage
      ;;
  esac
done

###############################################################################
# Helper Functions
###############################################################################
get_vm_state() {
  az vm get-instance-view \
    --resource-group "$RESOURCE_GROUP" \
    --name "$VM_NAME" \
    --query "instanceView.statuses[?starts_with(code, 'PowerState/')].code" \
    --output tsv 2>/dev/null
}

get_public_ip() {
  az vm list-ip-addresses \
    --resource-group "$RESOURCE_GROUP" \
    --name "$VM_NAME" \
    --query "[].virtualMachine.network.publicIpAddresses[*].ipAddress" \
    --output tsv 2>/dev/null
}

wait_for_running_state() {
  echo "Waiting for VM to reach 'running' state..."
  while true; do
    sleep 10
    local state
    state="$(get_vm_state)"
    if [ "$state" = "PowerState/running" ]; then
      echo "VM is now running."
      break
    else
      echo "Current state: $state. Still waiting..."
    fi
  done
}

wait_for_stopped_state() {
  echo "Waiting for VM to reach 'stopped' state..."
  while true; do
    sleep 10
    local state
    state="$(get_vm_state)"
    if [ "$state" = "PowerState/stopped" ]; then
      echo "VM is now stopped."
      break
    else
      echo "Current state: $state. Still waiting..."
    fi
  done
}

update_ssh_config() {
  local ssh_config_file="$HOME/.ssh/config"
  local host_entry="Host $SSH_HOST_ALIAS
    HostName $1
    User $SSH_USER
    IdentityFile $SSH_KEY_PATH
    StrictHostKeyChecking no
"
  # Ensure ~/.ssh/config exists
  mkdir -p "$HOME/.ssh"
  touch "$ssh_config_file"

  # Remove existing block for Host bkws if present
  # This removes lines from 'Host bkws' up to (but not including) the next 'Host ' line, or EOF.
  sed -i "/^Host $SSH_HOST_ALIAS$/,/^Host /{ /^Host $SSH_HOST_ALIAS$/d; /^Host /!d }" "$ssh_config_file"

  # Append the new host entry
  echo "$host_entry" >> "$ssh_config_file"
  echo "Updated ~/.ssh/config with Host $SSH_HOST_ALIAS => $1"
}

###############################################################################
# Main Logic
###############################################################################

# Ensure that only one of the new VM operations is provided at a time
num_new_ops=0
[ "$status_vm" = true ] && num_new_ops=$((num_new_ops+1))
[ "$stop_vm" = true ] && num_new_ops=$((num_new_ops+1))
[ "$restart_vm" = true ] && num_new_ops=$((num_new_ops+1))
if [ "$num_new_ops" -gt 1 ]; then
  echo "Error: Only one of --status, --stop, or --restart can be used at a time."
  usage
fi

# Process new VM operations if requested
if [ "$status_vm" = true ]; then
  vm_state="$(get_vm_state)"
  echo "VM '$VM_NAME' state: $vm_state"
  exit 0
fi

if [ "$stop_vm" = true ]; then
  echo "Stopping VM '$VM_NAME'..."
  az vm stop --resource-group "$RESOURCE_GROUP" --name "$VM_NAME" >/dev/null
  wait_for_stopped_state
  exit 0
fi

if [ "$restart_vm" = true ]; then
  echo "Restarting VM '$VM_NAME'..."
  az vm restart --resource-group "$RESOURCE_GROUP" --name "$VM_NAME" >/dev/null
  wait_for_running_state
  public_ip="$(get_public_ip)"
  if [ -z "$public_ip" ]; then
    echo "ERROR: Could not retrieve public IP after restart."
    exit 1
  fi
  echo "VM restarted. Public IP: $public_ip"
  exit 0
fi

public_ip=""

# If the user wants to start the VM (and/or eventually connect/VSCode), ensure it's running
if [ "$start_vm" = true ] || [ "$connect_vm" = true ] || [ "$code_open" = true ]; then
  echo "Checking VM state for '$VM_NAME'..."
  vm_state="$(get_vm_state)"

  if [ "$vm_state" != "PowerState/running" ]; then
    echo "VM is not running (current state: $vm_state). Starting VM..."
    az vm start --resource-group "$RESOURCE_GROUP" --name "$VM_NAME" >/dev/null
    wait_for_running_state
  else
    echo "VM '$VM_NAME' is already running."
  fi

  # Retrieve Public IP
  public_ip="$(get_public_ip)"
  if [ -z "$public_ip" ]; then
    echo "ERROR: Could not retrieve public IP for '$VM_NAME'."
    exit 1
  fi
fi

# 1. If --bkws was provided, print the public IP
if [ "$start_vm" = true ]; then
  echo "Public IP: $public_ip"
fi

# 2. If --code was provided, update ~/.ssh/config and open VS Code
if [ "$code_open" = true ]; then
  # Ensure we have a public IP
  if [ -z "$public_ip" ]; then
    echo "ERROR: Cannot open VS Code. No public IP found."
    exit 1
  fi

  # Update (or create) SSH config
  update_ssh_config "$public_ip"

  # Open Code in remote SSH
  if [ ${#code_paths[@]} -eq 0 ]; then
    # No paths, open one empty remote window
    echo "Opening VS Code Remote on '$SSH_HOST_ALIAS' (no folder)..."
    code --remote "ssh-remote+$SSH_HOST_ALIAS"
  else
    # Open each path in a separate window
    for path in "${code_paths[@]}"; do
      echo "Opening VS Code Remote on '$SSH_HOST_ALIAS' at path: $path"
      code --remote "ssh-remote+$SSH_HOST_ALIAS" "$path"
    done
  fi
fi

# 3. If --conn was provided, do an SSH connection
if [ "$connect_vm" = true ]; then
  echo "Connecting to '$VM_NAME' at IP: $public_ip ..."
  ssh -i "$SSH_KEY_PATH" "$SSH_USER@$public_ip"
fi
