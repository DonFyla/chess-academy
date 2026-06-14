#!/bin/sh
set -e

# Wait for database
if [ "$DATABASE_URL" ]; then
    echo "Waiting for database..."
    until nc -z db 5432; do
        sleep 0.5
    done
    echo "Database is ready."
fi

# Apply migrations
echo "Applying migrations..."
python manage.py migrate --noinput

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --noinput --clear

# Create superuser if not exists (optional, for first deploy)
# python manage.py shell -c "from django.contrib.auth import get_user_model; User = get_user_model(); User.objects.filter(username='admin').exists() or User.objects.create_superuser('admin', 'admin@example.com', 'admin')"

# Start server
exec "$@"
