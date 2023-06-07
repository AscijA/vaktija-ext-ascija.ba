#!/bin/bash

set -e

if [ "$UID" = "0" ]; then
    echo 'This should not be run as root'
    exit 101
fi

NAME=vaktija\@ascija.ba


function make-local-install {
    DEST=~/.local/share/gnome-shell/extensions/$NAME

    echo 'Installing...'
    if [ ! -d $DEST ]; then
        mkdir $DEST
    else
      rm -r $DEST
      mkdir $DEST
    fi

    cp -r src/* $DEST/

    echo 'Done'
}

function usage() {
    echo 'Usage: ./install.sh COMMAND'
    echo 'COMMAND:'
    echo "  local-install  install the extension in the user's home directory"
    echo '                 under ~/.local'
    echo "  dev-install  install the extension in the user's home directory"
    echo '                 under ~/.local and restart GNOME-Shell'
}

case "$1" in
    "local-install" )
        make-local-install
        ;;

    "dev-install" )
        make-local-install
        killall -HUP gnome-shell
        ;;

    * )
        usage
        ;;
esac
exit