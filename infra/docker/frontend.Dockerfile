FROM node:20-alpine

WORKDIR /app

COPY icicso-local/apps/desktop-emulator/index.html ./index.html
COPY icicso-local/apps/desktop-emulator/app.js ./app.js
COPY icicso-local/apps/desktop-emulator/styles.css ./styles.css
COPY icicso-local/apps/desktop-emulator/server.js ./server.js

EXPOSE 8080

CMD ["node", "server.js"]
