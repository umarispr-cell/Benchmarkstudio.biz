#!/usr/bin/env python3
"""Analyze the old Metro SQL dump to profile data for migration."""

import re
from collections import Counter

DUMP_FILE = '/Users/macbook/Documents/sheetbenchmark_transdat_aus-metro.sql'

print("Loading SQL dump...")
with open(DUMP_FILE, 'r', errors='replace') as f:
    content = f.read()

print(f"Total file size: {len(content):,} chars")

# ============================================================
# 1. Find all INSERT INTO statements and count rows per table
# ============================================================
print("\n" + "="*60)
print("TABLE ROW COUNTS")
print("="*60)

tables = re.findall(r'INSERT INTO `(\w+)`', content)
table_counts = Counter(tables)
for table, count in sorted(table_counts.items()):
    print(f"  {table}: {count} INSERT statements")

# ============================================================
# 2. Extract ORDER data - parse the VALUES
# ============================================================
print("\n" + "="*60)
print("ORDER TABLE ANALYSIS")
print("="*60)

# Find all INSERT INTO `order` blocks
order_inserts = re.findall(r"INSERT INTO `order`[^;]+;", content)
print(f"  Number of INSERT blocks: {len(order_inserts)}")

# Count individual rows across all INSERT blocks
total_order_rows = 0
for block in order_inserts:
    # Each row starts with ( and ends with )
    rows = re.findall(r'\((\d+),', block)
    total_order_rows += len(rows)
print(f"  Total order rows: {total_order_rows}")

# Extract status values
status_values = []
for block in order_inserts:
    # status is near the end of each row tuple - find all quoted values
    # Based on schema: status is column ~28 (varchar(10))
    # Let's find patterns like ,'pending', or ,NULL, near end
    vals = re.findall(r"'(pending|held|completed|done|cancelled|delivered|active|assigned|queued|in.progress|submitted|rejected|approved|returned|rework)'", block, re.IGNORECASE)
    status_values.extend(vals)

status_counter = Counter(status_values)
print(f"\n  Status value distribution:")
for s, c in status_counter.most_common():
    print(f"    '{s}': {c}")

# Extract client_name values (actually priority)
client_values = []
for block in order_inserts:
    vals = re.findall(r"'(Regular|High|Urgent|Normal|Low|Medium|Priority|Rush|Standard)'", block, re.IGNORECASE)
    client_values.extend(vals)

client_counter = Counter(client_values)
print(f"\n  client_name (priority) distribution:")
for c, cnt in client_counter.most_common():
    print(f"    '{c}': {cnt}")

# Extract drawer_done / checker_done / final_upload
drawer_done = []
checker_done = []
final_upload = []
for block in order_inserts:
    dd = re.findall(r"drawer_done[^,]*|'yes'|'no'", block)
    
# Better: count 'yes' occurrences contextually
# Let's just count all 'yes' values
yes_count = sum(block.count("'yes'") for block in order_inserts)
print(f"\n  Total 'yes' values in order data: {yes_count}")

# ============================================================
# 3. DRAWER TABLE
# ============================================================
print("\n" + "="*60)
print("DRAWER TABLE")
print("="*60)

drawer_inserts = re.findall(r"INSERT INTO `drawer`[^;]+;", content)
drawer_rows = []
for block in drawer_inserts:
    # Extract (id, name, team_id, username, password, status) tuples
    rows = re.findall(r"\((\d+),'([^']*)',(\d+),'([^']*)','([^']*)','([^']*)'\)", block)
    drawer_rows.extend(rows)

print(f"  Total drawers: {len(drawer_rows)}")
for d in drawer_rows:
    print(f"    ID={d[0]}, Name='{d[1]}', Team={d[2]}, Username='{d[3]}', Status='{d[5]}'")

# ============================================================
# 4. CHECKER TABLE
# ============================================================
print("\n" + "="*60)
print("CHECKER TABLE")
print("="*60)

checker_inserts = re.findall(r"INSERT INTO `checker`[^;]+;", content)
checker_rows = []
for block in checker_inserts:
    rows = re.findall(r"\((\d+),'([^']*)',(\d+),'([^']*)','([^']*)','([^']*)'\)", block)
    checker_rows.extend(rows)

