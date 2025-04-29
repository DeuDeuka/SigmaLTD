cd ~/SigmaLTD/backend

pm2 delete sigmaltd-backend

npm install

npx prisma generate

npx prisma migrate deploy

pm2 start npm --name "sigmaltd-backend" -- start
pm2 save
pm2 startup