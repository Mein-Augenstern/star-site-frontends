#!/bin/bash
# 一键：构建微信小程序 → 拉起微信开发者工具并自动打开项目
# 用法：./scripts/dev-weixin.sh
set -e
cd "$(dirname "$0")/.."

echo "[1/2] 构建微信小程序产物..."
npm run build:mp-weixin

echo "[2/2] 拉起微信开发者工具..."
CLI="/Applications/wechatwebdevtools.app/Contents/MacOS/cli"
PROJ="$(pwd)/dist/build/mp-weixin"
if [ -x "$CLI" ]; then
  "$CLI" auto --project "$PROJ" --auto-port 9420 &
else
  echo "未找到微信开发者工具，请手动导入项目: $PROJ"
  open -a wechatwebdevtools
fi

echo "完成。首次使用需在工具中扫码登录微信。"
