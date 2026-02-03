#!/bin/bash

# Sequential Document Fetch for WIZARA YA ELIMU
# This script calls the institution-specific API endpoint that processes employees sequentially

INSTITUTION_ID="cmd06nn7r0002e67w8df8thtn"
API_URL="http://localhost:9002/api/hrims/fetch-documents-by-institution"
LOG_FILE="scripts/logs/wizara-sequential-$(date +%Y%m%d-%H%M%S).log"

echo "🚀 Starting Sequential Document Fetch for WIZARA YA ELIMU" | tee -a "$LOG_FILE"
echo "────────────────────────────────────────────────────────────────────────────────" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"
echo "📋 Institution ID: $INSTITUTION_ID" | tee -a "$LOG_FILE"
echo "📄 Log File: $LOG_FILE" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"
echo "⚠️  This will process all employees sequentially (one at a time)" | tee -a "$LOG_FILE"
echo "⚠️  Estimated time: ~120 hours (~5 days) for remaining employees" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"
echo "Starting fetch..." | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# Call the API with streaming response
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{\"institutionId\":\"$INSTITUTION_ID\"}" \
  --no-buffer 2>&1 | while IFS= read -r line; do
    # Parse and display progress
    if [[ $line == data:* ]]; then
      # Extract JSON data
      json_data="${line#data: }"

      # Try to extract progress info
      if echo "$json_data" | grep -q '"type":"progress"'; then
        # Extract current, total, and employee name
        current=$(echo "$json_data" | grep -oP '"current":\K[0-9]+' || echo "?")
        total=$(echo "$json_data" | grep -oP '"total":\K[0-9]+' || echo "?")
        employee=$(echo "$json_data" | grep -oP '"employee":"\K[^"]+' || echo "Processing...")
        successful=$(echo "$json_data" | grep -oP '"successful":\K[0-9]+' || echo "0")
        failed=$(echo "$json_data" | grep -oP '"failed":\K[0-9]+' || echo "0")

        # Display progress (overwrite same line)
        printf "\r   Progress: %s/%s - %s [✓%s ✗%s]" "$current" "$total" "$employee" "$successful" "$failed" | tee -a "$LOG_FILE"
      elif echo "$json_data" | grep -q '"type":"complete"'; then
        echo "" | tee -a "$LOG_FILE"
        echo "" | tee -a "$LOG_FILE"
        echo "✅ Fetch completed!" | tee -a "$LOG_FILE"

        # Extract summary
        successful=$(echo "$json_data" | grep -oP '"successful":\K[0-9]+' || echo "0")
        partial=$(echo "$json_data" | grep -oP '"partial":\K[0-9]+' || echo "0")
        failed=$(echo "$json_data" | grep -oP '"failed":\K[0-9]+' || echo "0")
        total=$(echo "$json_data" | grep -oP '"total":\K[0-9]+' || echo "0")

        echo "📊 Summary:" | tee -a "$LOG_FILE"
        echo "   Total: $total employees" | tee -a "$LOG_FILE"
        echo "   ✅ Successful: $successful" | tee -a "$LOG_FILE"
        echo "   ⚠️  Partial: $partial" | tee -a "$LOG_FILE"
        echo "   ❌ Failed: $failed" | tee -a "$LOG_FILE"
        echo "" | tee -a "$LOG_FILE"
      fi
    fi
  done

echo "" | tee -a "$LOG_FILE"
echo "════════════════════════════════════════════════════════════════════════════════" | tee -a "$LOG_FILE"
echo "✅ Sequential fetch completed!" | tee -a "$LOG_FILE"
echo "📄 Full log saved to: $LOG_FILE" | tee -a "$LOG_FILE"
