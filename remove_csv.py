import os
import re

src_dir = 'd:\\mongo db\\src'

# Regex to find and remove the CSV object inside items array
csv_menu_item_pattern = re.compile(
    r'\{\s*key:\s*[\'"`][^\'"`]*csv[\'"`],\s*label:\s*[\'"]Export to CSV[\'"],.*?\},\s*',
    re.IGNORECASE | re.DOTALL
)

csv_menu_item_pattern_2 = re.compile(
    r'\{\s*id:\s*[\'"`]csv[\'"`],\s*icon:\s*FaFileCsv,\s*label:\s*[\'"]Export to CSV[\'"],.*?\},\s*',
    re.IGNORECASE | re.DOTALL
)

for root, dirs, files in os.walk(src_dir):
    for file in files:
        if file.endswith(('.jsx', '.js', '.tsx')):
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            new_content = csv_menu_item_pattern.sub('', content)
            new_content = csv_menu_item_pattern_2.sub('', new_content)
            
            if new_content != content:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f'Removed CSV menu from {filepath}')
