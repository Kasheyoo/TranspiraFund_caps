#!/usr/bin/env bash
hits=$(grep -rE "Alert\.alert|ToastAndroid\." --include="*.ts" --include="*.tsx" src 2>/dev/null)
if [ -n "$hits" ]; then
  echo "❌ Native dialog detected. Use SecurityNoticeOverlay / ConfirmModal / ToastMessage:"
  echo "$hits"
  exit 1
fi
echo "✅ No native dialogs in src/"