print(f"  Total checkers: {len(checker_rows)}")
for c in checker_rows:
    print(f"    ID={c[0]}, Name='{c[1]}', Team={c[2]}, Username='{c[3]}', Status='{c[5]}'")

# ============================================================
# 5. SUPERVISOR TABLE
# ============================================================
print("\n" + "="*60)
print("SUPERVISOR TABLE")
print("="*60)

sup_inserts = re.findall(r"INSERT INTO `supervisor`[^;]+;", content)
for block in sup_inserts:
    print(f"  Raw: {block[:500]}")

# ============================================================
# 6. ADMIN TABLE
# ============================================================
print("\n" + "="*60)
print("ADMIN TABLE")
print("="*60)

admin_inserts = re.findall(r"INSERT INTO `admin`[^;]+;", content)
for block in admin_inserts:
    print(f"  Raw: {block[:500]}")

# ============================================================
# 7. METRO_TEAMS TABLE
# ============================================================
print("\n" + "="*60)
print("METRO_TEAMS TABLE")
print("="*60)

team_inserts = re.findall(r"INSERT INTO `metro_teams`[^;]+;", content)
for block in team_inserts:
    print(f"  Raw: {block[:1000]}")

# ============================================================
# 8. AMEND_ORDER TABLE
# ============================================================
print("\n" + "="*60)
print("AMEND_ORDER TABLE")
print("="*60)

amend_inserts = re.findall(r"INSERT INTO `amend_order`[^;]+;", content)
total_amend = 0
for block in amend_inserts:
    rows = re.findall(r'\((\d+),', block)
    total_amend += len(rows)
print(f"  Total amend_order rows: {total_amend}")

# ============================================================
# 9. DETAIL TABLE
# ============================================================
print("\n" + "="*60)
print("DETAIL TABLE")
print("="*60)

detail_inserts = re.findall(r"INSERT INTO `detail`[^;]+;", content)
total_detail = 0
for block in detail_inserts:
    rows = re.findall(r'\((\d+),', block)
    total_detail += len(rows)
print(f"  Total detail rows: {total_detail}")

# ============================================================
# 10. Extract unique drawer/checker names from orders
# ============================================================
print("\n" + "="*60)
print("UNIQUE WORKER NAMES IN ORDERS")
print("="*60)

# Parse a sample of order rows to extract dname and cname
# dname is around column 16, cname around column 18
# Let's try a different approach - extract all quoted strings that look like names

# Get all text between INSERT INTO `order` VALUES and the semicolon
all_order_data = ""
for block in order_inserts:
    all_order_data += block

# Find all drawer names (dname field) - patterns like ,'Name', after dassign_time
dnames = re.findall(r"'(\w[\w\s]{1,50}?)','[\d\-\s:]*?','[\d\-\s:]*?','(\w[\w\s]{1,50}?)'", all_order_data)
print(f"  Name pairs found: {len(dnames)}")

# Let's try to get first 5 complete order rows for analysis
print("\n  SAMPLE ORDERS (first 3 complete rows):")
for i, block in enumerate(order_inserts[:1]):
    # Get first few rows
    sample = block[:3000]
    print(f"  Block {i}: {sample}")

# ============================================================
# 11. Date format analysis
# ============================================================
print("\n" + "="*60)
print("DATE FORMAT ANALYSIS")
print("="*60)

# Extract date values
dates = re.findall(r"'(\d{1,2}-\w{3}-\d{2,4})'", all_order_data)
date_counter = Counter([d[:5] for d in dates[:100]])  # first 100 dates, group by pattern
print(f"  Date patterns (first 100): {dict(date_counter)}")

dates2 = re.findall(r"'(\d{1,2}-\d{1,2}-\d{4})'", all_order_data)
if dates2:
    print(f"  Numeric date format found: {dates2[:5]}")

dates3 = re.findall(r"'(\.?\d{1,2}-\w{3}-\d{2})'", all_order_data)
if dates3:
    print(f"  Dot-prefix dates: {dates3[:5]}")

# ============================================================
# 12. PROJECT TABLE
# ============================================================
print("\n" + "="*60)
print("PROJECT TABLE")
print("="*60)

project_inserts = re.findall(r"INSERT INTO `project`[^;]+;", content)
for block in project_inserts:
    print(f"  Raw: {block[:500]}")

print("\n\n" + "="*60)
print("ANALYSIS COMPLETE")
print("="*60)
