import os
def find_nginx_conf():
    search_dirs = ['/etc/nginx/sites-enabled/', '/etc/nginx/conf.d/', '/www/server/panel/vhost/nginx/']
    for d in search_dirs:
        if os.path.exists(d):
            for f in os.listdir(d):
                filepath = os.path.join(d, f)
                if os.path.isfile(filepath):
                    with open(filepath, 'r') as file:
                        content = file.read()
                        if 'swaticrm.com' in content and 'server {' in content:
                            return filepath
    return None
conf_file = find_nginx_conf()
if conf_file:
    with open(conf_file, 'r') as file:
        content = file.read()
    
    if 'location /api' not in content:
        insert_idx = content.rfind('}')
        if insert_idx != -1:
            proxy_config = """
    location /api/ {
        proxy_pass http://127.0.0.1:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    location /socket.io/ {
        proxy_pass http://127.0.0.1:5000/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }
"""
            new_content = content[:insert_idx] + proxy_config + content[insert_idx:]
            with open(conf_file, 'w') as file:
                file.write(new_content)
            print(f"Patched Nginx config: {conf_file}")
            os.system("nginx -s reload")
        else:
            print("Failed to patch Nginx. No closing bracket found.")
    else:
        print("Nginx already configured with /api.")
else:
    print("Nginx config not found. Assuming Apache/LiteSpeed is handling the server.")
