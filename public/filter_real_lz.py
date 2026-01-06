#!/usr/bin/env python3
"""
Filter out non-LayerZero transactions (Stargate pools, LI.FI routes)
Keep ONLY transactions with DVN verification
"""

import json

print("🔍 Filtering for Real LayerZero Transactions...\n")

with open("dvn_data_final.json", 'r') as f:
    data = json.load(f)

original_count = len(data['transactions'])
print(f"📊 Original: {original_count} transactions")

# Filter: Must have DVN addresses OR destination tx
real_lz = []
filtered_out = []

for tx in data['transactions']:
    # Parse DVN addresses
    req_dvns = tx.get("required_dvn_addresses", [])
    
    if isinstance(req_dvns, str):
        try:
            req_dvns = json.loads(req_dvns) if req_dvns else []
        except:
            req_dvns = []
    
    # Keep if: Has DVNs OR has destination tx hash
    has_dvns = len(req_dvns) > 0
    has_dest = bool(tx.get("destination_tx_hash"))
    
    if has_dvns or has_dest:
        real_lz.append(tx)
    else:
        filtered_out.append(tx)

print(f"✅ Real LayerZero: {len(real_lz)} transactions")
print(f"❌ Filtered out: {len(filtered_out)} transactions")
print(f"📈 Kept: {(len(real_lz)/original_count*100):.1f}%\n")

# Update metadata
data['transactions'] = real_lz
data['metadata']['total_transactions'] = len(real_lz)
data['metadata']['delivered_transactions'] = sum(
    1 for tx in real_lz if tx.get('delivery_status', '').lower() == 'delivered'
)

# Save
with open("dvn_data_clean.json", 'w') as f:
    json.dump(data, f, indent=2)

print(f"💾 Saved clean dataset: dvn_data_clean.json")
print(f"📊 Delivery rate: {(data['metadata']['delivered_transactions']/len(real_lz)*100):.1f}%")