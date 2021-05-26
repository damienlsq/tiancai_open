#!/bin/bash
#开发用更新脚本
git checkout release
git pull
npm install --registry=https://registry.npm.taobao.org
pm2 delete ./deploy/release_fs.json
pm2 startOrRestart ./deploy/release_fs.json --env production
pm2 delete ./deploy/release_gs.json
pm2 startOrRestart ./deploy/release_gs.json --env production
pm2 delete ./deploy/release_bs.json
pm2 startOrRestart ./deploy/release_bs.json --env production
pm2 delete ./deploy/release_xfs.json
pm2 startOrRestart ./deploy/release_xfs.json --env production