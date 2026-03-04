#!/usr/bin/env python3
"""Extract all worker data and unique worker names from orders."""

import re
from collections import Counter

DUMP_FILE = '/Users/macbook/Documents/sheetbenchmark_transdat_aus-metro.sql'

with open(DUMP_FILE, 'r', errors='replace') as f:
    content = f.read()

# ============================================================
# 1. RAW DRAWER INSERT
# ============================================================
print("="*60)
print("RAW DRAWER INSERT (first 3000 chars)")
print("="*60)
drawer_inserts = re.findall(r"INSERT INTO `drawer`[^;]+;", content)
for block in drawer_inserts:
    print(block[:3000])
    print(f"\n... total length: {len(block)}")

# ============================================================
# 2. RAW CHECKER INSERT
# ============================================================
print("\n" + "="*60)
print("RAW CHECKER INSERT (first 3000 chars)")
print("="*60)
checker_inserts = re.findall(r"INSERT INTO `checker`[^;]+;", content)
for block in checker_inserts:
    print(block[:3000])
    print(f"\n... total length: {len(block)}")

# ============================================================
# 3. RAW AMEND INSERT
# ============================================================
print("\n" + "="*60)
print("RAW AMEND INSERT (first 2000 chars)")
print("="*60)
amend_inserts = re.findall(r"INSERT INTO `amend`[^;]+;", content)
for block in amend_inserts:
    if '`amend_order`' not in block:
        print(block[:2000])
        print(f"\n... total length: {len(block)}")

# ============================================================
# 4. Extract UNIQUE dname and cname from orders
# ============================================================
print("\n" + "="*60)
print("UNIQUE DNAME (drawer names) FROM ORDERS")
print("="*60)

order_inserts = re.findall(r"INSERT INTO `order`[^;]+;", content)

# Combine all order data
all_dnames = []
all_cnames = []
all_qa = []

for block in order_inserts:
    # Each row is like: (id, year, month, date, date_time, order_id, client_name, property, ausDatein, ausFinaldate, code, plan_type, instruction, project_type, dassign_time, dname, cassign_time, cname, drawer_done, d_id, drawer_date, checker_done, checker_date, mistake, cmistake, reason, status, final_upload, qa_person, amend, d_live_qa, c_live_qa, qa_live_qa)
    # dname is field 16 (0-indexed: 15), cname is field 18 (0-indexed: 17), qa_person is field 29 (0-indexed: 28)
    
    # Use a different approach: find VALUES then parse each tuple
    values_part = block.split('VALUES')[1] if 'VALUES' in block else ''
    
    # Extract dname: it's after dassign_time and before cassign_time
    # Pattern: ..., 'dassign_time', 'DNAME', 'cassign_time', 'CNAME', ...
    # dname comes after project_type='Metro', dassign_time=..., then dname
    dnames = re.findall(r"'Metro',\s*'[^']*',\s*'([^']*)',\s*'[^']*',\s*'([^']*)'", values_part)
    for d, c in dnames:
        if d:
            all_dnames.append(d)
        if c:
            all_cnames.append(c)
    
    # qa_person: after final_upload
    qa = re.findall(r"'(yes|)',\s*'([^']*)',\s*(?:NULL|'[^']*'),\s*\d+,\s*\d+,\s*\d+\)", values_part)
    for _, qname in qa:
        if qname:
            all_qa.append(qname)

dname_counter = Counter(all_dnames)
print(f"  Total drawer assignments: {len(all_dnames)}")
print(f"  Unique drawer names: {len(dname_counter)}")
for name, cnt in dname_counter.most_common(50):
    print(f"    '{name}': {cnt} orders")

print("\n" + "="*60)
print("UNIQUE CNAME (checker names) FROM ORDERS")
print("="*60)
cname_counter = Counter(all_cnames)
print(f"  Total checker assignments: {len(all_cnames)}")
print(f"  Unique checker names: {len(cname_counter)}")
for name, cnt in cname_counter.most_common(50):
    print(f"    '{name}': {cnt} orders")

print("\n" + "="*60)
print("UNIQUE QA PERSON FROM ORDERS")
print("="*60)
qa_counter = Counter(all_qa)
print(f"  Total QA assignments: {len(all_qa)}")
print(f"  Unique QA names: {len(qa_counter)}")
for name, cnt in qa_counter.most_common(50):
    print(f"    '{name}': {cnt} orders")

# ============================================================
# 5. Order completion status analysis
# ============================================================
print("\n" + "="*60)
print("ORDER COMPLETION STATUS BREAKDOWN")
print("="*60)

statuses = {"fully_complete": 0, "drawer_done_only": 0, "checker_done_only": 0, "pending": 0, "final_uploaded": 0, "with_status_pending": 0}

for block in order_inserts:
    values_part = block.split('VALUES')[1] if 'VALUES' in block else ''
    # Count order patterns
    # drawer_done='yes' AND checker_done is NOT NULL AND final_upload='yes'
    full = re.findall(r"'yes',\s*\d+,\s*'[^']*',\s*'yes',\s*'[^']*',[^,]*,[^,]*,[^,]*,\s*(?:'pending'|NULL),\s*'yes'", values_part)
    statuses["fully_complete"] += len(full)

# Simple count
for block in order_inserts:
    values_part = block.split('VALUES')[1] if 'VALUES' in block else ''
    statuses["final_uploaded"] += values_part.count("'yes', 'Faheem'") + values_part.count("'yes', 'HAMZA'") + values_part.count("'yes', 'hamza'")

print(f"  Orders with final_upload referencing QA: ~{statuses['final_uploaded']}")

# ============================================================
# 6. Date range analysis
# ============================================================
print("\n" + "="*60)
print("DATE RANGE (from order IDs)")
print("="*60)

all_ids = []
for block in order_inserts:
    ids = re.findall(r'\((\d+),\s*(\d{4}),', block)
    all_ids.extend(ids)

if all_ids:
    id_nums = [int(x[0]) for x in all_ids]
    years = Counter([x[1] for x in all_ids])
    print(f"  ID range: {min(id_nums)} to {max(id_nums)}")
    print(f"  Year distribution: {dict(years)}")
    print(f"  Total orders: {len(all_ids)}")
