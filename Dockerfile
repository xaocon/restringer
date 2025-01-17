ARG BUILD_NODE_VERSION=lts
FROM node:${BUILD_NODE_VERSION} as builder

RUN --mount=type=cache,target=/root/.npm npm add -g npm \
    npm add -g restringer


FROM node:${BUILD_NODE_VERSION}

ENV NODE_OPTIONS='--no-node-snapshot'

WORKDIR /media

RUN --mount=type=cache,target=/root/.npm npm add -g npm \
    npm add -g restringer

CMD [\
    "echo '# eval $(docker run restringer)'", \
    "alias restringer='docker run -v $PWD:/media restringer restringer'" \
    ]

