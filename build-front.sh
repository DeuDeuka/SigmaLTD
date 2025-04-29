cd ~/SigmaLTD/frontend

expo build:web

rm -rf /var/www/sigmaltd/html/

mkdir -p /var/www/sigmaltd/html/
sudo cp -r ~/SigmaLTD/frontend/web-build/* /var/www/sigmaltd/html/
sudo chown -R www-data:www-data /var/www/sigmaltd/html