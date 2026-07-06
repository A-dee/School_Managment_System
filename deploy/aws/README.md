# AWS EC2 Deployment Guide

This guide deploys the SMS app on one Ubuntu EC2 instance with:

- FastAPI backend on `127.0.0.1:8000`
- Next.js frontend on `127.0.0.1:3000`
- Nginx public reverse proxy with HTTPS
- PostgreSQL on Amazon RDS

Recommended DNS layout:

- Frontend: `https://school.example.com`
- Backend: same origin through the frontend's `/api/v1/*` Next.js proxy
- RDS: private PostgreSQL database

## 1. AWS Resources

Create these first:

1. EC2 Ubuntu 22.04 or 24.04 instance.
2. RDS PostgreSQL instance.
3. Security groups:
   - EC2 inbound: `22`, `80`, `443`.
   - RDS inbound: `5432` from the EC2 security group only.
4. Elastic IP for EC2.
5. Domain DNS `A` record pointing to the Elastic IP.

## 2. EC2 Packages

SSH into EC2, then install dependencies:

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y git nginx python3-venv python3-pip nodejs npm certbot python3-certbot-nginx
sudo npm install -g pm2
```

Node 20 is recommended for Next.js. If Ubuntu installs an old Node version, install NodeSource Node 20 before building:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

## 3. Clone App

```bash
sudo mkdir -p /var/www
sudo chown "$USER:$USER" /var/www
cd /var/www
git clone https://github.com/A-dee/School_Managment_System.git sms
cd sms
```

## 4. Backend Env

Create `/etc/sms/backend.env` from `deploy/aws/backend.env.example`.

```bash
sudo mkdir -p /etc/sms
sudo cp deploy/aws/backend.env.example /etc/sms/backend.env
sudo nano /etc/sms/backend.env
sudo chmod 600 /etc/sms/backend.env
```

Set `DATABASE_URL` to the RDS PostgreSQL URL:

```text
postgresql://USERNAME:PASSWORD@RDS-ENDPOINT:5432/DBNAME
```

Keep `SECRET_KEY` and `REFRESH_SECRET_KEY` stable. Changing them logs everyone out.

## 5. Backend Install

```bash
cd /var/www/sms
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
set -a
source /etc/sms/backend.env
set +a
alembic upgrade head
```

## 6. Frontend Env

The frontend calls `/api/v1/*` on the same domain. The Next.js server proxy forwards those calls to FastAPI.

```bash
sudo cp /var/www/sms/deploy/aws/frontend.env.example /etc/sms/frontend.env
sudo chmod 600 /etc/sms/frontend.env
cd /var/www/sms/frontend
npm install
npm run build
```

Do not set any `NEXT_PUBLIC_API_*` variable.

## 7. Systemd Services

Copy service files:

```bash
sudo cp /var/www/sms/deploy/aws/sms-backend.service /etc/systemd/system/sms-backend.service
sudo cp /var/www/sms/deploy/aws/sms-frontend.service /etc/systemd/system/sms-frontend.service
sudo systemctl daemon-reload
sudo systemctl enable sms-backend sms-frontend
sudo systemctl start sms-backend sms-frontend
```

Check status:

```bash
sudo systemctl status sms-backend --no-pager
sudo systemctl status sms-frontend --no-pager
curl http://127.0.0.1:8000/api/v1/health
curl http://127.0.0.1:3000
```

## 8. Nginx

Copy and edit the domain in `sms-nginx.conf`:

```bash
sudo cp /var/www/sms/deploy/aws/sms-nginx.conf /etc/nginx/sites-available/sms
sudo nano /etc/nginx/sites-available/sms
sudo ln -s /etc/nginx/sites-available/sms /etc/nginx/sites-enabled/sms
sudo nginx -t
sudo systemctl reload nginx
```

Enable HTTPS:

```bash
sudo certbot --nginx -d school.example.com
```

## 9. Seed Admin If Needed

Only run this if the RDS database is new and empty:

```bash
cd /var/www/sms
source .venv/bin/activate
set -a
source /etc/sms/backend.env
set +a
python seed.py
```

Default seed login:

```text
superadmin@school.com / Admin@1234
```

Change this password immediately after first login.

## 10. Deploy Updates

```bash
cd /var/www/sms
git pull origin main
source .venv/bin/activate
pip install -r requirements.txt
set -a
source /etc/sms/backend.env
set +a
alembic upgrade head
cd frontend
npm install
npm run build
sudo systemctl restart sms-backend sms-frontend
```

## 11. Quick Troubleshooting

Backend logs:

```bash
sudo journalctl -u sms-backend -f
```

Frontend logs:

```bash
sudo journalctl -u sms-frontend -f
```

Nginx logs:

```bash
sudo tail -f /var/log/nginx/sms_error.log
sudo tail -f /var/log/nginx/sms_access.log
```

Common mistakes:

- `DATABASE_URL` points to the wrong RDS database.
- RDS security group does not allow EC2.
- `SECRET_KEY` changed after users logged in.
- Frontend has `NEXT_PUBLIC_API_URL` or another old public backend URL.
- Nginx domain still says `school.example.com`.
