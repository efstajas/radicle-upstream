#!/usr/bin/env bash

# Copyright © 2021 The Radicle Upstream Contributors
#
# This file is part of radicle-upstream, distributed under the GPLv3
# with Radicle Linking Exception. For full terms see the included
# LICENSE file.

set -euo pipefail

# Docker manipulates iptables in a way that prevents our network topology to
# work, this function resets all iptables rules to the defaults.
function reset_iptables {
  echo "resetting iptables to defaults"
  set +e

  iptables -P INPUT ACCEPT
  iptables -P FORWARD ACCEPT
  iptables -P OUTPUT ACCEPT
  iptables -t filter -F
  iptables -t filter -X
  iptables -t nat -F
  iptables -t nat -X
  iptables -t mangle -F
  iptables -t mangle -X
  iptables -t raw -F
  iptables -t raw -X

  set -e
  return 0
}

function status {
  echo "current networking status"
  set +e

  iptables -L -t filter
  iptables -L -t nat
  iptables -L -t mangle
  iptables -L -t raw
  iptables -L -t security

  ip addr list
  ip link list
  ip netns list

  ip route list
  ip netns exec upstream-test-maintainer ip route list
  ip netns exec upstream-test-contributor ip route list
  ip netns exec upstream-test-seed ip route list

  set -e
  return 0
}

function usage {
  cat <<EOF
Usage: sudo $(basename "${BASH_SOURCE[0]}") start | stop

This script sets up a star network topology.
It only works on Linux and _has to be run as root_.

EOF
  exit
}

function start {
  if [[ "${GITHUB_ACTIONS:-}" = "true" ]]; then
    reset_iptables
  fi
  clean_up_network
  setup_network
}


function main {
  echo

  if [[ "$OSTYPE" != "linux-gnu"* ]]; then
    echo -e "this script only works on Linux\n"
    exit 1
  fi

  if [ "$EUID" -ne 0 ]
    then usage;
    exit 1
  fi

  case $1 in
    status) status ;;
    start) start ;;
    stop) clean_up_network ;;
    --help) usage ;;
    *) usage; exit 1 ;;
  esac
}

export -f reset_iptables
export -f main
