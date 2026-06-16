#!/bin/sh
set -e

# Wait for database using Python
if [ "$DATABASE_URL" ]; then
    echo "Waiting for database..."
    python -c "
import socket, time, os
url = os.environ.get('DATABASE_URL', '')
# Parse host and port from postgres://user:pass@host:port/db
host = url.split('@')[1].split(':')[0]
port = int(url.split(':')[-1].split('/')[0])
while True:
    try:
        socket.create_connection((host, port), timeout=1)
        break
    except OSError:
        time.sleep(0.5)
"
    echo "Database is ready."
fi

# Apply migrations
echo "Applying migrations..."
python manage.py migrate --noinput

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --noinput 

# Create superuser if not exists (optional, for first deploy)
# python manage.py shell -c "from django.contrib.auth import get_user_model; User = get_user_model(); User.objects.filter(username='admin').exists() or User.objects.create_superuser('admin', 'admin@example.com', 'admin')"

# Start server
exec "$@"
