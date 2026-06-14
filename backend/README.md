# Chess Academy Django Backend

This is the new Django monolith for Moving Train Chess Academy.

## Local Development

1. Copy environment variables:
   ```bash
   cp .env.example .env
   ```

2. Build and run with Docker Compose:
   ```bash
   docker compose up --build
   ```

3. Access the site at http://localhost:8000

4. Create a superuser:
   ```bash
   docker compose exec web python manage.py createsuperuser
   ```

## Running Tests

```bash
docker compose exec web python manage.py test
```

## Deployment

Deployment is handled automatically via GitHub Actions on pushes to the `django-migration` branch.

Required GitHub secrets:
- `VPS_HOST`
- `VPS_USER`
- `VPS_SSH_KEY`
- `VPS_PORT` (optional, defaults to 22)
