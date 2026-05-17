_default:
    just --list

clean:
    rm -rf ./dist

build:
    npm exec -- tsc

test:
    npm run test

[no-cd]
run *ARGS: build
    node {{ justfile_directory() }}/dist/bin/deobfuscate.js {{ ARGS }}