FROM node:20

ARG app_env
ENV APP_ENV $app_env

# webpack 4 under react-scripts 3.4 exceeds Node 14's default old-space limit
# while building this app and dies with "JavaScript heap out of memory". The
# host is not short of RAM; the cap is V8's own default. See I100.
ENV NODE_OPTIONS=--max-old-space-size=4096

# set working directory
RUN mkdir /usr/src/app
WORKDIR /usr/src/app
# add `/usr/src/app/node_modules/.bin` to $PATH
ENV PATH /usr/src/app/node_modules/.bin:$PATH
# install and cache app dependencies
ADD package.json /usr/src/app/package.json
RUN npm install --no-package-lock
# add app
ADD . /usr/src/app

# Build at image build time, not at container start. Building in CMD meant every
# restart recompiled the bundle and re-fetched http-server from the network, so a
# restart took minutes, needed npm to be reachable, and could die on a small VM.
RUN if [ "$APP_ENV" = "production" ]; then \
      npm install -g http-server && \
      npm run build; \
    fi

# start app
#
# Production serves the compiled build over plain HTTP on 3000. TLS is
# terminated once at the edge (nginx, or Azure Application Gateway), and
# nginx.conf proxies here with `proxy_pass http://flapjack_frontend`, so an
# HTTPS listener on this port would return 502. See I100.
#
# `http-server` is the real binary name; the `hs` alias was dropped after
# http-server 0.x, so the version this installs no longer provides it.
CMD if [ ${APP_ENV} = production ]; \
	then \
	http-server build -p 3000; \
	else \
	npm run start; \
	fi

EXPOSE 3000
