#!/bin/bash

brightness=$(brightnessctl -m | awk -F, '{print $4}' | tr -d '%')
    if [ "$brightness" -lt 25 ]; then
      echo '󰃞'
    elif [ "$brightness" -lt 50 ]; then
      echo '󰃝'
    elif [ "$brightness" -lt 75 ]; then
      echo '󰃟'
    else
      echo '󰃠'
    fi