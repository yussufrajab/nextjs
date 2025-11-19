# Quick Start: MinIO for CSMS

MinIO is now installed and configured! Here's how to use it:

## Current Status

✅ MinIO server is **RUNNING** on:
- **API**: http://localhost:9000
- **Console**: http://localhost:9001
- **PID**: Check `minio.pid` file
- **Logs**: Check `minio.log` file

## Access MinIO Console

1. Open your browser: http://localhost:9001
2. Login credentials:
   - **Username**: `minioadmin`
   - **Password**: `minioadmin`

## Managing MinIO

### Check if MinIO is running
```bash
ps -p $(cat minio.pid) && echo "MinIO is running" || echo "MinIO is not running"
```

### View MinIO logs
```bash
tail -f minio.log
```

### Stop MinIO
```bash
kill $(cat minio.pid)
```

### Start MinIO manually
```bash
MINIO_ROOT_USER=minioadmin MINIO_ROOT_PASSWORD=minioadmin \
  ./minio server minio-data --address :9000 --console-address :9001 > minio.log 2>&1 &
echo $! > minio.pid
```

### Or use the npm script
```bash
npm run minio:start
```

## Test File Upload

Your application's file upload should now work! Try uploading a PDF file through your app.

The upload API endpoint is: `POST http://localhost:9002/api/files/upload`

## Bucket Information

- **Bucket Name**: `csms-files` (auto-created)
- **Storage Location**: `./minio-data/csms-files/`

## Files Created

- `./minio` - MinIO binary
- `./minio-data/` - File storage directory
- `./minio.pid` - Process ID file
- `./minio.log` - Server logs
- `./test-minio.js` - Integration test script

## Test Script

Run the integration test to verify everything works:
```bash
node test-minio.js
```

## Production Notes

**Important**: Before deploying to production:

1. Change default credentials in `.env`:
   ```env
   MINIO_ACCESS_KEY=your-secure-access-key
   MINIO_SECRET_KEY=your-secure-secret-key-min-8-chars
   ```

2. Use a process manager like PM2:
   ```bash
   pm2 start ./minio --name minio -- server minio-data --address :9000 --console-address :9001
   pm2 save
   pm2 startup
   ```

3. Set up proper backups of `minio-data/` directory

4. Enable SSL/TLS in production

## Troubleshooting

### Port already in use
```bash
# Check what's using port 9000
lsof -i :9000

# Or use netstat
netstat -tlnp | grep 9000
```

### MinIO won't start
```bash
# Check logs
tail -100 minio.log

# Verify binary is executable
chmod +x ./minio

# Try starting manually to see errors
./minio server minio-data --address :9000 --console-address :9001
```

### Can't connect from app
1. Verify MinIO is running: `ps -p $(cat minio.pid)`
2. Check MinIO is responding: `curl http://localhost:9000/minio/health/live`
3. Verify environment variables in `.env` match MinIO config

## Next Steps

Your MinIO file storage is ready! You can now:
- Upload files through your application
- Access files via the MinIO Console
- Use the API endpoints for file management

For more details, see `MINIO_SETUP.md`.
