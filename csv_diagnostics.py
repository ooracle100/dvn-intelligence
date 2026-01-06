import csv

def diagnose_csv(csv_file_path):
    """
    Diagnose CSV structure to identify column names and data issues
    """
    
    with open(csv_file_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        
        # Get headers
        headers = reader.fieldnames
        
        print("=" * 60)
        print("CSV HEADERS FOUND:")
        print("=" * 60)
        for i, header in enumerate(headers):
            print(f"{i+1}. '{header}' (length: {len(header)} chars)")
        
        print("\n" + "=" * 60)
        print("FIRST ROW DATA SAMPLE:")
        print("=" * 60)
        
        # Read first row
        first_row = next(reader)
        
        for header in headers[:10]:  # Show first 10 columns
            value = first_row.get(header, '')
            print(f"{header}: '{value}'")
        
        print("\n" + "=" * 60)
        print("CHECKING FOR COMMON ISSUES:")
        print("=" * 60)
        
        # Check for BOM or weird characters
        if headers[0].startswith('\ufeff'):
            print("⚠️  WARNING: BOM detected at start of CSV")
        
        # Check for extra spaces
        has_spaces = any(h != h.strip() for h in headers)
        if has_spaces:
            print("⚠️  WARNING: Some headers have leading/trailing spaces")
        
        # Check if addresses exist
        oapp_header = None
        for h in headers:
            if 'oapp' in h.lower() and 'address' in h.lower():
                oapp_header = h
                break
        
        if oapp_header:
            oapp_value = first_row.get(oapp_header, '')
            print(f"✅ OAPP Address found: '{oapp_value}'")
        else:
            print("❌ Could not find 'Oapp address' column")

if __name__ == "__main__":
    csv_file = "base_to_eth_data.csv"
    diagnose_csv(csv_file)