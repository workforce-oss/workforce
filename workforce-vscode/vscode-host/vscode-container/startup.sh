# Start the webserver and send it to the background
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  && [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion" \
    && nvm use 18 && node /app/server/index.js &

echo ${@}
# Start the application
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  && [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion" \
    && nvm use 18 && $OPENVSCODE_SERVER_ROOT/bin/openvscode-server --host 0.0.0.0 --without-connection-token --disable-workspace-trust "${@}" &


# Wait for the application to start
sleep 5

cd /app/browser
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  && [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion" \
    && nvm use 18 \
    && node index.js "${@}"