FROM node:18-alpine as builder

RUN apk add g++ make py3-pip

WORKDIR /app
COPY package.json package.json
COPY yarn.lock yarn.lock
COPY lib/package.json lib/package.json
COPY server/package.json server/package.json
COPY workforce-vscode/package.json workforce-vscode/package.json
COPY vscode-host/browser-controller/package.json vscode-host/browser-controller/package.json

RUN yarn install

COPY vscode-host/browser-controller/ vscode-host/browser-controller/

COPY lib/ lib/
RUN yarn workspace lib install && yarn workspace lib run build

COPY server/ server/
RUN yarn workspace server install && yarn workspace server run package

COPY workforce-vscode/ workforce-vscode/
RUN npm -w workforce-vscode pkg set 'contributes.configuration.properties[workforce-vscode.chatEnabled].default'=false \
    && npm -w workforce-vscode pkg set 'contributes.configuration.properties[workforce-vscode.socketUrl].default'='http://localhost:8085/vscode-extension-server/socket' \
    && npm -w workforce-vscode pkg set 'contributes.configuration.properties[workforce-vscode.authEnabled].default'=false 
RUN yarn workspace workforce-vscode install && yarn workspace workforce-vscode run extension


FROM gitpod/openvscode-server:latest

USER root
# Dependencies for the browser
RUN apt-get update && apt-get install -y ca-certificates \
    curl \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    wget \
    xdg-utils

# nvm
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash
RUN export NVM_DIR="$HOME/.nvm" \    
    && [ -s "$NVM_DIR/nvm.sh" ] \   
    && \. "$NVM_DIR/nvm.sh"  \  
    && [ -s "$NVM_DIR/bash_completion" ] \  
    && \. "$NVM_DIR/bash_completion" \  
    && nvm install 18

# Add OpenJDK 17
RUN apt-get install -y openjdk-17-jdk

# Add Maven
RUN apt-get install -y maven

# oauth2-proxy
RUN wget https://github.com/oauth2-proxy/oauth2-proxy/releases/download/v7.6.0/oauth2-proxy-v7.6.0.linux-amd64.tar.gz \
    && tar -xvf oauth2-proxy-v7.6.0.linux-amd64.tar.gz \
    && mv oauth2-proxy-v7.6.0.linux-amd64/oauth2-proxy /usr/local/bin/oauth2-proxy \
    && rm -rf oauth2-proxy-v7.6.0.linux-amd64.tar.gz oauth2-proxy-v7.6.0.linux-amd64

# install base extensions
USER openvscode-server

# Set the environment variables
ENV OPENVSCODE_SERVER_ROOT="/home/.openvscode-server"
ENV OPENVSCODE="${OPENVSCODE_SERVER_ROOT}/bin/openvscode-server"

RUN ${OPENVSCODE} --install-extension redhat.java
RUN ${OPENVSCODE} --install-extension bierner.markdown-mermaid

# Switch back to root to install the extension
USER root

# Set the environment variables
ENV OPENVSCODE_SERVER_ROOT="/home/.openvscode-server"
ENV OPENVSCODE="${OPENVSCODE_SERVER_ROOT}/bin/openvscode-server"

# COPY the browser-controller
RUN mkdir -p /app/browser && cd /app/browser \
    && export NVM_DIR="$HOME/.nvm" \    
    && [ -s "$NVM_DIR/nvm.sh" ] \   
    && \. "$NVM_DIR/nvm.sh"  \  
    && [ -s "$NVM_DIR/bash_completion" ] \  
    && \. "$NVM_DIR/bash_completion" \  
    && nvm use 18 \ 
    && npm install puppeteer \
    && npm install --global yarn

RUN chown -R openvscode-server:openvscode-server /home/workspace/.npm

COPY --from=builder /app/vscode-host/browser-controller/src/index.js /app/browser/index.js

# Copy the server
COPY --from=builder /app/server/dist/index.js /app/server/index.js

# COPY the extension
COPY --from=builder /app/workforce-vscode/dist/extension.vsix /app/extensions/extension.vsix

# Copy the startup script
COPY vscode-container/startup.sh /startup.sh

USER openvscode-server
# Install the extension
RUN ${OPENVSCODE} --install-extension /app/extensions/extension.vsix

ENTRYPOINT [ "/bin/bash", "-c", "/startup.sh", "--" ]