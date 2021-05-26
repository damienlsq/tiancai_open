#!/bin/bash
#开发用更新脚本
git checkout develop -f
git pull
npm install --registry=https://registry.npm.taobao.org
pm2 delete ./deploy/release_fs.json
pm2 startOrRestart ./deploy/release_fs.json --env development
pm2 delete ./deploy/release_gs.json
pm2 startOrRestart ./deploy/release_gs.json --env development
pm2 delete ./deploy/release_bs.json
pm2 startOrRestart ./deploy/release_bs.json --env development
