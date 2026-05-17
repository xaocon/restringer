_default:
    just --list

clean:
    rm -rf ./dist

build:
    npm exec -- tsc

test:
    npm run test
